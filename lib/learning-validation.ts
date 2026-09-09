export function selectedAnswer(value: unknown): number {
  if(typeof value!=='string'||!/^\d+$/.test(value))return -1;
  const answer=Number(value);return Number.isSafeInteger(answer)&&answer>=0?answer:-1;
}
export function validCompletionPercent(value: unknown): value is number {
  return typeof value==='number'&&Number.isFinite(value)&&value>=90&&value<=100;
}
export function safeCourseSlug(value: unknown): value is string {
  return typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,159}$/.test(value);
}
