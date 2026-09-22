import { criarDemonstracao, encerrarDemonstracao } from "./actions";

const field =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand-green/60";

export type Demo = { user_id: string; email: string; nome: string; expires_at: string; ativo: boolean };

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

/* Login temporário de demonstração: a pessoa vê a área do assinante inteira,
   sem poder clicar em nada, e usa só o DriveCanvas. */
export default function DemoForm({ demos }: { demos: Demo[] }) {
  return (
    <div className="glass rounded-2xl border border-amber-300/20 p-5">
      <p className="text-sm font-semibold text-white">Acesso de demonstração (DriveCanvas)</p>
      <p className="mt-1 text-xs text-slate-400">
        Login temporário: a pessoa vê a área completa do assinante, mas nada pode ser clicado. Só o DriveCanvas funciona. Se ela não tiver conta,
        a conta é criada e ela recebe um e-mail com o código para criar a senha. Quando o prazo acaba, a conta vira uma conta comum, sem acesso.
      </p>
      <form action={criarDemonstracao} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_170px_auto]">
        <input name="email" type="email" required placeholder="email@pessoa.com" className={field} />
        <input name="name" placeholder="Nome (opcional)" className={field} />
        {/* 7 dias e o padrao combinado do produto: e o prazo que da para a
            pessoa montar um visual de verdade no DriveCanvas e voltar mais de
            uma vez. Os outros ficam na lista para o caso pontual. */}
        <select name="horas" defaultValue="168" className={`${field} [&>option]:bg-ink-900`}>
          <option value="24">1 dia</option>
          <option value="72">3 dias</option>
          <option value="168">7 dias (padrão)</option>
          <option value="336">14 dias</option>
        </select>
        <button className="rounded-xl bg-gradient-to-r from-amber-300 to-brand-green px-5 py-3 text-sm font-semibold text-ink-900 transition-transform hover:scale-[1.02]">
          Liberar demonstração
        </button>
      </form>

      {demos.length > 0 && (
        <ul className="mt-5 divide-y divide-white/5 rounded-xl border border-white/8">
          {demos.map((d) => (
            <li key={d.user_id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-white">
                {d.nome ? `${d.nome} · ` : ""}
                <span className="text-slate-400">{d.email}</span>
              </span>
              <span className={`text-xs ${d.ativo ? "text-amber-300" : "text-slate-500"}`}>
                {d.ativo ? `até ${quando(d.expires_at)}` : `encerrada em ${quando(d.expires_at)}`}
              </span>
              {d.ativo && (
                <form action={encerrarDemonstracao}>
                  <input type="hidden" name="user_id" value={d.user_id} />
                  <button className="text-xs text-red-300 hover:underline">Encerrar agora</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
