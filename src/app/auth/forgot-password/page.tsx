"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error || "Ndodhi një gabim");
      }
    } catch {
      setError("Ndodhi një gabim. Provoni përsëri.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <nav className="border-b border-border px-4 sm:px-6 py-3 sm:py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/api/logo" unoptimized alt="doc.al" width={44} height={44} className="h-9 w-9 sm:h-11 sm:w-11" />
            <span className="text-2xl sm:text-3xl font-bold text-foreground">doc<span className="text-blue-600">.al</span></span>
          </Link>
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] flex items-center">
            Kthehu të Hyrja
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center px-4 py-6 sm:py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-5 sm:p-8">
            {sent ? (
              <div className="text-center">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                <h1 className="mt-4 text-2xl font-bold text-foreground">Kontrolloni Email-in</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nëse ky email ekziston në sistemin tone, do të merrni një link për të ndryshuar fjalëkalimin.
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  Kontrolloni edhe folderen Spam/Junk.
                </p>
                <Link href="/auth/login">
                  <Button variant="secondary" className="mt-6 w-full gap-2 min-h-[48px]">
                    <ArrowLeft className="h-4 w-4" />
                    Kthehu të Hyrja
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6 sm:mb-8 text-center">
                  <Mail className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-blue-600" />
                  <h1 className="mt-3 text-2xl font-bold text-foreground">Rivendos Fjalëkalimin</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fut email-in tuaj dhe do t&apos;ju dërgojmë një link për të ndryshuar fjalëkalimin.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && <Alert variant="destructive" title={error} />}

                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
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

                  <Button type="submit" disabled={loading} className="w-full min-h-[48px]">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Duke dërguar...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Dërgo Linkun
                      </>
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  <Link href="/auth/login" className="font-medium text-foreground hover:underline">
                    <ArrowLeft className="inline h-3 w-3 mr-1" />
                    Kthehu të Hyrja
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
