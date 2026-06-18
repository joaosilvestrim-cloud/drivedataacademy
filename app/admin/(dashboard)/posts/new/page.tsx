import PostForm from "../PostForm";

export default function NewPostPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Novo post</h1>
      <p className="mt-1 text-sm text-slate-400">Crie um artigo para o blog.</p>
      <div className="mt-6">
        <PostForm />
      </div>
    </div>
  );
}
