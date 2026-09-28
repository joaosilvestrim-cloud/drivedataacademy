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

  // Encaixa as posições do 4D (x, y) numa área de 470 x 470 à direita.
  const CAIXA = { x: 690, y: 80, w: 470, h: 470 };
  const xs = acesas.map((c) => c.position[0]);
  const ys = acesas.map((c) => c.position[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const escala = acesas.length > 1 ? Math.min(CAIXA.w / Math.max(maxX - minX, 1), CAIXA.h / Math.max(maxY - minY, 1)) * 0.78 : 1;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const ponto = (p: number[]) => ({ x: CAIXA.x + CAIXA.w / 2 + (p[0] - cx) * escala, y: CAIXA.y + CAIXA.h / 2 - (p[1] - cy) * escala });
  const porId = new Map(acesas.map((c) => [c.id, c]));
  const linhas = Object.keys(universo?.conexoes ?? {})
    .map((k) => k.split("|"))
    .filter(([a, b]) => porId.has(a) && porId.has(b))
    .map(([a, b]) => {
      const p = ponto(porId.get(a)!.position), q = ponto(porId.get(b)!.position);
      const dx = q.x - p.x, dy = q.y - p.y;
      return { x: p.x, y: p.y, len: Math.hypot(dx, dy), ang: (Math.atan2(dy, dx) * 180) / Math.PI, cor: cor(porId.get(a)!.area) };
    });

  const projetos = universo?.projetos ?? 0;

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", position: "relative", background: FUNDO, color: "#fff", fontFamily: "sans-serif" }}>
        {ESTRELAS.map((e, i) => (
          <div key={i} style={{ position: "absolute", left: e.x, top: e.y, width: e.s, height: e.s, borderRadius: 99, background: "#c1d6eb", opacity: e.o }} />
        ))}

        {/* Constelação */}
        {linhas.map((l, i) => (
          <div key={`l${i}`} style={{ position: "absolute", left: l.x, top: l.y, width: l.len, height: 2, background: l.cor, opacity: 0.45, transform: `rotate(${l.ang}deg)`, transformOrigin: "0 0" }} />
        ))}
        {acesas.map((c) => {
          const p = ponto(c.position);
          const provada = (universo?.provas?.[c.id] ?? []).length > 0;
          const r = provada ? 9 + Math.min(4, universo?.provas?.[c.id]?.length ?? 1) * 3 : 6;
          return (
            <div
              key={c.id}
              style={{ position: "absolute", left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: 99, background: cor(c.area), opacity: provada ? 1 : 0.5, boxShadow: `0 0 ${r * 2.2}px ${cor(c.area)}` }}
            />
          );
        })}

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
