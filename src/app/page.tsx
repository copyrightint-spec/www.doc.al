"use client";

import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";
import {
  PenTool,
  Clock,
  Zap,
  Code2,
  LayoutTemplate,
  Shield,
  Check,
  Lock,
  Globe,
  Database,
  Hexagon,
  ArrowRight,
  Fingerprint,
  FileCheck,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";

/* ─── Data ─── */

const features: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "Nënshkrim Elektronik",
    description:
      "Nënshkrime digjitale të avancuara me certifikata X.509, në përputhje me eIDAS dhe ETSI.",
    icon: PenTool,
  },
  {
    title: "Timestamp Server + Polygon",
    description:
      "Dy nivele timestamp: serveri yne (doc.al chain) dhe ankorim në Polygon blockchain via STAMLES Merkle batching.",
    icon: Clock,
  },
  {
    title: "Public Chain Explorer",
    description:
      "Eksploroni të gjitha timestamps në kohe reale. Çdo hash, nënshkrim, dhe block është publik dhe i verifikueshem.",
    icon: Zap,
  },
  {
    title: "API për Integrime",
    description:
      "REST API e plotë për të integruar nënshkrimin elektronik dhe timestamp në aplikacionin tuaj.",
    icon: Code2,
  },
  {
    title: "Template Maker",
    description:
      "Ndertoni forma të personalizuara për nënshkrime elektronike me drag-and-drop builder.",
    icon: LayoutTemplate,
  },
  {
    title: "Certificate Authority",
    description:
      "Gjeneroni certifikata digjitale për organizaten tuaj me chain of trust të plote.",
    icon: Shield,
  },
];

const steps = [
  {
    number: "01",
    title: "Ngarkoni",
    description:
      "Ngarkoni dokumentin PDF që deshironi të nënshkruani ose stamponi.",
  },
  {
    number: "02",
    title: "Nënshkruani",
    description:
      "Verifikimi me 2 hapa (Email + TOTP), nënshkrim digjital me çertifikatë.",
  },
  {
    number: "03",
    title: "Verifikoni",
    description:
      "Timestamp në chain publik + Polygon blockchain. Kushdo mund të verifikoje.",
  },
];

const stats = [
  { label: "Dokumente të nënshkruara", value: 12847, suffix: "+" },
  { label: "Certifikata aktive", value: 3200, suffix: "+" },
  { label: "Blockchain anchors", value: 8540, suffix: "" },
  { label: "Kohe mesatare", value: 2.4, suffix: "s", decimals: 1 },
];

const securityLayers = [
  {
    icon: Shield,
    title: "eIDAS Compliant",
    description:
      "Plotësojmë rregulloren Europiane për nënshkrime elektronike dhe identifikim digjital.",
  },
  {
    icon: Hexagon,
    title: "Powered by Polygon",
    description:
      "Çdo nënshkrim ankorihet në Polygon PoS blockchain përmes STAMLES Merkle batching.",
  },
  {
    icon: Globe,
    title: "IPFS Distributed",
    description:
      "Provat kriptografike ruhen në IPFS. Dokumentet NUK ruhen në serverin tone - vetem hash-i SHA-256. Pas nënshkrimit, PDF dergohet me email dhe fshihet menjehere nga serveri.",
  },
  {
    icon: Database,
    title: "doc.al Chain",
    description:
      "Zinxhiri yne publik regjistron çdo timestamp me transparence të plote.",
  },
];

const trustBadges = [
  { label: "eIDAS", sublabel: "EU Regulation", icon: Shield },
  { label: "Polygon", sublabel: "PoS Blockchain", icon: Hexagon },
  { label: "IPFS", sublabel: "Distributed Storage", icon: Globe },
  { label: "doc.al Chain", sublabel: "Public Ledger", icon: Database },
];

const individualFeatures = [
  "Dokumente të pakufizuara",
  "Timestamps të pakufizuara",
  "Nënshkrime digjitale me certifikate X.509",
  "Polygon blockchain anchoring (STAMLES)",
  "Public Explorer & verifikim",
  "API access",
  "Template Maker",
  "Certifikata personale",
  "2FA (Email + Google Authenticator)",
  "Email suport",
];

