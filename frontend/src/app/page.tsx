import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16 sm:px-10">
        <p className="mb-4 text-sm uppercase tracking-[0.25em] text-cyan-300">Claude9</p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
          AI counsellor for student admissions, lead scoring, and guided booking.
        </h1>
        <p className="mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
          Voice-native conversations, sentiment-aware follow-ups, Supabase-backed lead workflows, and
          one-click counselor scheduling in one platform.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Test Google Auth
          </Link>
          <Link
            href="/rag"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Test RAG Query
          </Link>
          <a
            href="http://localhost:8000/health"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-500"
          >
            Check Backend Health
          </a>
        </div>
      </main>
    </div>
  );
}
