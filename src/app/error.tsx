"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">Gabim</h1>
        <p className="mt-4 text-muted-foreground">Ndodhi nje gabim i papritur</p>
        <button onClick={reset} className="mt-6 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700">
          Provo Perseri
        </button>
      </div>
    </div>
  );
}
