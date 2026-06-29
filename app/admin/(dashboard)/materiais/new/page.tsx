import MaterialForm from "../MaterialForm";

export default function NewMaterialPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white">Novo material</h1>
      <p className="mt-1 text-sm text-slate-400">Crie uma página de captura de leads.</p>
      <div className="mt-6">
        <MaterialForm />
      </div>
    </div>
  );
}
