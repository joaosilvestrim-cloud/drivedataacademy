"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/LanguageProvider";

export default function AccountNav() {
  const t = useT();
  const [logged, setLogged] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setLogged(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setLogged(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (logged === null) return null; // evita flash antes de saber o estado

  return (
    <Link
      href={logged ? "/conta" : "/entrar"}
      className="hidden whitespace-nowrap rounded-full border border-marca px-4 py-2 text-[15px] font-semibold text-marca transition-colors hover:bg-marca-nevoa sm:inline-block"
    >
      {logged ? t.nav.account : t.nav.login}
    </Link>
  );
}
