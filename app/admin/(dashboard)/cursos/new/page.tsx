import CourseForm from "../CourseForm";

export default function NewCoursePage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Novo curso</h1>
      <p className="mt-1 text-sm text-slate-400">Comece pelos dados. Depois você adiciona módulos e aulas.</p>
      <div className="mt-6">
        <CourseForm />
      </div>
    </div>
  );
}
