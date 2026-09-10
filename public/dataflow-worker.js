/* Local SQLite worker. Dataset values are always bound parameters. */
importScripts('/vendor/sqljs/sql-wasm.js');
const ready = initSqlJs({locateFile: name => '/vendor/sqljs/' + name});
const quote = name => '"' + name.replace(/"/g, '""') + '"';
self.onmessage = async ({data}) => {
  let db, stmt;
  try {
    const SQL = await ready; db = new SQL.Database();
    for (const [name, table] of Object.entries(data.tables)) {
      db.run(`CREATE TABLE ${quote(name)} (${table.columns.map(quote).join(',')})`);
      const insert = db.prepare(`INSERT INTO ${quote(name)} VALUES (${table.columns.map(() => '?').join(',')})`);
      try { db.run('BEGIN'); table.rows.forEach(row => insert.run(row)); db.run('COMMIT'); } finally { insert.free(); }
    }
    db.run('PRAGMA query_only = ON');
    const query = data.sql.trim().replace(/;\s*$/, '');
    if (query.length > 12000) throw new Error('Limite de 12.000 caracteres na consulta.');
    // Subquery grammar allows SELECT/WITH reads only; no concatenated mutations.
    stmt = db.prepare(`SELECT * FROM (${query}\n) LIMIT 1001`);
    const columns = stmt.getColumnNames(), rows = [];
    while (stmt.step()) rows.push(stmt.get().map(v => v instanceof Uint8Array ? '[binário]' : v));
    const truncated = rows.length > 1000;
    self.postMessage({table:{columns,rows:rows.slice(0,1000)},truncated});
  } catch(e) { self.postMessage({error:e.message || 'Falha na execução SQL.'}); }
  finally { if(stmt)stmt.free();if(db)db.close(); }
};
