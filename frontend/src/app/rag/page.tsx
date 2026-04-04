"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type RagContext = {
  id: number;
  category: string | null;
  content: string;
  score: number;
};

type RagResponse = {
  answer: string;
  contexts: RagContext[];
};

export default function RagTestPage() {
  const backendBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000",
    [],
  );
  const [query, setQuery] = useState("What are common UK student visa requirements?");
  const [category, setCategory] = useState("");
  const [topK, setTopK] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RagResponse | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: { query: string; top_k: number; category?: string } = {
        query,
        top_k: topK,
      };
      if (category.trim()) {
        payload.category = category.trim();
      }

      const res = await fetch(`${backendBaseUrl}/api/v1/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "RAG query failed");
      }

      const data = (await res.json()) as RagResponse;
      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100 sm:px-10">
      <main className="mx-auto w-full max-w-4xl">
        <h1 className="text-3xl font-semibold">RAG Tester</h1>
        <p className="mt-2 text-sm text-slate-300">Query route: /api/v1/rag/query</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <label className="block text-sm font-medium text-slate-200" htmlFor="query">
            Query
          </label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200" htmlFor="category">
                Category (optional)
              </label>
              <input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
                placeholder="visa, ielts, costs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200" htmlFor="top-k">
                Top K
              </label>
              <input
                id="top-k"
                type="number"
                min={1}
                max={8}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value || 1))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Running..." : "Run RAG Query"}
          </button>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </form>

        {result ? (
          <section className="mt-8 space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold">Answer</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{result.answer}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold">Retrieved Context</h2>
              <div className="mt-3 space-y-3">
                {result.contexts.map((ctx) => (
                  <article key={ctx.id} className="rounded-lg border border-slate-700 bg-slate-950 p-4">
                    <p className="text-xs text-slate-400">
                      id: {ctx.id} | category: {ctx.category ?? "general"} | score: {ctx.score}
                    </p>
                    <p className="mt-2 text-sm text-slate-200">{ctx.content}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <Link href="/" className="mt-8 inline-block text-sm text-cyan-300 hover:text-cyan-200">
          Back to Home
        </Link>
      </main>
    </div>
  );
}
