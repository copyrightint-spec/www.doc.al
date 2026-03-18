import Link from "next/link";
import Image from "next/image";
import {
  PenTool,
  Clock,
  Zap,
  Code2,
  LayoutTemplate,
  Shield,
  Check,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

const features: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "Nenshkrim Elektronik",
    description: "Nenshkrime dixhitale te avancuara me certifikata X.509, ne perputhje me eIDAS dhe ETSI.",
    icon: PenTool,
  },
  {
    title: "Timestamp Server + Polygon",
    description: "Dy nivele timestamp: serveri yne (doc.al chain) dhe ankorim ne Polygon blockchain via STAMLES Merkle batching.",
    icon: Clock,
  },
  {
    title: "Public Chain Explorer",
    description: "Eksploroni te gjitha timestamps ne kohe reale. Cdo hash, nenshkrim, dhe block eshte publik dhe i verifikueshem.",
    icon: Zap,
  },
  {
    title: "API per Integrime",
    description: "REST API e plote per te integruar nenshkrimin elektronik dhe timestamp ne aplikacionin tuaj.",
    icon: Code2,
  },
  {
    title: "Template Maker",
    description: "Ndertoni forma te personalizuara per nenshkrime elektronike me drag-and-drop builder.",
    icon: LayoutTemplate,
  },
  {
    title: "Certificate Authority",
    description: "Gjeneroni certifikata dixhitale per organizaten tuaj me chain of trust te plote.",
    icon: Shield,
  },
];

const steps = [
  { number: "01", title: "Ngarkoni", description: "Ngarkoni dokumentin PDF qe deshironi te nenshkruani ose stamponi." },
  { number: "02", title: "Nenshkruani", description: "Verifikimi me 2 hapa (Email + TOTP), nenshkrim dixhital me certifikate." },
  { number: "03", title: "Verifikoni", description: "Timestamp ne chain publik + Polygon blockchain. Kushdo mund te verifikoje." },
];

const individualFeatures = [
  "Dokumente te pakufizuara",
  "Timestamps te pakufizuara",
  "Nenshkrime dixhitale me certifikate X.509",
  "Polygon blockchain anchoring (STAMLES)",
  "Public Explorer & verifikim",
  "API access",
  "Template Maker",
  "Certifikata personale",
  "2FA (Email + Google Authenticator)",
  "Email suport",
];

