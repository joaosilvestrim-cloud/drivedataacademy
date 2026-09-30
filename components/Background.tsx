"use client";

/**
 * Fundo da página: Paper chapado. O tema claro não usa brilho, grade nem
 * gradiente; o ritmo vem da alternância branco, faixa Fog e faixa azul-noite.
 */
export default function Background() {
  return <div className="pointer-events-none fixed inset-0 -z-10 bg-ds-bg" aria-hidden />;
}
