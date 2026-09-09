import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { canAccessCourse } from '@/lib/access';
import { safeCourseSlug } from '@/lib/learning-validation';

export async function canCompleteLesson(userId:string,courseId:string,lessonId:string,slug:string) {
  if(!safeCourseSlug(slug)||!courseId||!lessonId)return false;
  const admin=createAdminClient();
  const [{data:course,error:courseError},{data:lesson,error:lessonError}]=await Promise.all([
    admin.from('courses').select('id').eq('id',courseId).eq('slug',slug).maybeSingle(),
    admin.from('lessons').select('id').eq('id',lessonId).eq('course_id',courseId).maybeSingle(),
  ]);
  if(courseError||lessonError||!course||!lesson)return false;
  return canAccessCourse(admin,userId,courseId);
}
