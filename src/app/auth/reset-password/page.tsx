"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;
    if (!passwordRegex.test(password)) {
      setError("Fjalëkalimi duhet të këtë min. 10 karaktere, shkronja të medha/vogla, numra dhe simbole");
      return;
    }
    if (password !== confirmPassword) {
      setError("Fjalëkalimiet nuk përputhen");
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
        setError(data.error || "Ndodhi një gabim");
      }
    } catch {
      setError("Ndodhi një gabim");
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
              Ky link për rivendosjen e fjalëkalimit është i pavlefshem ose ka skaduar.
            </p>
            <Link href="/auth/forgot-password">
              <Button className="mt-4 min-h-[48px]">Kërkoni link të ri</Button>
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
                <h1 className="mt-4 text-2xl font-bold text-foreground">Fjalëkalimi u Ndryshua</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Fjalëkalimi juaj u ndryshua me sukses. Tani mund të hyni me fjalëkalimin e ri.
                </p>
                <Link href="/auth/login">
                  <Button className="mt-6 w-full min-h-[48px]">Hyr në Llogari</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 sm:mb-8 text-center">
                  <Lock className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
                  <h1 className="mt-3 text-2xl font-bold text-foreground">Fjalëkalim i Ri</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Vendosni fjalëkalimin tuaj të ri.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && <Alert variant="destructive" title={error} />}

                  <div>
                    <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
                      Fjalëkalimi i Ri
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={10}
                        placeholder="Min. 10 karaktere (A-z, 0-9, !@#)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-foreground">
                      Konfirmoni Fjalëkalimin
                    </label>
                    <div className="relative">
                      <Input
                        id="confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Rishkruani fjalëkalimin"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full min-h-[48px]">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Duke ndryshuar...
                      </>
                    ) : (
                      "Ndrysho Fjalëkalimin"
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
