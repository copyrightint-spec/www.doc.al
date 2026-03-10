import Link from "next/link";

const features = [
  {
    title: "Nenshkrim Elektronik",
    description: "Nenshkrime dixhitale te avancuara me certifikata X.509, ne perputhje me eIDAS dhe ETSI.",
    icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  },
  {
    title: "Timestamp Server + Bitcoin",
    description: "Dy nivele timestamp: serveri yne (time.copyright.al) dhe ankorim ne Bitcoin blockchain via OpenTimestamps.",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Public Chain Explorer",
    description: "Eksploroni te gjitha timestamps ne kohe reale. Cdo hash, nenshkrim, dhe block eshte publik dhe i verifikueshem.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    title: "API per Integrime",
    description: "REST API e plote per te integruar nenshkrimin elektronik dhe timestamp ne aplikacionin tuaj.",
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  },
  {
    title: "Template Maker",
    description: "Ndertoni forma te personalizuara per nenshkrime elektronike me drag-and-drop builder.",
    icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z",
  },
  {
    title: "Certificate Authority",
    description: "Gjeneroni certifikata dixhitale per organizaten tuaj me chain of trust te plote.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
];

const steps = [
  { number: "01", title: "Ngarkoni", description: "Ngarkoni dokumentin PDF qe deshironi te nenshkruani ose stamponi." },
  { number: "02", title: "Nenshkruani", description: "Verifikimi me 2 hapa (Email + TOTP), nenshkrim dixhital me certifikate." },
  { number: "03", title: "Verifikoni", description: "Timestamp ne chain publik + Bitcoin blockchain. Kushdo mund te verifikoje." },
];

const plans = [
  {
    name: "Free",
    price: "0",
    popular: false,
    features: ["10 dokumente/muaj", "50 timestamps/muaj", "1 certifikate", "Public Explorer", "Email suport"],
  },
  {
    name: "Pro",
    price: "29",
    popular: true,
    features: ["Dokumente te pakufizuara", "1,000 timestamps/muaj", "10 certifikata", "API access", "Template Maker", "Prioritet suport"],
  },
  {
    name: "Enterprise",
    price: "Kontakt",
    popular: false,
    features: ["Gjithcka ne Pro", "Timestamps te pakufizuara", "White-label", "Custom CA", "SLA 99.9%", "Dedicated suport"],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Nav */}
      <nav className="border-b border-zinc-100 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-50">doc.al</span>
          <div className="flex items-center gap-6">
            <Link href="/explorer" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400">Explorer</Link>
            <Link href="/verify" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400">Verify</Link>
            <Link href="/auth/login" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700">Hyr</Link>
            <Link href="/auth/register" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Fillo Falas</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-1.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            eIDAS Compliant | ETSI EN 319 422 | Bitcoin Anchored
          </div>
          <h1 className="text-5xl font-bold leading-tight text-zinc-900 dark:text-zinc-50">
            Nenshkrim Elektronik &<br />Timestamp i Besueshem
          </h1>
          <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
            Platforma e plote per nenshkrime dixhitale, timestamp me server dhe Bitcoin blockchain,
            verifikim publik, dhe API per integrime. E ndertuar per biznesin shqiptar.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="rounded-xl bg-zinc-900 px-8 py-3.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Filloni Falas
            </Link>
            <Link
              href="/explorer"
              className="rounded-xl border border-zinc-300 px-8 py-3.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700"
            >
              Shiko Explorer
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-100 bg-zinc-50 py-24 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            Gjithcka qe ju duhet per nenshkrime dixhitale
          </h2>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
                <svg className="h-10 w-10 text-zinc-900 dark:text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{f.title}</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">Si funksionon</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.number} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-xl font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {s.number}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{s.title}</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-zinc-100 bg-zinc-50 py-24 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">Cmimet</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-8 ${
                  p.popular
                    ? "border-zinc-900 bg-white shadow-lg dark:border-zinc-100 dark:bg-zinc-800"
                    : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                }`}
              >
                {p.popular && (
                  <span className="mb-4 inline-block rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                    Me i Popullarizuar
                  </span>
                )}
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{p.name}</h3>
                <div className="mt-4">
                  {p.price !== "Kontakt" ? (
                    <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">&euro;{p.price}<span className="text-lg font-normal text-zinc-500">/muaj</span></span>
                  ) : (
                    <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Na kontaktoni</span>
                  )}
                </div>
                <ul className="mt-8 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/register"
                  className={`mt-8 block w-full rounded-xl py-3 text-center text-sm font-medium ${
                    p.popular
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {p.price === "Kontakt" ? "Na kontaktoni" : "Fillo tani"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-12 dark:border-zinc-800">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">doc.al</span>
              <p className="mt-2 text-sm text-zinc-500">
                Platforma shqiptare per nenshkrime elektronike dhe timestamp te besueshem.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-zinc-900 dark:text-zinc-50">Produkt</h4>
              <div className="mt-3 space-y-2">
                <Link href="/explorer" className="block text-sm text-zinc-500 hover:text-zinc-900">Explorer</Link>
                <Link href="/verify" className="block text-sm text-zinc-500 hover:text-zinc-900">Verify</Link>
                <Link href="/auth/register" className="block text-sm text-zinc-500 hover:text-zinc-900">Regjistrohu</Link>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-zinc-900 dark:text-zinc-50">Kompania</h4>
              <div className="mt-3 space-y-2">
                <span className="block text-sm text-zinc-500">Rreth nesh</span>
                <span className="block text-sm text-zinc-500">Kontakt</span>
                <span className="block text-sm text-zinc-500">Kushtet e perdorimit</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-zinc-900 dark:text-zinc-50">Standarde</h4>
              <div className="mt-3 space-y-2">
                <span className="block text-sm text-zinc-500">eIDAS Regulation</span>
                <span className="block text-sm text-zinc-500">ETSI EN 319 422</span>
                <span className="block text-sm text-zinc-500">RFC 3161</span>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-zinc-200 pt-8 text-center text-sm text-zinc-400 dark:border-zinc-800">
            &copy; {new Date().getFullYear()} doc.al. Te gjitha te drejtat e rezervuara.
          </div>
        </div>
      </footer>
    </div>
  );
}
