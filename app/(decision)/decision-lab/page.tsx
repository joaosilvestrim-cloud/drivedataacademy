import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import DecisionLab from '@/components/decision-lab/DecisionLab';
export const dynamic='force-dynamic';
export const metadata={title:'Decision Lab · DriveData Academy',description:'Explore uma empresa virtual, tome decisões e aprenda com suas consequências.'};
export default async function DecisionLabPage(){
  const {data:{user}}=await createClient().auth.getUser();
  if(!user)redirect('/entrar?next=/decision-lab');
  return <DecisionLab key={user.id} userId={user.id}/>;
}
