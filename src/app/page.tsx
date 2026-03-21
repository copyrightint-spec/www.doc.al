"use client";

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
  FileCheck,
  Award,
  Link2,
  Timer,
  Lock,
  Globe,
  Database,
  Hexagon,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { motion, useInView, useAnimation, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";

/* ─── Data ─── */

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

const stats = [
  { label: "Dokumente te nenshkruara", value: 12847, suffix: "+" },
  { label: "Certifikata aktive", value: 3200, suffix: "+" },
  { label: "Blockchain anchors", value: 8540, suffix: "" },
  { label: "Kohe mesatare", value: 2.4, suffix: "s", decimals: 1 },
];

const securityLayers = [
  { icon: Shield, title: "eIDAS Compliant", description: "Plotesojme rregulloren Europiane per nenshkrime elektronike dhe identifikim dixhital." },
  { icon: Hexagon, title: "Powered by Polygon", description: "Cdo nenshkrim ankorihet ne Polygon PoS blockchain permes STAMLES Merkle batching." },
  { icon: Globe, title: "IPFS Distributed", description: "Hash-et e dokumenteve ruhen ne IPFS. Dokumentet origjinale nuk ruhen kurre ne serverin tone - dergohen me email dhe fshihen menjehere." },
  { icon: Database, title: "doc.al Chain", description: "Zinxhiri yne publik regjistron cdo timestamp me transparence te plote." },
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

/* ─── Helpers ─── */

function useCountUp(end: number, inView: boolean, duration = 2000, decimals = 0) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(parseFloat((eased * end).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, end, duration, decimals]);

  return count;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ─── Animated Section Wrapper ─── */

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Floating Badge ─── */

function FloatingBadge({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 1 + delay }}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200/50 bg-white/80 px-4 py-2 text-xs font-medium text-slate-700 shadow-lg shadow-slate-200/50 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-slate-300 dark:shadow-slate-900/50"
    >
      {children}
    </motion.div>
  );
}

/* ─── Counter Card ─── */

function StatCard({ label, value, suffix, decimals = 0, index }: { label: string; value: number; suffix: string; decimals?: number; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const count = useCountUp(value, inView, 2000, decimals);

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      custom={index}
      className="text-center"
    >
      <div className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
        {count}{suffix}
      </div>
      <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </motion.div>
  );
}

/* ─── Main Page ─── */

