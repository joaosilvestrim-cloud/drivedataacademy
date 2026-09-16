import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasFullAccess } from "@/lib/access";
import { brl } from "@/lib/precoCurso";

export const dynamic = "force-dynamic";

type Curso = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_url: string | null;
  level: string | null;
  coming_soon: boolean | null;
  subscriber_price: number | null;
};

/* Cardápio de treinamentos. O catálogo saiu da página pública e mora aqui:
   o aluno vê o que já é dele e o que pode pedir, com o preço de assinante. */
export default async function CursosCardapio() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const [{ data: cursos }, { data: matriculas }, assinante] = await Promise.all([
    admin
      .from("courses")
      .select("id, slug, title, subtitle, cover_url, level, coming_soon, subscriber_price")
      .eq("published", true)
      .eq("access_mode", "catalogo")
      .order("position"),
    admin.from("enrollments").select("course_id").eq("user_id", user!.id).neq("source", "free"),
    hasFullAccess(admin, user!.id),
  ]);

  const meus = new Set((matriculas ?? []).map((m: any) => m.course_id));
  const todos = (cursos ?? []) as Curso[];
  const seus = todos.filter((c) => meus.has(c.id));
  const cardapio = todos.filter((c) => !meus.has(c.id));

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-wide text-brand-green">Cursos</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">Cardápio de treinamentos</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        {assinante
          ? "Como assinante, você escolhe o treinamento e paga o preço de assinante uma vez só. O curso fica com você."
          : "Os treinamentos são vendidos só para assinantes, com preço especial."}
      </p>

      {!assinante && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-green/25 bg-gradient-to-r from-brand-green/[0.08] to-transparent px-5 py-4">
          <p className="text-sm text-slate-200">Assine para liberar a compra dos treinamentos com preço de assinante.</p>
          <Link href="/matricula" className="rounded-xl bg-gradient-to-r from-brand-green to-brand-blue px-5 py-2.5 text-sm font-semibold text-ink-900">Ver assinatura</Link>
        </div>
      )}

      {seus.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-lg font-bold text-white">Seus treinamentos</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {seus.map((c) => (
              <Cartao key={c.id} c={c} href={`/aprender/${c.slug}`} rodape={<span className="text-sm font-semibold text-brand-green">Continuar →</span>} selo="Seu" />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-lg font-bold text-white">{seus.length > 0 ? "Para pedir agora" : "Escolha seu treinamento"}</h2>
        {cardapio.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-500">
            Você já tem todos os treinamentos disponíveis. Novos chegam em breve.
          </p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cardapio.map((c) => {
              const preco = c.subscriber_price == null ? null : Number(c.subscriber_price);
              const valor =
                preco == null ? (
                  <span className="text-sm text-slate-500">Venda em breve</span>
                ) : preco === 0 ? (
                  <span className="text-sm font-semibold text-brand-green">Incluso na assinatura</span>
                ) : (
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-display text-xl font-bold text-white">{brl(preco)}</span>
                    <span className="text-xs text-slate-500">Pix ou até 12x</span>
                  </span>
                );
              const acao = c.coming_soon ? "Em breve" : preco != null && assinante ? (preco === 0 ? "Liberar" : "Ver e comprar") : "Ver detalhes";
              return (
                <Cartao
                  key={c.id}
                  c={c}
                  href={`/cursos/${c.slug}`}
                  selo={c.coming_soon ? "Em breve" : null}
                  rodape={
                    <>
                      {valor}
                      <span className={`text-sm font-semibold ${c.coming_soon ? "text-amber-300" : "text-brand-teal"}`}>{acao} →</span>
                    </>
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Cartao({ c, href, selo, rodape }: { c: Curso; href: string; selo: string | null; rodape: React.ReactNode }) {
  return (
    <Link href={href} className="card-hover glass group flex flex-col overflow-hidden rounded-3xl border border-white/8">
      {/* Capa menor de propósito: o card é sobre o treinamento, não sobre o banner. */}
      <div className="relative aspect-[16/7] overflow-hidden">
        {c.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-green/20 via-ink-700 to-brand-blue/20" />
        )}
        {selo && (
          <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-[0.7rem] font-semibold backdrop-blur ${selo === "Seu" ? "bg-brand-green/90 text-ink-900" : "bg-amber-400/90 text-ink-900"}`}>
            {selo}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {c.level && <span className="w-fit rounded-full bg-white/5 px-2.5 py-0.5 text-[0.7rem] font-medium text-slate-400">{c.level}</span>}
        <h3 className="mt-2 font-display text-base font-bold leading-snug text-white transition-colors group-hover:text-brand-green">{c.title}</h3>
        {c.subtitle && <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-slate-400">{c.subtitle}</p>}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4">{rodape}</div>
      </div>
    </Link>
  );
}