const orgFeatures = [
  "Gjithçka që përfshihet për individe",
  "Certifikata organizative (CA)",
  "Menaxhim ekipi & role",
  "White-label & custom branding",
  "API me kuota të larta",
  "Dedicated account manager",
  "SLA e garantuar",
  "Integrime të personalizuara",
  "Fakturim & kontrate",
];

/* ─── Helpers ─── */

function useCountUp(
  end: number,
  inView: boolean,
  duration = 2000,
  decimals = 0
) {
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

function useMouseParallax() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      x.set((e.clientX - centerX) / centerX);
      y.set((e.clientY - centerY) / centerY);
    },
    [x, y]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return { x, y };
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.1,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      delay: i * 0.1,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

/* ─── Particle Dot Grid ─── */

function ParticleGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let cols: number, rows: number;
    const spacing = 50;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      cols = Math.ceil(canvas.offsetWidth / spacing) + 1;
      rows = Math.ceil(canvas.offsetHeight / spacing) + 1;
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener("mousemove", handleMouse);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;
          const dist = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
          const maxDist = 150;
          const influence = Math.max(0, 1 - dist / maxDist);

          const baseSize = 1.2;
          const size = prefersReducedMotion
            ? baseSize
            : baseSize + influence * 2.5;
          const alpha = 0.08 + influence * 0.35;

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouse);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-auto absolute inset-0 h-full w-full"
      style={{ willChange: "transform" }}
    />
  );
}

/* ─── Animated Section Wrapper ─── */

function AnimatedSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

function FloatingBadge({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 1 + delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.05, y: -2 }}
      className="inline-flex items-center gap-2 rounded-full border border-blue-200/30 bg-blue-950/40 px-4 py-2 text-xs font-medium text-blue-200 shadow-lg shadow-blue-900/20 backdrop-blur-md"
    >
      {children}
    </motion.div>
  );
}

