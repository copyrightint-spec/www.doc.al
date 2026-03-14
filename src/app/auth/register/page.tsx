"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { UserPlus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { TurnstileCaptcha } from "@/components/ui/turnstile";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captchaToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push("/auth/login?registered=true");
    } catch {
      setError("Ndodhi nje gabim. Provoni perseri.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal nav */}
      <nav className="border-b border-border px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/docal-icon.png" unoptimized alt="doc.al" width={44} height={44} className="h-11 w-11" />
            <span className="text-3xl font-bold text-foreground">doc<span className="text-blue-600">.al</span></span>
          </Link>
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Hyr
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="mb-8 text-center">
              <Image src="/docal-icon.png" unoptimized alt="doc.al" width={80} height={80} className="mx-auto h-20 w-20" />
              <h1 className="mt-3 text-3xl font-bold text-foreground">
                doc<span className="text-blue-600">.al</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Filloni te perdorni doc.al per nenshkrime elektronike
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" title={error} />
              )}

              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Emri i plote
                </label>
                <Input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Emri Mbiemri"
                />
              </div>

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
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="email@shembull.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Fjalekalimi
                </label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  minLength={8}
                  placeholder="Min. 8 karaktere"
                />
              </div>

              <div>
                <label
                  htmlFor="org"
                  className="mb-1 block text-sm font-medium text-foreground"
                >
                  Organizata{" "}
                  <span className="text-muted-foreground">(opsionale)</span>
                </label>
                <Input
                  id="org"
                  type="text"
                  value={form.organizationName}
                  onChange={(e) =>
                    setForm({ ...form, organizationName: e.target.value })
                  }
                  placeholder="Emri i kompanise"
                />
              </div>

              <TurnstileCaptcha
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken("")}
                className="flex justify-center"
              />

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Duke regjistruar...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Regjistrohu
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Keni llogari?{" "}
              <Link
                href="/auth/login"
                className="font-medium text-foreground hover:underline"
              >
                Hyr
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
