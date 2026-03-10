"use client";

import { useState, useEffect } from "react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  fields: Array<{ type: string; label: string }>;
  isPublic: boolean;
  createdAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    const res = await fetch("/api/templates");
    const data = await res.json();
    if (data.success) setTemplates(data.data);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        fields: [
          { type: "signature", label: "Nenshkrimi", required: true, position: { page: 0, x: 50, y: 50, width: 250, height: 80 } },
          { type: "date", label: "Data", required: true, position: { page: 0, x: 50, y: 140, width: 200, height: 30 } },
        ],
        isPublic: false,
      }),
    });

    if (res.ok) {
      setShowCreate(false);
      setName("");
      setDescription("");
      fetchTemplates();
    }
    setLoading(false);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Template Maker</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          + Krijo Template
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Emri i template"
            required
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Pershkrimi (opsional)"
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
              {loading ? "Duke krijuar..." : "Krijo"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
              Anulo
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <div key={t.id} className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{t.name}</h3>
            {t.description && <p className="mt-1 text-sm text-zinc-500">{t.description}</p>}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-zinc-400">
                {Array.isArray(t.fields) ? t.fields.length : 0} fusha
              </span>
              {t.isPublic && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                  Publik
                </span>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                Perdor
              </button>
              <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                Klono
              </button>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="col-span-full text-center text-zinc-400 py-12">
            Nuk keni template akoma. Krijoni nje te ri!
          </p>
        )}
      </div>
    </div>
  );
}