/* ─── 3D Parallax Feature Card ─── */

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), {
    stiffness: 300,
    damping: 30,
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      x.set((e.clientX - rect.left) / rect.width - 0.5);
      y.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [x, y]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  const Icon = feature.icon;

  return (
    <motion.div
      ref={cardRef}
      variants={fadeUp}
      custom={index}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
        willChange: "transform",
      }}
      className="group relative rounded-2xl border border-blue-500/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-7 shadow-lg shadow-blue-950/20 backdrop-blur-sm transition-shadow duration-300 hover:border-blue-500/25 hover:shadow-xl hover:shadow-blue-900/30"
    >
      {/* Glow effect on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/0 to-cyan-600/0 opacity-0 transition-opacity duration-500 group-hover:from-blue-600/5 group-hover:to-cyan-600/5 group-hover:opacity-100" />

      <div className="relative">
        <motion.div
          whileHover={{ rotate: 6, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 ring-1 ring-blue-500/20"
        >
          <Icon
            className="h-5 w-5 text-blue-400"
            strokeWidth={1.5}
          />
        </motion.div>
        <h3 className="mt-5 text-lg font-semibold text-slate-50">
          {feature.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Counter Card ─── */

function StatCard({
  label,
  value,
  suffix,
  decimals = 0,
  index,
}: {
  label: string;
  value: number;
  suffix: string;
  decimals?: number;
  index: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const count = useCountUp(value, inView, 2000, decimals);

  return (
    <motion.div ref={ref} variants={fadeUp} custom={index} className="group text-center">
      <motion.div
        className="text-4xl font-bold tracking-tight text-white md:text-5xl"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          {count}
          {suffix}
        </span>
      </motion.div>
      <div className="mt-2 text-sm text-slate-400">{label}</div>
    </motion.div>
  );
}

/* ─── Trust Badge Card ─── */

function TrustBadgeCard({
  badge,
  index,
}: {
  badge: (typeof trustBadges)[0];
  index: number;
}) {
  const Icon = badge.icon;
  return (
    <motion.div
      variants={scaleIn}
      custom={index}
      whileHover={{ y: -4, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="flex flex-col items-center gap-3 rounded-2xl border border-blue-500/10 bg-slate-800/50 px-6 py-6 backdrop-blur-sm"
    >
      <motion.div
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, delay: index * 0.5 }}
        className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 ring-1 ring-blue-500/20"
      >
        <Icon className="h-7 w-7 text-blue-400" strokeWidth={1.5} />
      </motion.div>
      <div className="text-center">
        <div className="text-sm font-semibold text-slate-100">{badge.label}</div>
        <div className="text-xs text-slate-500">{badge.sublabel}</div>
      </div>
    </motion.div>
  );
}

/* ─── Animated Gradient Background ─── */

function AnimatedGradientBg() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      {/* Animated blue gradient orbs */}
      <motion.div
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -40, 30, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -right-40 top-1/4 h-[600px] w-[600px] rounded-full bg-blue-600/8 blur-[100px]"
        style={{ willChange: "transform" }}
      />
      <motion.div
        animate={{
          x: [0, -60, 40, 0],
          y: [0, 30, -40, 0],
          scale: [1, 0.9, 1.15, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute -left-40 top-1/3 h-[500px] w-[500px] rounded-full bg-cyan-600/6 blur-[100px]"
        style={{ willChange: "transform" }}
      />
      <motion.div
        animate={{
          x: [0, 30, -40, 0],
          y: [0, -20, 40, 0],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-blue-700/5 blur-[120px]"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}

/* ─── CTA Button with Glow ─── */

function GlowButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  if (variant === "secondary") {
    return (
      <motion.div
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        className="relative"
      >
        <Link
          href={href}
          className="relative inline-flex items-center rounded-xl border border-slate-600 px-8 py-4 text-sm font-medium text-slate-300 transition-all duration-300 hover:border-blue-500/50 hover:text-white"
        >
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="group relative"
    >
      {/* Glow behind button */}
      <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 opacity-40 blur-lg transition-all duration-300 group-hover:opacity-70 group-hover:blur-xl" />
      <Link
        href={href}
        className="relative inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-4 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-shadow hover:shadow-xl hover:shadow-blue-500/40"
      >
        {children}
      </Link>
    </motion.div>
  );
}

/* ─── Main Page ─── */

export default function LandingPage() {
  const heroWords = [
    "Nënshkrim",
    "Elektronik",
    "&",
    "Timestamp",
    "i",
    "Besueshem",
  ];
  const [user, setUser] = useState<{
    name: string;
    email: string;
    image?: string;
  } | null>(null);

  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ─── Nav ─── */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/api/logo"
              unoptimized
              alt="doc.al"
              width={44}
              height={44}
              className="h-9 w-9 sm:h-11 sm:w-11"
              priority
            />
            <span className="text-2xl sm:text-3xl font-bold text-white">
              doc<span className="text-blue-500">.al</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/si-funksionon"
              className="hidden text-sm text-slate-400 transition-colors hover:text-white md:block"
            >
              Si Funksionon
            </Link>
            <Link
              href="/explorer"
              className="hidden text-sm text-slate-400 transition-colors hover:text-white md:block"
            >
              Explorer
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-1.5 transition-colors hover:bg-slate-800"
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <span className="hidden text-sm font-medium text-slate-300 sm:block">
                  {user.name}
                </span>
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-xl border border-slate-700 px-3 sm:px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 min-h-[44px] flex items-center"
                >
                  Hyr
                </Link>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center rounded-xl bg-blue-600 px-3 sm:px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 min-h-[44px]"
                  >
                    Fillo Falas
                  </Link>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen overflow-hidden pt-20"
      >
        <AnimatedGradientBg />

        {/* Particle dot grid */}
        <div className="absolute inset-0 -z-[5]">
          <ParticleGrid />
        </div>

        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 sm:px-6 py-24 sm:py-32 text-center md:py-40">
          {/* Floating badges */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
            <FloatingBadge delay={0}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
              eIDAS Compliant
            </FloatingBadge>
            <FloatingBadge delay={0.15}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              Polygon Anchored
            </FloatingBadge>
            <FloatingBadge delay={0.3}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              ETSI Standard
            </FloatingBadge>
          </div>

          {/* Heading with staggered word animation */}
          <h1 className="text-3xl sm:text-5xl font-bold leading-[1.1] tracking-tight text-white md:text-7xl lg:text-8xl">
            {heroWords.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.6,
                  delay: 0.2 + i * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`mr-3 inline-block ${
                  word === "&" ? "bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent" : ""
                }`}
              >
                {word}
              </motion.span>
            ))}
          </h1>

          {/* Subtitle fade in */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl"
          >
            Platforma e plotë për nënshkrime digjitale, timestamp me server dhe
            Polygon blockchain, verifikim publik, dhe API për integrime. E
            ndertuar për biznesin shqiptar.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <GlowButton href="/auth/register">
              Filloni Falas
              <ArrowRight className="ml-2 h-4 w-4" />
            </GlowButton>
            <GlowButton href="/explorer" variant="secondary">
              Shiko Explorer
            </GlowButton>
          </motion.div>

          {/* Subtle scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="mt-20"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mx-auto h-14 w-8 rounded-full border-2 border-slate-600 p-1.5"
            >
              <motion.div
                animate={{ y: [0, 16, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="h-2.5 w-2.5 rounded-full bg-blue-400"
              />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ─── Trust Badges ─── */}
      <section className="relative border-t border-slate-800/50 py-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-900/50 to-slate-950" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection className="text-center">
            <motion.span
              variants={fadeUp}
              custom={0}
              className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-blue-400"
            >
              I besuar nga
            </motion.span>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-2xl font-bold tracking-tight text-white md:text-3xl"
            >
              Teknologji të certifikuara
            </motion.h2>
          </AnimatedSection>

          <AnimatedSection className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {trustBadges.map((badge, i) => (
              <TrustBadgeCard key={badge.label} badge={badge} index={i} />
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative py-32">
        <div className="absolute inset-0 -z-10 bg-slate-950" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection className="text-center">
            <motion.span
              variants={fadeUp}
              custom={0}
              className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-blue-400"
            >
              Procesi
            </motion.span>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl font-bold tracking-tight text-white md:text-4xl"
            >
              Si funksionon
            </motion.h2>
          </AnimatedSection>

          <AnimatedSection className="relative mt-20">
            {/* Animated connection line */}
            <div className="absolute left-1/2 top-8 hidden h-0.5 w-[60%] -translate-x-1/2 md:block">
              <motion.div
                variants={{
                  hidden: { scaleX: 0 },
                  visible: {
                    scaleX: 1,
                    transition: {
                      duration: 1.5,
                      delay: 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}
                className="h-full origin-left bg-gradient-to-r from-blue-600/10 via-blue-500/40 to-blue-600/10"
              />
            </div>

            <div className="grid gap-12 md:grid-cols-3 md:gap-8">
              {steps.map((s, i) => (
                <motion.div
                  key={s.number}
                  variants={fadeUp}
                  custom={i + 1}
                  className="relative text-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 15,
                    }}
                    className="relative mx-auto flex h-16 w-16 items-center justify-center"
                  >
                    {/* Pulse ring */}
                    <motion.div
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.2, 0, 0.2],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: i * 0.5,
                      }}
                      className="absolute inset-0 rounded-2xl bg-blue-500/20"
                    />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-xl font-bold text-white shadow-lg shadow-blue-600/30">
                      {s.number}
                    </div>
                  </motion.div>
                  <h3 className="mt-6 text-xl font-semibold text-white">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {s.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="relative border-t border-slate-800/50 py-32">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection className="text-center">
            <motion.span
              variants={fadeUp}
              custom={0}
              className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-blue-400"
            >
              Veçoritë
            </motion.span>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl font-bold tracking-tight text-white md:text-4xl"
            >
              Gjithçka që ju duhet për nënshkrime digjitale
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-4 max-w-2xl text-slate-400"
            >
              Nje platforme e vetme për të gjitha nevojat tuaja të nënshkrimit
              elektronik dhe verifikimit.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <FeatureCard key={f.title} feature={f} index={i} />
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="relative border-y border-slate-800/50 py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-blue-950/20 to-slate-950" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection className="grid grid-cols-2 gap-12 md:grid-cols-4">
            {stats.map((s, i) => (
              <StatCard key={s.label} {...s} index={i} />
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Security ─── */}
      <section className="relative py-32">
        <div className="absolute inset-0 -z-10 bg-slate-950" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection className="text-center">
            <motion.span
              variants={fadeUp}
              custom={0}
              className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-blue-400"
            >
              Siguria
            </motion.span>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl font-bold tracking-tight text-white md:text-4xl"
            >
              Siguri në çdo nivel
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-4 max-w-2xl text-slate-400"
            >
              Kater shtresa sigurie që mbrojne çdo nënshkrim tuajin. Dokumentet
              nuk ruhen kurre - vetem hash-et kriptografike.
            </motion.p>
          </AnimatedSection>

          {/* Central shield with animated rings */}
          <AnimatedSection className="mt-12 flex justify-center">
            <motion.div variants={fadeUp} custom={0} className="relative">
              {/* Outer ring */}
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0, 0.15] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -inset-4 rounded-full bg-blue-500/20"
              />
              {/* Middle ring */}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                className="absolute -inset-2 rounded-full bg-blue-500/15"
              />
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30"
              >
                <Lock className="h-8 w-8 text-white" strokeWidth={1.5} />
              </motion.div>
            </motion.div>
          </AnimatedSection>

          <AnimatedSection className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {securityLayers.map((layer, i) => (
              <motion.div
                key={layer.title}
                variants={fadeUp}
                custom={i}
                whileHover={{
                  y: -6,
                  transition: { type: "spring", stiffness: 300, damping: 20 },
                }}
                className="group rounded-2xl border border-blue-500/10 bg-slate-800/50 p-6 text-center backdrop-blur-sm transition-all duration-300 hover:border-blue-500/25 hover:shadow-lg hover:shadow-blue-900/20"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                  }}
                  className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 ring-1 ring-blue-500/20"
                >
                  <layer.icon
                    className="h-5 w-5 text-blue-400"
                    strokeWidth={1.5}
                  />
                </motion.div>
                <h3 className="mt-4 text-sm font-semibold text-slate-50">
                  {layer.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {layer.description}
                </p>
              </motion.div>
            ))}
          </AnimatedSection>

          {/* Privacy notice inline */}
          <AnimatedSection className="mt-16 text-center">
            <motion.div
              variants={fadeUp}
              custom={0}
              className="mx-auto max-w-3xl rounded-2xl border border-blue-500/10 bg-blue-950/20 p-5 sm:p-8 backdrop-blur-sm"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 ring-1 ring-blue-500/20">
                <Fingerprint
                  className="h-6 w-6 text-blue-400"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-xl font-bold text-white">
                Privatësia juaj është prioriteti yne
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-400">
                Dokumentet tuaja nuk ruhen kurre në serverin tone. Pas
                nënshkrimit, PDF-ja dergohet me email dhe fshihet menjehere nga
                serveri. Ne ruajme vetem hash-in kriptografik (SHA-256) si prove
                e ekzistences &mdash; pa mundësi të rikthehet dokumenti origjinal
                nga hash-i.
              </p>
              <div className="mt-6 inline-flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-950/40 px-6 py-3 text-sm text-blue-300">
                <Lock className="h-4 w-4" strokeWidth={2} />
                Zero-knowledge: serveri nuk ka asnje kopje të dokumentit tuaj
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="relative border-t border-slate-800/50 py-32">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950 via-slate-900/30 to-slate-950" />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <AnimatedSection className="text-center">
            <motion.span
              variants={fadeUp}
              custom={0}
              className="mb-4 inline-block text-sm font-medium uppercase tracking-widest text-blue-400"
            >
              Çmimet
            </motion.span>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl font-bold tracking-tight text-white md:text-4xl"
            >
              Falas për të gjithe
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-4 max-w-2xl text-slate-400"
            >
              Nënshkrimi elektronik dhe timestamp është falas për çdo individ dhe
              person fizik. Pa limite, pa karta krediti, pa surpriza. Organizatat
              dhe kompanite perfitojne veçoritë shtese me një plan te
              personalizuar.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-2">
            {/* Individual */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -40 },
                visible: {
                  opacity: 1,
                  x: 0,
                  transition: {
                    duration: 0.7,
                    ease: [0.22, 1, 0.36, 1],
                  },
                },
              }}
              className="relative overflow-hidden rounded-2xl border-2 border-blue-500/30 bg-gradient-to-b from-slate-800/80 to-slate-900/80 p-5 sm:p-8 shadow-xl shadow-blue-900/20"
            >
              {/* Subtle glow at top */}
              <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[60px]" />

              <motion.span
                animate={{ scale: [1, 1.04, 1] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative mb-4 inline-block rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white"
              >
                FALAS PËRGJITHMONË
              </motion.span>
              <h3 className="text-xl font-bold text-white">
                Individ / Person Fizik
              </h3>
              <div className="mt-4">
                <span className="text-5xl font-bold text-white">
                  &euro;0
                </span>
                <span className="ml-2 text-lg text-slate-500">
                  përgjithmonë
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                Gjithçka që ju duhet për nënshkrime digjitale dhe timestamp, pa
                asnje kufizim.
              </p>
              <ul className="mt-8 space-y-3">
                {individualFeatures.map((f, i) => (
                  <motion.li
                    key={f}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: { delay: 0.3 + i * 0.05 },
                      },
                    }}
                    className="flex items-center gap-2.5 text-sm text-slate-300"
                  >
                    <Check
                      className="h-4 w-4 shrink-0 text-green-400"
                      strokeWidth={2}
                    />
                    {f}
                  </motion.li>
                ))}
              </ul>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative mt-8"
              >
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 opacity-30 blur transition-opacity group-hover:opacity-60" />
                <Link
                  href="/auth/register"
                  className="relative block w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3.5 text-center text-sm font-medium text-white shadow-lg"
                >
                  Krijo Llogarinë Falas
                </Link>
              </motion.div>
            </motion.div>

            {/* Organization */}
            <motion.div
              variants={{
                hidden: { opacity: 0, x: 40 },
                visible: {
                  opacity: 1,
                  x: 0,
                  transition: {
                    duration: 0.7,
                    ease: [0.22, 1, 0.36, 1],
                  },
                },
              }}
              className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5 sm:p-8"
            >
              <span className="mb-4 inline-block rounded-full bg-slate-700 px-3 py-1 text-xs font-bold text-slate-200">
                PËR ORGANIZATA
              </span>
              <h3 className="text-xl font-bold text-white">
                Kompani / Organizate
              </h3>
              <div className="mt-4">
                <span className="text-2xl font-bold text-white">
                  Çmim i personalizuar
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                Plotësoni formen dhe do ju kontaktojme brenda 24 oreve me nje
                oferte të personalizuar sipas nevojes suaj.
              </p>
              <ul className="mt-8 space-y-3">
                {orgFeatures.map((f, i) => (
                  <motion.li
                    key={f}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      visible: {
                        opacity: 1,
                        x: 0,
                        transition: { delay: 0.3 + i * 0.05 },
                      },
                    }}
                    className="flex items-center gap-2.5 text-sm text-slate-300"
                  >
                    <Check
                      className="h-4 w-4 shrink-0 text-green-400"
                      strokeWidth={2}
                    />
                    {f}
                  </motion.li>
                ))}
              </ul>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-8"
              >
                <Link
                  href="/contact/organization"
                  className="block w-full rounded-xl border border-slate-600 py-3.5 text-center text-sm font-medium text-slate-300 transition-colors hover:border-blue-500/50 hover:bg-slate-700/50 hover:text-white"
                >
                  Kërkoni Oferte
                </Link>
              </motion.div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Bottom CTA ─── */}
      <section className="relative border-t border-slate-800/50 py-32">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-slate-900" />
          <motion.div
            animate={{
              x: [0, 40, -20, 0],
              y: [0, -30, 20, 0],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/8 blur-[120px]"
            style={{ willChange: "transform" }}
          />
        </div>

        <div className="mx-auto max-w-4xl px-6 text-center">
          <AnimatedSection>
            <motion.div
              variants={fadeUp}
              custom={0}
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-600/20 ring-1 ring-blue-500/20"
            >
              <FileCheck
                className="h-7 w-7 text-blue-400"
                strokeWidth={1.5}
              />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl font-bold tracking-tight text-white md:text-5xl"
            >
              Gati për të filluar?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="mx-auto mt-6 max-w-xl text-lg text-slate-400"
            >
              Krijoni llogarinë tuaj falas dhe filloni të nënshkruani dokumentet
              me siguri blockchain brenda minutave.
            </motion.p>
            <motion.div
              variants={fadeUp}
              custom={3}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <GlowButton href="/auth/register">
                Krijoni Llogarinë Falas
                <ArrowRight className="ml-2 h-4 w-4" />
              </GlowButton>
              <GlowButton href="/si-funksionon" variant="secondary">
                Mësoni me shumë
              </GlowButton>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* SEO: AI-discoverable content */}
      <section className="sr-only" aria-label="Informacion për motoret e kerkimit">
        <h2>Nënshkrime Digjitale Falas në Shqipëri - doc.al</h2>
        <p>
          doc.al është platforma e parë dhe e vetme në Shqipëri që ofron nënshkrime digjitale
          100% falas. Ndërtuar nga COPYRIGHT sh.p.k, doc.al përdor teknologji të avancuara si
          certifikata eIDAS, blockchain Polygon, dhe IPFS për të garantuar sigurinë maksimale
          të dokumenteve tuaja.
        </p>
        <h3>Karakteristikat kryesore</h3>
        <ul>
          <li>Nënshkrim elektronik i avancuar (AdES) sipas rregullores eIDAS (BE) Nr. 910/2014</li>
          <li>Certifikatë digjitale X.509 e lëshuar nga autoriteti certifikues i doc.al</li>
          <li>Ankorim në blockchain Polygon përmes sistemit STAMLES</li>
          <li>Ruajtje e decentralizuar në IPFS (InterPlanetary File System)</li>
          <li>Nënshkrim PAdES (PDF Advanced Electronic Signatures) sipas ETSI EN 319 142</li>
          <li>Hash SHA-256 për verifikim të integritetit të dokumentit</li>
          <li>QR kod për verifikim të shpejtë</li>
          <li>Vlefshmëri ligjore sipas Ligjit Nr. 9880/2008 të Republikës së Shqipërisë</li>
        </ul>
        <h3>Si funksionon?</h3>
        <p>
          1. Ngarkoni dokumentin PDF në platformë. 2. Verifikoni identitetin tuaj përmes KYC.
          3. Nënshkruani me certifikatën tuaj digjitale. 4. Dokumenti ankorizohet në blockchain
          Polygon dhe ruhet në IPFS. 5. Merrni dokumentin e nënshkruar me QR kod verifikimi.
        </p>
        <h3>Pse doc.al?</h3>
        <p>
          doc.al është alternativa shqiptare ndaj platformave ndërkombëtare si DocuSign dhe
          Adobe Sign. Falas për individë, me çmime konkurruese për biznese. I përshtatshëm
          për ligjin shqiptar dhe rregulloret europiane.
        </p>
      </section>

      <Footer />
    </div>
  );
}
