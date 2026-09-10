import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import DataFlowLab from '@/components/dataflow/DataFlowLab';
export const dynamic='force-dynamic';
export const metadata={title:'DataFlow Lab · DriveData Academy',description:'Explore transformações de dados, SQL e pipelines em 3D com reprodução temporal.'};
export default async function Page(){const {data:{user}}=await createClient().auth.getUser();if(!user)redirect('/entrar?next=/dataflow-lab');return <DataFlowLab key={user.id} userId={user.id}/>;}
