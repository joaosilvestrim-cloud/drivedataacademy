const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test } = require('node:test');
function load(file, mocks = {}) {
  const filename = path.resolve(file), mod = new Module(filename);
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = id => Object.hasOwn(mocks, id) ? mocks[id] : original(id);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
}
const definitions = load('lib/mascot-poll.ts');
const service = load('lib/mascot-poll-server.ts', { 'server-only': {}, './mascot-poll': definitions });
function fixture(overrides = {}) {
  const poll = { id: 'poll', slug: definitions.MASCOT_POLL_SLUG, title: 'Name', published: true, show_results: true, closes_at: null, ...overrides };
  const options = definitions.MASCOT_NAMES.map((o, index) => ({ ...o, id: 'option-' + index, poll_id: 'poll', position: index }));
  const votes = []; let writes = 0;
  const admin = { from(table) {
    const filters = []; let head = false, payload;
    const builder = {
      select(_fields, config) { head = !!config?.head; return this; },
      eq(key, value) { filters.push(row => row[key] === value); return this; },
      contains(key, values) { filters.push(row => values.every(value => row[key].includes(value))); return this; },
      order() { return this; },
      upsert(value, config) { assert.equal(config.onConflict, 'poll_id,email'); payload = value; return this; },
      async maybeSingle() { const result = await this; return { ...result, data: result.data?.[0] ?? null }; },
      then(resolve, reject) {
        if (payload) { writes++; const existing = votes.find(row => row.poll_id === payload.poll_id && row.email === payload.email); if (existing) Object.assign(existing, payload); else votes.push(payload); }
        const rows = (table === 'polls' ? [poll] : table === 'poll_options' ? options : votes).filter(row => filters.every(filter => filter(row)));
        return Promise.resolve({ data: head ? null : rows, count: head ? rows.length : null, error: null }).then(resolve, reject);
      },
    };
    return builder;
  } };
  return { admin, poll, options, votes, writes: () => writes };
}
test('repeat vote replaces a choice, normalizes verified email, and never adds a second vote', async () => {
  const x = fixture();
  let result = await service.mascotPoll(x.admin, 'Student@Example.test', 'option-0');
  assert.equal(result.total, 1); assert.equal(result.myVote, 'option-0');
  result = await service.mascotPoll(x.admin, 'student@example.test', 'option-4');
  assert.equal(result.total, 1); assert.equal(result.myVote, 'option-4');
  assert.equal(result.options[0].votes, 0); assert.equal(result.options[4].percent, 100);
  assert.equal(x.votes.length, 1); assert.equal(JSON.stringify(result).includes('student@'), false);
});
test('results count all voters beyond 1,000 rows and use total votes as denominator', async () => {
  const x = fixture();
  for (let i = 0; i < 1500; i++) x.votes.push({ poll_id: 'poll', email: `${i}@example.test`, options: [i < 1000 ? 'option-0' : 'option-1'] });
  const result = await service.mascotPoll(x.admin, '0@example.test');
  assert.equal(result.total, 1500); assert.equal(result.options[0].percent, 67); assert.equal(result.options[1].percent, 33);
});
test('unvoted and hidden-result polls disclose no totals', async () => {
  for (const overrides of [{}, { show_results: false }]) {
    const x = fixture(overrides);
    if (!x.poll.show_results) await service.mascotPoll(x.admin, 'a@example.test', 'option-0');
    const result = await service.mascotPoll(x.admin, 'a@example.test');
    assert.equal(result.total, null); assert.equal(result.options[0].votes, null);
  }
});
test('closed, unpublished and foreign choices cannot write', async () => {
  for (const [overrides, option, status] of [[{ closes_at: '2020-01-01' }, 'option-0', 409], [{ published: false }, 'option-0', 409], [{}, 'foreign-option', 400], [{}, {}, 400]]) {
    const x = fixture(overrides);
    await assert.rejects(service.mascotPoll(x.admin, 'a@example.test', option), error => error.status === status);
    assert.equal(x.writes(), 0);
  }
  assert.equal(await service.mascotPoll(fixture({ published: false }).admin, 'a@example.test'), null);
});
function route(user = { email: 'verified@example.test' }) {
  const calls = [];
  const api = load('app/api/mascot/poll/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => ({ body, ...init }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '@/lib/supabase/admin': { createAdminClient: () => ({}) },
    '@/lib/mascot-poll-server': { PollError: service.PollError, mascotPoll: async (_admin, email, option) => { calls.push({ email, option }); return {}; } },
  });
  return { api, calls };
}
const request = (body, origin = 'https://academy.drivedata.com.br') => ({ nextUrl: { origin: 'https://academy.drivedata.com.br' }, headers: new Headers({ origin }), json: async () => body });
test('API rejects unauthenticated, anonymous, cross-origin and malformed requests before touching data', async () => {
  for (const user of [null, { email: 'a@example.test', is_anonymous: true }]) {
    const x = route(user); assert.equal((await x.api.GET(request())).status, 401); assert.equal(x.calls.length, 0);
  }
  const x = route();
  assert.equal((await x.api.POST(request({ optionId: 'x' }, 'https://attacker.test'))).status, 403);
  assert.equal((await x.api.POST(request({ email: 'spoof@example.test' }))).status, 400);
  assert.equal(x.calls.length, 0);
});
test('API ignores forged email and uses the validated session identity', async () => {
  const x = route(); const response = await x.api.POST(request({ optionId: 'option-1', email: 'forged@example.test' }));
  assert.deepEqual(x.calls, [{ email: 'verified@example.test', option: 'option-1' }]);
  assert.equal(response.headers['Cache-Control'], 'private, no-store');
});
test('legacy public form cannot overwrite this authenticated campaign', async () => {
  let writes = 0;
  const api = load('app/votacao/[slug]/actions.ts', {
    'next/navigation': { redirect(url) { throw new Error('REDIRECT ' + url); } },
    '@/lib/supabase/admin': { createAdminClient: () => ({ from: () => { writes++; throw new Error('unexpected write'); } }) },
    '@/lib/votacao': { carregarVotacao: async () => ({ votacao: { slug: definitions.MASCOT_POLL_SLUG }, opcoes: [] }), aberta: () => true },
    '@/lib/mascot-poll': definitions,
  });
  for (const slug of [definitions.MASCOT_POLL_SLUG, '']) {
    const form = new FormData(); form.set('slug', slug);
    await assert.rejects(api.votar(form), /REDIRECT \/conta\?nome-mascote=1/);
  }
  assert.equal(writes, 0);
});
