"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LogIn, Loader2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/spinner";
import { TurnstileCaptcha } from "@/components/ui/turnstile";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      captchaToken,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ose fjalëkalimi i gabuar");
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal nav */}
      <nav className="border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/api/logo" unoptimized alt="doc.al" width={44} height={44} className="h-9 w-9 sm:h-11 sm:w-11" />
            <span className="text-2xl sm:text-3xl font-bold text-foreground">doc<span className="text-blue-600">.al</span></span>
          </Link>
          <Link
            href="/auth/register"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center"
          >
            Regjistrohuni
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-5 sm:p-8">
            <div className="mb-6 sm:mb-8 text-center">
              <Image src="/api/logo" unoptimized alt="doc.al" width={80} height={80} className="mx-auto h-16 w-16 sm:h-20 sm:w-20" />
              <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground">doc<span className="text-blue-600">.al</span></h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Nënshkrim Elektronik & Timestamp
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" title={error} />
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@shembull.com"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-foreground"
                  >
                    Fjalëkalimi
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Keni harruar fjalëkalimin?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="********"
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

              <TurnstileCaptcha
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken("")}
                className="flex justify-center"
              />

              <Button type="submit" disabled={loading} className="w-full min-h-[48px]">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Duke hyre...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Hyr
                  </>
                )}
              </Button>
            </form>

            <div className="my-5 sm:my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">ose</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="secondary"
              className="w-full min-h-[48px]"
              onClick={() => signIn("google", { callbackUrl })}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Vazhdo me Google
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Nuk keni llogari?{" "}
              <Link
                href="/auth/register"
                className="font-medium text-foreground hover:underline"
              >
                Regjistrohuni
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <PageSpinner />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
