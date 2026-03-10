"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

interface EntryDetail {
  id: string;
  sequenceNumber: number;
  fingerprint: string;
  sequentialFingerprint: string;
  type: string;
  serverTimestamp: string;
  btcTxId: string | null;
  btcBlockHeight: number | null;
  btcBlockHash: string | null;
  otsStatus: string;
  document: { id: string; title: string; fileName: string } | null;
  signature: { id: string; signerName: string; signerEmail: string; signedAt: string } | null;
  previousEntry: { id: string; sequenceNumber: number; sequentialFingerprint: string } | null;
  nextEntry: { id: string; sequenceNumber: number } | null;
}

export default function EntryDetailPage({
  params,
}: {
  params: Promise<{ sequenceNumber: string }>;
}) {
  const { sequenceNumber } = use(params);
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // First get entries to find ID by sequence number
      const res = await fetch(`/api/explorer?page=1&limit=1&search=`);
      const listData = await res.json();

      // Search by sequence number through the API
      const allRes = await fetch(`/api/explorer?page=1&limit=10000`);
      const allData = await allRes.json();
      const found = allData.data?.entries?.find(
        (e: EntryDetail) => e.sequenceNumber === parseInt(sequenceNumber)
      );

      if (found) {
        const detailRes = await fetch(`/api/timestamp/${found.id}`);
        const detailData = await detailRes.json();
        if (detailData.success) {
          setEntry(detailData.data);
        }
      }
      setLoading(false);
    }
    load();
  }, [sequenceNumber]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Duke ngarkuar...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500">Entry #{sequenceNumber} nuk u gjet</p>
          <Link href="/explorer" className="mt-4 text-blue-600 hover:underline">
            Kthehu ne Explorer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-4xl flex items-center gap-4">
          <Link href="/explorer" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
            &larr; Explorer
          </Link>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Timestamp Entry #{entry.sequenceNumber}
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Main Info */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">Detajet</h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-zinc-500">Sequence Number</dt>
              <dd className="mt-1 font-mono text-lg font-bold text-zinc-900 dark:text-zinc-50">
                #{entry.sequenceNumber}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Server Timestamp (UTC)</dt>
              <dd className="mt-1 text-zinc-900 dark:text-zinc-100">
                {new Date(entry.serverTimestamp).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Type</dt>
              <dd className="mt-1">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  {entry.type}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Fingerprint (SHA-256)</dt>
              <dd className="mt-1 break-all font-mono text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
                {entry.fingerprint}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Sequential Fingerprint (SHA-256)</dt>
              <dd className="mt-1 break-all font-mono text-sm text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
                {entry.sequentialFingerprint}
              </dd>
            </div>
          </dl>
        </div>

        {/* Bitcoin Status */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider">Bitcoin Blockchain</h2>
          {entry.otsStatus === "CONFIRMED" ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <span className="h-3 w-3 rounded-full bg-green-500" />
                <span className="font-medium">Konfirmuar ne Bitcoin Blockchain</span>
              </div>
              {entry.btcBlockHeight && (
                <div>
                  <span className="text-xs text-zinc-500">BTC Block:</span>
                  <span className="ml-2 font-mono text-sm">#{entry.btcBlockHeight}</span>
                </div>
              )}
              {entry.btcTxId && (
                <div>
                  <span className="text-xs text-zinc-500">Transaction ID:</span>
                  <code className="ml-2 break-all font-mono text-xs">{entry.btcTxId}</code>
                </div>
              )}
              {entry.btcBlockHash && (
                <div>
                  <span className="text-xs text-zinc-500">Block Hash:</span>
                  <code className="ml-2 break-all font-mono text-xs">{entry.btcBlockHash}</code>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <span className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
              <span>Ne pritje te konfirmimit ne Bitcoin blockchain...</span>
            </div>
          )}
        </div>

        {/* Chain Navigation */}
        <div className="flex items-center justify-between">
          {entry.previousEntry ? (
            <Link
              href={`/explorer/${entry.previousEntry.sequenceNumber}`}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              &larr; #{entry.previousEntry.sequenceNumber}
            </Link>
          ) : (
            <span className="text-sm text-zinc-400">Genesis Entry</span>
          )}
          {entry.nextEntry && (
            <Link
              href={`/explorer/${entry.nextEntry.sequenceNumber}`}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              #{entry.nextEntry.sequenceNumber} &rarr;
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
