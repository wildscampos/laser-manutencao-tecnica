import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#111111] px-5 text-slate-100">
      <div className="max-w-xl border border-slate-800 bg-slate-950/80 p-8">
        <p className="font-mono text-sm text-[#00A8FF]">404</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">Pagina nao encontrada</h1>
        <p className="mt-4 leading-7 text-slate-300">
          O endereço acessado não existe. Volte para o site e agende seu atendimento técnico.
        </p>
        <Link className="button-primary mt-6" href="/">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
