import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import UniverseExperience from '@/components/knowledge/UniverseExperience';
import Link from 'next/link';
import { knowledgeAccess, loadUniverse, KnowledgeSetupError } from '@/lib/knowledge/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Knowledge Universe 4D · DriveData Academy' };
export default async function UniversePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/entrar?next=/universo');
  try {
    if(!await knowledgeAccess(user.id,user.email)) return <main className="mx-auto max-w-xl px-6 py-24"><h1 className="text-3xl font-semibold">Knowledge Universe 4D</h1><p className="mt-5 leading-relaxed text-slate-300">O Universo está incluído na assinatura ativa da Academy. A equipe também pode liberar acesso individual.</p><Link href="/matricula" className="mt-6 inline-block rounded-lg bg-teal-200 px-5 py-3 font-semibold text-slate-950">Conhecer a assinatura</Link><Link href="/universo/demo" className="mt-4 block text-teal-200">Explorar a demonstração →</Link><Link href="/conta" className="mt-5 block text-sm text-slate-400">Voltar ao portal</Link></main>;
    const data=await loadUniverse(user.id);
    return <UniverseExperience data={data} />;
  } catch(error) {
    const setup=error instanceof KnowledgeSetupError;
    return <main className="mx-auto max-w-xl px-6 py-24"><p className="text-xs uppercase tracking-widest text-teal-200">Knowledge Universe 4D</p><h1 className="mt-3 text-3xl font-semibold">{setup?'Seu universo está sendo preparado':'Não foi possível carregar seu universo'}</h1><p className="mt-5 leading-relaxed text-slate-400">{setup?'A equipe precisa concluir a instalação da estrutura de conhecimento no banco. Seu histórico acadêmico continua preservado.':'Tente atualizar a página em instantes. Se o problema continuar, entre em contato com o suporte.'}</p><Link href="/universo/demo" className="mt-6 inline-block text-teal-200">Explorar a demonstração →</Link><Link href="/conta" className="mt-4 block text-sm text-slate-400">Voltar ao portal</Link></main>;
  }
}