const orgFeatures = [
  "Gjithcka qe perfshihet per individe",
  "Certifikata organizative (CA)",
  "Menaxhim ekipi & role",
  "White-label & custom branding",
  "API me kuota te larta",
  "Dedicated account manager",
  "SLA e garantuar",
  "Integrime te personalizuara",
  "Fakturim & kontrate",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Nav */}
      <nav className="border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/docal-icon.png" unoptimized alt="doc.al" width={44} height={44} className="h-11 w-11" priority />
            <span className="text-3xl font-bold text-slate-900 dark:text-white">doc<span className="text-blue-600">.al</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/si-funksionon" className="hidden text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 sm:block">Si Funksionon</Link>
            <Link href="/explorer" className="hidden text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 sm:block">Explorer</Link>
            <Link href="/verify" className="hidden text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 sm:block">Verify</Link>
            <Link href="/auth/login" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">Hyr</Link>
            <Link href="/auth/register" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-slate-100 dark:text-slate-900">Fillo Falas</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            eIDAS Compliant | ETSI EN 319 422 | Polygon Anchored
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50">
            Nenshkrim Elektronik &<br />Timestamp i Besueshem
          </h1>
          <p className="mt-6 text-lg text-slate-500 dark:text-slate-400">
            Platforma e plote per nenshkrime dixhitale, timestamp me server dhe Polygon blockchain,
            verifikim publik, dhe API per integrime. E ndertuar per biznesin shqiptar.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-medium text-white hover:opacity-90 dark:bg-slate-100 dark:text-slate-900"
            >
              Filloni Falas
            </Link>
            <Link
              href="/explorer"
              className="rounded-xl border border-slate-200 px-8 py-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              Shiko Explorer
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-slate-50 py-24 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Gjithcka qe ju duhet per nenshkrime dixhitale
          </h2>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
                  <f.icon className="h-5 w-5 text-slate-900 dark:text-slate-100" strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Si funksionon</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.number} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  {s.number}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-50">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-slate-100 bg-slate-50 py-24 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Falas per te gjithe
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-slate-500 dark:text-slate-400">
            Nenshkrimi elektronik dhe timestamp eshte falas per cdo individ dhe person fizik. Pa limite, pa karta krediti, pa surpriza.
            Organizatat dhe kompanite perfitojne vecorite shtese me nje plan te personalizuar.
          </p>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-2">
            {/* Individual */}
            <div className="rounded-2xl border-2 border-slate-900 bg-white p-8 shadow-lg dark:border-slate-100 dark:bg-slate-800">
              <span className="mb-4 inline-block rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
                FALAS PERGJITHMONE
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Individ / Person Fizik</h3>
              <div className="mt-4">
                <span className="text-5xl font-bold text-slate-900 dark:text-slate-50">&euro;0</span>
                <span className="ml-2 text-lg text-slate-400">pergjithmone</span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Gjithcka qe ju duhet per nenshkrime dixhitale dhe timestamp, pa asnje kufizim.
              </p>
              <ul className="mt-8 space-y-3">
                {individualFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                    <Check className="h-4 w-4 shrink-0 text-green-500" strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/register"
                className="mt-8 block w-full rounded-xl bg-slate-900 py-3.5 text-center text-sm font-medium text-white hover:opacity-90 dark:bg-slate-100 dark:text-slate-900"
              >
                Krijo Llogarine Falas
              </Link>
            </div>

            {/* Organization */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
              <span className="mb-4 inline-block rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-white dark:bg-slate-600">
                PER ORGANIZATA
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Kompani / Organizate</h3>
              <div className="mt-4">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">Cmim i personalizuar</span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Plotesoni formen dhe do ju kontaktojme brenda 24 oreve me nje oferte te personalizuar sipas nevojes suaj.
              </p>
              <ul className="mt-8 space-y-3">
                {orgFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                    <Check className="h-4 w-4 shrink-0 text-green-500" strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact/organization"
                className="mt-8 block w-full rounded-xl border border-slate-200 py-3.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Kerkoni Oferte
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Image src="/docal-icon.png" unoptimized alt="doc.al" width={44} height={44} className="h-11 w-11" />
                <span className="text-3xl font-bold text-slate-900 dark:text-white">doc<span className="text-blue-600">.al</span></span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Platforma shqiptare per nenshkrime elektronike dhe timestamp te besueshem.
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Produkt</h4>
              <div className="mt-3 space-y-2">
                <Link href="/si-funksionon" className="block text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200">Si Funksionon</Link>
                <Link href="/explorer" className="block text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200">Explorer</Link>
                <Link href="/verify" className="block text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200">Verify</Link>
                <Link href="/auth/register" className="block text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-200">Regjistrohu</Link>
              </div>
            </div>
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Kompania</h4>
              <div className="mt-3 space-y-2">
                <span className="block text-sm text-slate-500">Rreth nesh</span>
                <span className="block text-sm text-slate-500">Kontakt</span>
                <span className="block text-sm text-slate-500">Kushtet e perdorimit</span>
              </div>
            </div>
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Standarde</h4>
              <div className="mt-3 space-y-2">
                <span className="block text-sm text-slate-500">eIDAS Regulation</span>
                <span className="block text-sm text-slate-500">ETSI EN 319 422</span>
                <span className="block text-sm text-slate-500">RFC 3161</span>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-200 pt-8 text-center text-sm text-slate-400 dark:border-slate-800">
            &copy; {new Date().getFullYear()} doc.al. Te gjitha te drejtat e rezervuara.
          </div>
        </div>
      </footer>
    </div>
  );
}
