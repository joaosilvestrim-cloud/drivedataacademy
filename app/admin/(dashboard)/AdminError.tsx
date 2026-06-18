export default function AdminError({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-5 text-sm text-red-200">
      <p className="font-semibold text-red-300">Não foi possível carregar os dados</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
