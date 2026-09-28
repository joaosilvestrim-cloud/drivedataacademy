import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { universoDoPortfolio } from "@/lib/knowledge/publico";

/* Cartão de compartilhamento do portfólio.

   O site termina num post do LinkedIn, e post de link sem imagem quase
   ninguém clica. Cada aluno ganha um cartão próprio: nome, título, quantas
   competências os projetos comprovam e a constelação dele, com as mesmas
   posições e cores do Universo 4D. Quem vê no feed reconhece o desenho
   quando abre o site.

   Tudo sai do que o aluno tem na plataforma. Nenhum número é inventado: são
   contagens dos projetos publicados. */

export const runtime = "nodejs";
export const alt = "Portfólio na DriveData Academy";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://academy.drivedata.com.br").replace(/\/$/, "");
const FUNDO = "#050b18";
const VERDE = "#34e8a0";

// Estrelas de fundo em posições fixas: o mesmo céu em todo cartão.
const ESTRELAS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  return { x: r(i + 1) * 1200, y: r(i + 101) * 630, s: 1 + r(i + 201) * 2, o: 0.15 + r(i + 301) * 0.35 };
});

export default async function Image({ params }: { params: { slug: string } }) {
  const admin = createAdminClient();
  const { data: site } = await admin
    .from("portfolio_sites")
    .select("user_id, publicado, bloqueado, mostrar_universo")
    .eq("slug", params.slug)
    .maybeSingle();

  const publicado = site && site.publicado && !site.bloqueado;
  const [{ data: perfil }, universo] = await Promise.all([
    publicado ? admin.from("profiles").select("full_name, headline, avatar_url").eq("id", site!.user_id).maybeSingle() : Promise.resolve({ data: null }),
    publicado && site!.mostrar_universo ? universoDoPortfolio(admin, site!.user_id) : Promise.resolve(null),
  ]);

  const nome = (perfil?.full_name || "Portfólio").trim();
  const titulo = (perfil?.headline || "").split("|").map((t: string) => t.trim()).filter(Boolean).slice(0, 3).join(" · ");
  const foto = /^https?:\/\//.test(perfil?.avatar_url || "") ? perfil!.avatar_url : null;

  // A constelação do último quadro: onde a carreira está hoje.
  const final = universo?.quadros.at(-1)?.scores ?? {};
  const acesas = (universo?.catalog.competencies ?? []).filter((c) => (final[c.id]?.score ?? 0) > 0);
  const cor = (area: string) => universo?.catalog.areas.find((a) => a.id === area)?.color ?? VERDE;
  const provadas = acesas.filter((c) => (universo?.provas?.[c.id] ?? []).length > 0);
  const principais = [...provadas]
    .sort((a, b) => (universo?.provas?.[b.id]?.length ?? 0) - (universo?.provas?.[a.id]?.length ?? 0))
    .slice(0, 5);

  /* Encaixa as posições do 4D (x, y) numa área à direita. As coordenadas
     são relativas à área, porque a constelação é desenhada num SVG: a
     primeira versão usava caixas rotacionadas para as linhas, e o gerador de
     imagem errava a origem da rotação, deixando linhas soltas pelo cartão. */
  const CAIXA = { x: 700, y: 60, w: 440, h: 500 };
  const xs = acesas.map((c) => c.position[0]);
  const ys = acesas.map((c) => c.position[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const escala = acesas.length > 1 ? Math.min(CAIXA.w / Math.max(maxX - minX, 1), CAIXA.h / Math.max(maxY - minY, 1)) * 0.72 : 1;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const ponto = (p: number[]) => ({ x: CAIXA.w / 2 + (p[0] - cx) * escala, y: CAIXA.h / 2 - (p[1] - cy) * escala });
  const porId = new Map(acesas.map((c) => [c.id, c]));
  // Arcos, como no 4D: o meio da linha sobe um pouco e se afasta do centro.
  const arcos = Object.keys(universo?.conexoes ?? {})
    .map((k) => k.split("|"))
    .filter(([a, b]) => porId.has(a) && porId.has(b))
    .map(([a, b]) => {
      const p = ponto(porId.get(a)!.position), q = ponto(porId.get(b)!.position);
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      const dx = mx - CAIXA.w / 2, dy = my - CAIXA.h / 2, d = Math.hypot(dx, dy) || 1;
      const lift = Math.hypot(q.x - p.x, q.y - p.y) * 0.18;
      return { d: `M ${p.x} ${p.y} Q ${mx + (dx / d) * lift} ${my + (dy / d) * lift - lift * 0.4} ${q.x} ${q.y}`, cor: cor(porId.get(a)!.area) };
    });

  const projetos = universo?.projetos ?? 0;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative", background: FUNDO, color: "#fff", fontFamily: "sans-serif" }}>
        {ESTRELAS.map((e, i) => (
          <div key={i} style={{ position: "absolute", left: e.x, top: e.y, width: e.s, height: e.s, borderRadius: 99, background: "#c1d6eb", opacity: e.o }} />
        ))}

        {/* Constelação */}
        {acesas.length > 0 && (
          <svg width={CAIXA.w} height={CAIXA.h} viewBox={`0 0 ${CAIXA.w} ${CAIXA.h}`} style={{ position: "absolute", left: CAIXA.x, top: CAIXA.y }}>
            {arcos.map((a, i) => (
              <path key={`a${i}`} d={a.d} fill="none" stroke={a.cor} strokeOpacity={0.55} strokeWidth={2} />
            ))}
            {acesas.map((c) => {
              const p = ponto(c.position);
              const n = (universo?.provas?.[c.id] ?? []).length;
              const r = n ? 9 + Math.min(4, n) * 3 : 5;
              return (
                <g key={c.id}>
                  <circle cx={p.x} cy={p.y} r={r * 2.6} fill={cor(c.area)} fillOpacity={n ? 0.1 : 0.04} />
                  <circle cx={p.x} cy={p.y} r={r * 1.6} fill={cor(c.area)} fillOpacity={n ? 0.18 : 0.06} />
                  <circle cx={p.x} cy={p.y} r={r} fill={cor(c.area)} fillOpacity={n ? 1 : 0.45} />
                </g>
              );
            })}
          </svg>
        )}

        {/* Texto */}
        <div style={{ position: "absolute", left: 72, top: 72, width: 600, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            {foto && <img src={foto} width={88} height={88} style={{ borderRadius: 99, border: `3px solid ${VERDE}`, objectFit: "cover" }} />}
            <div style={{ fontSize: nome.length > 24 ? 46 : 56, fontWeight: 700, lineHeight: 1.08, display: "flex", maxWidth: foto ? 490 : 600 }}>{nome}</div>
          </div>
          {titulo && <div style={{ marginTop: 22, fontSize: 25, color: "#b6c4d6", lineHeight: 1.35, display: "flex" }}>{titulo}</div>}
          {provadas.length > 0 && (
            <div style={{ marginTop: 34, fontSize: 30, color: VERDE, fontWeight: 700, display: "flex" }}>
              {`${provadas.length} ${provadas.length === 1 ? "competência comprovada" : "competências comprovadas"} em ${projetos} ${projetos === 1 ? "projeto" : "projetos"}`}
            </div>
          )}
          {principais.length > 0 && (
            <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
              {principais.map((c) => (
                <div key={c.id} style={{ display: "flex", fontSize: 21, padding: "7px 14px", borderRadius: 10, border: `1px solid ${cor(c.area)}`, color: "#e8f0f8" }}>{c.name}</div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: "absolute", left: 72, bottom: 52, display: "flex", alignItems: "center", gap: 16 }}>
          <img src={`${SITE}/logo.png`} width={150} height={39} />
          <div style={{ fontSize: 20, color: "#7f8fa6", display: "flex" }}>{`academy.drivedata.com.br/portfolio/${params.slug}`}</div>
        </div>
      </div>
    ),
    size,
  );
}
