"use client";

import { useState, useEffect, useCallback } from "react";

export default function KycPage() {
  const [kycStatus, setKycStatus] = useState<string>("PENDING");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/kyc");
      const data = await res.json();
      if (data.kycStatus) setKycStatus(data.kycStatus);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("document", file);

    try {
      const res = await fetch("/api/settings/kyc", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      setKycStatus("PENDING");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gabim");
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    VERIFIED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "Ne Pritje",
    VERIFIED: "I Verifikuar",
    REJECTED: "I Refuzuar",
  };

  return (
    <div className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Verifikimi i Identitetit (KYC)
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Ngarkoni dokumentin tuaj te identitetit per te aktivizuar nenshkrimin e dokumentave.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Statusi:</span>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[kycStatus] || statusColors.PENDING}`}>
          {statusLabels[kycStatus] || kycStatus}
        </span>
      </div>

      {kycStatus !== "VERIFIED" && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-950 dark:text-green-400">
              {message}
            </div>
          )}

          <div className="rounded-xl border-2 border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="kyc-file"
            />
            <label
              htmlFor="kyc-file"
              className="cursor-pointer text-sm text-zinc-600 dark:text-zinc-400"
            >
              {file ? (
                <span className="font-medium text-zinc-900 dark:text-zinc-100">{file.name}</span>
              ) : (
                <>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    Klikoni per te ngarkuar
                  </span>
                  <br />
                  <span className="text-xs">JPG, PNG, ose PDF (max 10MB)</span>
                </>
              )}
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {loading ? "Duke ngarkuar..." : "Ngarko Dokumentin"}
          </button>
        </form>
      )}

      {kycStatus === "VERIFIED" && (
        <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-950">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Identiteti juaj eshte verifikuar. Mund te nenshkruani dokumente.
          </p>
        </div>
      )}
    </div>
  );
}
