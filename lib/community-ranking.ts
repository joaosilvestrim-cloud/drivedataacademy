import 'server-only';
import {unstable_cache} from 'next/cache';
import {createAdminClient} from './supabase/admin';
import {pointsByUser} from './community';
import {rankUsers} from './ranking';

// Shared short-lived snapshot keeps positions (including existing ties)
// consistent across readers and avoids an aggregate query per chat message.
// Call only after verifying the caller route access (community or own profile).
export const loadCommunityRanking = unstable_cache(async()=>{
  return rankUsers(await pointsByUser(createAdminClient()));
},['community-ranking-medals-v1'],{revalidate:15});