export default function LandingPage() {
  const heroWords = ["Nenshkrim", "Elektronik", "&", "Timestamp", "i", "Besueshem"];
  const [user, setUser] = useState<{ name: string; email: string; image?: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-100/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/docal-icon.png" unoptimized alt="doc.al" width={44} height={44} className="h-11 w-11" priority />
            <span className="text-3xl font-bold text-slate-900 dark:text-white">doc<span className="text-blue-600">.al</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/si-funksionon" className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block">Si Funksionon</Link>
            <Link href="/explorer" className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block">Explorer</Link>
            <Link href="/verify" className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block">Verify</Link>
            <Link href="/certificates" className="hidden text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block">Certifikata</Link>
            {user ? (
              <Link href="/dashboard" className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                {user.image ? (
                  <img src={user.image} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-300 sm:block">{user.name}</span>
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hyr</Link>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link href="/auth/register" className="inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-white dark:text-slate-900">Fillo Falas</Link>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen overflow-hidden pt-20">
        {/* Animated gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
            style={{
              backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
          {/* Animated gradient orbs */}
          <motion.div
            animate={{ x: [0, 30, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -right-32 top-1/4 h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-3xl dark:bg-blue-500/10"
          />
          <motion.div
            animate={{ x: [0, -40, 30, 0], y: [0, 20, -30, 0], scale: [1, 0.95, 1.1, 1] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -left-32 top-1/3 h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-3xl dark:bg-cyan-500/10"
          />
        </div>

        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center px-6 py-32 text-center md:py-40">
          {/* Floating badges */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
            <FloatingBadge delay={0}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              eIDAS Compliant
            </FloatingBadge>
            <FloatingBadge delay={0.15}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
              Polygon Anchored
            </FloatingBadge>
            <FloatingBadge delay={0.3}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
              ETSI Standard
            </FloatingBadge>
          </div>

          {/* Heading with staggered word animation */}
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-slate-50 md:text-7xl">
            {heroWords.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className={`mr-3 inline-block ${i === 2 ? "" : ""} ${word === "&" ? "text-blue-600" : ""}`}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {/* Subtitle fade in */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-500 dark:text-slate-400 md:text-xl"
          >
            Platforma e plote per nenshkrime dixhitale, timestamp me server dhe Polygon blockchain,
            verifikim publik, dhe API per integrime. E ndertuar per biznesin shqiptar.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/auth/register"
                className="inline-flex items-center rounded-xl bg-slate-900 px-8 py-4 text-sm font-medium text-white shadow-lg shadow-slate-900/20 transition-shadow hover:shadow-xl hover:shadow-slate-900/30 dark:bg-white dark:text-slate-900 dark:shadow-white/10"
              >
                Filloni Falas
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/explorer"
                className="inline-flex items-center rounded-xl border border-slate-200 px-8 py-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50"
              >
                Shiko Explorer
              </Link>
            </motion.div>
          </motion.div>

          {/* Subtle scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8 }}
            className="mt-20"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="mx-auto h-14 w-8 rounded-full border-2 border-slate-300 p-1.5 dark:border-slate-600"
            >
              <motion.div className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-500" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="relative border-t border-slate-100 py-32 dark:border-slate-800">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950" />
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection className="text-center">
            <motion.span variants={fadeUp} custom={0} className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-blue-600">
              Vecori
            </motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl">
              Gjithcka qe ju duhet per nenshkrime dixhitale
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mx-auto mt-4 max-w-2xl text-slate-500 dark:text-slate-400">
              Nje platforme e vetme per te gjitha nevojat tuaja te nenshkrimit elektronik dhe verifikimit.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group rounded-2xl border border-slate-200/60 bg-white/60 p-6 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-slate-200/50 dark:border-slate-700/60 dark:bg-slate-800/60 dark:hover:shadow-slate-900/50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800">
                  <f.icon className="h-5 w-5 text-slate-700 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 dark:text-slate-200" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-slate-50">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.description}</p>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative py-32">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection className="text-center">
            <motion.span variants={fadeUp} custom={0} className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-blue-600">
              Procesi
            </motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl">
              Si funksionon
            </motion.h2>
          </AnimatedSection>

          <AnimatedSection className="relative mt-20">
            {/* Connection line */}
            <div className="absolute left-1/2 top-8 hidden h-0.5 w-[60%] -translate-x-1/2 md:block">
              <motion.div
                variants={{
                  hidden: { scaleX: 0 },
                  visible: { scaleX: 1, transition: { duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] } },
                }}
                className="h-full origin-left bg-gradient-to-r from-blue-600/20 via-blue-600/40 to-blue-600/20 dark:from-blue-400/20 dark:via-blue-400/40 dark:to-blue-400/20"
              />
            </div>

            <div className="grid gap-12 md:grid-cols-3 md:gap-8">
              {steps.map((s, i) => (
                <motion.div key={s.number} variants={fadeUp} custom={i + 1} className="relative text-center">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="relative mx-auto flex h-16 w-16 items-center justify-center"
                  >
                    {/* Pulse ring */}
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                      className="absolute inset-0 rounded-2xl bg-blue-600/20 dark:bg-blue-400/20"
                    />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-xl font-bold text-white shadow-lg dark:from-white dark:to-slate-200 dark:text-slate-900">
                      {s.number}
                    </div>
                  </motion.div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-slate-50">{s.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{s.description}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="relative border-y border-slate-100 py-24 dark:border-slate-800">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-900/50 dark:via-blue-950/20 dark:to-slate-900/50" />
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection className="grid grid-cols-2 gap-12 md:grid-cols-4">
            {stats.map((s, i) => (
              <StatCard key={s.label} {...s} index={i} />
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Security ─── */}
      <section className="relative py-32">
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection className="text-center">
            <motion.span variants={fadeUp} custom={0} className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-blue-600">
              Siguria
            </motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl">
              Sigurise ne cdo nivel
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mx-auto mt-4 max-w-2xl text-slate-500 dark:text-slate-400">
              Kater shtresa sigurie qe mbrojne cdo nenshkrim tuajin. Dokumentet nuk ruhen kurre - vetem hash-et kriptografike.
            </motion.p>
          </AnimatedSection>

          {/* Shield icon with pulse */}
          <AnimatedSection className="mt-12 flex justify-center">
            <motion.div
              variants={fadeUp}
              custom={0}
              className="relative"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-blue-500/20"
              />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-700 to-cyan-500 shadow-lg shadow-blue-500/20">
                <Lock className="h-8 w-8 text-white" strokeWidth={1.5} />
              </div>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {securityLayers.map((layer, i) => (
              <motion.div
                key={layer.title}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group rounded-2xl border border-slate-200/60 bg-white/60 p-6 text-center backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-blue-100/50 dark:border-slate-700/60 dark:bg-slate-800/60 dark:hover:shadow-blue-900/20"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30">
                  <layer.icon className="h-5 w-5 text-blue-600 transition-transform duration-300 group-hover:scale-110 dark:text-blue-400" strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-slate-50">{layer.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{layer.description}</p>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Privacy Notice ─── */}
      <section className="relative border-t border-slate-100 py-20 dark:border-slate-800">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50/40 to-white dark:from-blue-950/20 dark:to-slate-950" />
        <div className="mx-auto max-w-4xl px-6">
          <AnimatedSection className="text-center">
            <motion.div variants={fadeUp} custom={0} className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40">
              <Shield className="h-7 w-7 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
            </motion.div>
            <motion.h2 variants={fadeUp} custom={1} className="mt-6 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-3xl">
              Privatesia juaj eshte prioriteti yne
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-400">
              Dokumentet tuaja nuk ruhen kurre ne serverin tone. Pas nenshkrimit, PDF-ja dergohet me email dhe fshihet menjehere nga serveri. Ne ruajme vetem hash-in kriptografik (SHA-256) si prove e ekzistences &mdash; pa mundesi te rikthehet dokumenti origjinal nga hash-i.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-8 inline-flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-6 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
              <Lock className="h-4 w-4" strokeWidth={2} />
              Zero-knowledge: serveri nuk ka asnje kopje te dokumentit tuaj
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="relative border-t border-slate-100 py-32 dark:border-slate-800">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950" />
        <div className="mx-auto max-w-6xl px-6">
          <AnimatedSection className="text-center">
            <motion.span variants={fadeUp} custom={0} className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-blue-600">
              Cmimet
            </motion.span>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-4xl">
              Falas per te gjithe
            </motion.h2>
            <motion.p variants={fadeUp} custom={2} className="mx-auto mt-4 max-w-2xl text-slate-500 dark:text-slate-400">
              Nenshkrimi elektronik dhe timestamp eshte falas per cdo individ dhe person fizik. Pa limite, pa karta krediti, pa surpriza.
              Organizatat dhe kompanite perfitojne vecorite shtese me nje plan te personalizuar.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-2">
            {/* Individual */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -40 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="relative rounded-2xl border-2 border-slate-900 bg-white p-8 shadow-xl shadow-slate-200/50 dark:border-slate-100 dark:bg-slate-800 dark:shadow-slate-900/50"
            >
              <motion.span
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="mb-4 inline-block rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white"
              >
                FALAS PERGJITHMONE
              </motion.span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">Individ / Person Fizik</h3>
              <div className="mt-4">
                <span className="text-5xl font-bold text-slate-900 dark:text-slate-50">&euro;0</span>
                <span className="ml-2 text-lg text-slate-400">pergjithmone</span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Gjithcka qe ju duhet per nenshkrime dixhitale dhe timestamp, pa asnje kufizim.
              </p>
              <ul className="mt-8 space-y-3">
                {individualFeatures.map((f, i) => (
                  <motion.li
                    key={f}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0, transition: { delay: 0.3 + i * 0.05 } },
                    }}
                    className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400"
                  >
                    <Check className="h-4 w-4 shrink-0 text-green-500" strokeWidth={2} />
                    {f}
                  </motion.li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-8">
                <Link
                  href="/auth/register"
                  className="block w-full rounded-xl bg-slate-900 py-3.5 text-center text-sm font-medium text-white shadow-lg transition-shadow hover:shadow-xl dark:bg-white dark:text-slate-900"
                >
                  Krijo Llogarine Falas
                </Link>
              </motion.div>
            </motion.div>

            {/* Organization */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: 40 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
              }}
              className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800"
            >
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
                {orgFeatures.map((f, i) => (
                  <motion.li
                    key={f}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: { opacity: 1, x: 0, transition: { delay: 0.3 + i * 0.05 } },
                    }}
                    className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400"
                  >
                    <Check className="h-4 w-4 shrink-0 text-green-500" strokeWidth={2} />
                    {f}
                  </motion.li>
                ))}
              </ul>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-8">
                <Link
                  href="/contact/organization"
                  className="block w-full rounded-xl border border-slate-200 py-3.5 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Kerkoni Oferte
                </Link>
              </motion.div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 py-16 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Image src="/docal-icon.png" unoptimized alt="doc.al" width={44} height={44} className="h-11 w-11" />
                <span className="text-3xl font-bold text-slate-900 dark:text-white">doc<span className="text-blue-600">.al</span></span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Platforma shqiptare per nenshkrime elektronike dhe timestamp te besueshem.
              </p>
            </div>
            <div>
              <h4 className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Produkt</h4>
              <div className="mt-3 space-y-2">
                <Link href="/si-funksionon" className="block text-sm text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-200">Si Funksionon</Link>
                <Link href="/explorer" className="block text-sm text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-200">Explorer</Link>
                <Link href="/verify" className="block text-sm text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-200">Verify</Link>
                <Link href="/certificates" className="block text-sm text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-200">Certifikata</Link>
                <Link href="/auth/register" className="block text-sm text-slate-500 transition-colors hover:text-slate-900 dark:hover:text-slate-200">Regjistrohu</Link>
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
