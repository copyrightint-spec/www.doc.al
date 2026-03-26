"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/spinner";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;
    if (!passwordRegex.test(password)) {
      setError("Fjalekalimi duhet te kete min. 10 karaktere, shkronja te medha/vogla, numra dhe simbole");
      return;
    }
    if (password !== confirmPassword) {
      setError("Fjalekalimiet nuk perputhen");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
      } else {
        setError(data.error || "Ndodhi nje gabim");
      }
    } catch {
      setError("Ndodhi nje gabim");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md">
          <CardContent className="p-5 sm:p-8 text-center">
            <h1 className="text-xl font-bold text-foreground">Link i Pavlefshem</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ky link per rivendosjen e fjalekalimit eshte i pavlefshem ose ka skaduar.
            </p>
            <Link href="/auth/forgot-password">
              <Button className="mt-4 min-h-[48px]">Kerkoni link te ri</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/api/logo" unoptimized alt="doc.al" width={44} height={44} className="h-9 w-9 sm:h-11 sm:w-11" />
            <span className="text-2xl sm:text-3xl font-bold text-foreground">doc<span className="text-blue-600">.al</span></span>
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-5 sm:p-8">
            {done ? (
              <div className="text-center">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                <h1 className="mt-4 text-2xl font-bold text-foreground">Fjalekalimi u Ndryshua</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fjalekalimi juaj u ndryshua me sukses. Tani mund te hyni me fjalekalimin e ri.
                </p>
                <Link href="/auth/login">
                  <Button className="mt-6 w-full min-h-[48px]">Hyr ne Llogari</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 sm:mb-8 text-center">
                  <Lock className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
                  <h1 className="mt-3 text-2xl font-bold text-foreground">Fjalekalim i Ri</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Vendosni fjalekalimin tuaj te ri.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && <Alert variant="destructive" title={error} />}

                  <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
                      Fjalekalimi i Ri
                    </label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={10}
                      placeholder="Min. 10 karaktere (A-z, 0-9, !@#)"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-foreground">
                      Konfirmoni Fjalekalimin
                    </label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Rishkruani fjalekalimin"
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="w-full min-h-[48px]">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Duke ndryshuar...
                      </>
                    ) : (
                      "Ndrysho Fjalekalimin"
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background"><PageSpinner /></div>}>
      <ResetForm />
    </Suspense>
  );
}
