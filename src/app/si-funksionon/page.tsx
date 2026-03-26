"use client";

import Link from "next/link";
import Image from "next/image";
import PublicNav from "@/components/PublicNav";
import Footer from "@/components/Footer";
import {
  Shield,
  Lock,
  Globe,
  ArrowRight,
  FileText,
  Upload,
  PenTool,
  Link as LinkIcon,
  Database,
  CheckCircle,
  Layers,
  Fingerprint,
  Eye,
  QrCode,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";

/* ─── Animation Variants ─── */

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

/* ─── Animated Section Wrapper ─── */

function AnimatedSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: 50 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.7, delay, ease: "easeOut" },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Hero Document Animation ─── */

function DocumentAnimation() {
  return (
    <div className="relative mx-auto mt-12 h-64 w-64 sm:h-80 sm:w-80">
      {/* Glowing backdrop */}
      <motion.div
        className="absolute inset-0 rounded-full bg-blue-500/10 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Document */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="relative h-48 w-36 rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-2xl shadow-blue-500/10 sm:h-56 sm:w-44">
          {/* Document lines */}
          <div className="space-y-2">
            <div className="h-2 w-full rounded bg-slate-700" />
            <div className="h-2 w-3/4 rounded bg-slate-700" />
            <div className="h-2 w-5/6 rounded bg-slate-700" />
            <div className="h-2 w-2/3 rounded bg-slate-700" />
            <div className="mt-4 h-2 w-full rounded bg-slate-700" />
            <div className="h-2 w-4/5 rounded bg-slate-700" />
          </div>

          {/* Signature line */}
          <motion.div
            className="absolute bottom-6 left-4 right-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <div className="mb-1 h-px border-b border-dashed border-blue-500/50" />
            <motion.div
              className="h-6 w-20 rounded bg-gradient-to-r from-blue-500 to-blue-400 opacity-80"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.5, duration: 0.6, ease: "easeOut" }}
              style={{ transformOrigin: "left" }}
            />
          </motion.div>

          {/* Seal stamp */}
          <motion.div
            className="absolute -bottom-3 -right-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-500 bg-slate-900 shadow-lg shadow-blue-500/20"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: 2,
              duration: 0.6,
              type: "spring",
              stiffness: 200,
            }}
          >
            <CheckCircle className="h-7 w-7 text-blue-400" />
          </motion.div>
        </div>
      </motion.div>

      {/* Floating particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full bg-blue-500/30"
          style={{
            left: `${20 + i * 15}%`,
            top: `${10 + (i % 3) * 30}%`,
          }}
          animate={{
            y: [0, -15, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 2 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Timeline Step ─── */

function TimelineStep({
  index,
  total,
  icon: Icon,
  title,
  description,
}: {
  index: number;
  total: number;
  icon: typeof Upload;
  title: string;
  description: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className="relative flex gap-6"
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, x: -30 },
        visible: {
          opacity: 1,
          x: 0,
          transition: { duration: 0.6, delay: 0.1 },
        },
      }}
    >
      {/* Timeline line + icon */}
      <div className="flex flex-col items-center">
        <motion.div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/5"
          variants={scaleIn}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
        {index < total - 1 && (
          <motion.div
            className="mt-2 w-px flex-1 bg-gradient-to-b from-blue-500/40 to-transparent"
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{ transformOrigin: "top" }}
          />
        )}
      </div>

      {/* Content */}
      <div className="pb-12">
        <motion.div
          className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-400"
          variants={fadeIn}
        >
          Hapi {index + 1}
        </motion.div>
        <motion.h3 className="text-lg font-bold text-white" variants={fadeUp}>
          {title}
        </motion.h3>
        <motion.p
          className="mt-2 text-sm leading-relaxed text-slate-400"
          variants={fadeUp}
        >
          {description}
        </motion.p>
      </div>
    </motion.div>
  );
}

/* ─── Security Layer Card ─── */

function SecurityLayerCard({
  number,
  title,
  description,
  icon: Icon,
  details,
}: {
  number: number;
  title: string;
  description: string;
  icon: typeof Shield;
  details: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, delay: number * 0.15 },
        },
      }}
      className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-sm transition-colors hover:border-blue-500/30"
    >
      {/* Gradient accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="flex items-start gap-4">
        <motion.div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-400"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Icon className="h-6 w-6" />
        </motion.div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
              Shtresa {number}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {description}
          </p>

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
          >
            {expanded ? "Mbyll detajet" : "Shiko detajet"}
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="inline-block"
            >
              <ArrowRight className="h-3 w-3 rotate-90" />
            </motion.span>
          </button>

          <motion.div
            initial={false}
            animate={{
              height: expanded ? "auto" : 0,
              opacity: expanded ? 1 : 0,
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <ul className="mt-3 space-y-2 border-t border-slate-800 pt-3">
              {details.map((d, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={
                    expanded
                      ? { opacity: 1, x: 0 }
                      : { opacity: 0, x: -10 }
                  }
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex items-start gap-2 text-xs text-slate-400"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {d}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Animated Merkle Tree ─── */

function AnimatedMerkleTree() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const nodeBase =
    "flex items-center justify-center rounded-xl border px-4 py-2 text-center font-mono text-xs";

  return (
    <div ref={ref} className="mx-auto max-w-2xl py-10">
      {/* Root */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6, delay: 1.2 }}
      >
        <div
          className={`${nodeBase} border-blue-500 bg-blue-500/10 text-blue-300 shadow-lg shadow-blue-500/10`}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">
              Merkle Root
            </p>
            <p className="mt-1 text-blue-200">H(AB + CD)</p>
            <p className="mt-1 text-[10px] text-blue-500">
              Ruhet ne Polygon blockchain
            </p>
          </div>
        </div>
      </motion.div>

      {/* Lines from root to level 2 */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4, delay: 0.9 }}
      >
        <div className="flex w-64 justify-between">
          <div className="ml-16 h-8 w-px bg-gradient-to-b from-blue-500/60 to-blue-500/20" />
          <div className="mr-16 h-8 w-px bg-gradient-to-b from-blue-500/60 to-blue-500/20" />
        </div>
      </motion.div>

      {/* Level 2 */}
      <motion.div
        className="flex justify-center gap-16"
        initial={{ opacity: 0, y: -20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <div
          className={`${nodeBase} border-blue-500/40 bg-blue-500/5 text-blue-300`}
        >
          H(A + B)
        </div>
        <div
          className={`${nodeBase} border-blue-500/40 bg-blue-500/5 text-blue-300`}
        >
          H(C + D)
        </div>
      </motion.div>

      {/* Lines from level 2 to leaves */}
      <motion.div
        className="flex justify-center gap-16"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="flex w-24 justify-between">
          <div className="ml-4 h-8 w-px bg-gradient-to-b from-blue-500/40 to-green-500/20" />
          <div className="mr-4 h-8 w-px bg-gradient-to-b from-blue-500/40 to-green-500/20" />
        </div>
        <div className="flex w-24 justify-between">
          <div className="ml-4 h-8 w-px bg-gradient-to-b from-blue-500/40 to-green-500/20" />
          <div className="mr-4 h-8 w-px bg-gradient-to-b from-blue-500/40 to-green-500/20" />
        </div>
      </motion.div>

      {/* Leaf Nodes */}
      <motion.div
        className="flex justify-center gap-4"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        {["Doc A", "Doc B", "Doc C", "Doc D"].map((doc) => (
          <motion.div
            key={doc}
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.8 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.4 },
              },
            }}
            className="rounded-xl border border-green-500/30 bg-green-500/5 px-3 py-2 text-center"
          >
            <FileText className="mx-auto h-4 w-4 text-green-400" />
            <p className="mt-1 text-[10px] font-medium text-green-300">
              {doc}
            </p>
            <p className="font-mono text-[9px] text-green-500">SHA-256</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.p
        className="mt-8 text-center text-xs text-slate-500"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ delay: 1.5 }}
      >
        4 dokumente &rarr; 2 nivele hash &rarr; 1 Merkle root ne blockchain
      </motion.p>
    </div>
  );
}

/* ─── Privacy Item ─── */

function PrivacyItem({
  icon: Icon,
  text,
  index,
}: {
  icon: typeof Lock;
  text: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
    >
      <motion.div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-400"
        whileHover={{ scale: 1.1 }}
      >
        <Icon className="h-5 w-5" />
      </motion.div>
      <p className="text-sm text-slate-300">{text}</p>
    </motion.div>
  );
}

/* ─── Main Page ─── */

export default function SiFunksionon() {
  const timelineSteps = [
    {
      icon: Upload,
      title: "Ngarkoni Dokumentin",
      description: "Ngarkoni PDF-ne tuaj ne platformen doc.al",
    },
    {
      icon: Shield,
      title: "Verifikimi i Identitetit",
      description: "KYC + Email OTP + 2FA TOTP per siguri maksimale",
    },
    {
      icon: PenTool,
      title: "Nenshkrimi Dixhital",
      description: "Certifikate X.509, PAdES (ETSI EN 319 142), SHA-256",
    },
    {
      icon: Database,
      title: "Blockchain Timestamp",
      description:
        "Hash-i regjistrohet ne Polygon blockchain permes STAMLES Merkle batching",
    },
    {
      icon: Globe,
      title: "IPFS Arkivimi",
      description: "Prova kriptografike ruhet ne IPFS per qendrushmeri",
    },
    {
      icon: QrCode,
      title: "Verifikimi",
      description: "Skanoni QR kodin ose futni hash-in per te verifikuar",
    },
  ];

  const securityLayers = [
    {
      title: "Certifikata Dixhitale (eIDAS)",
      description:
        "Nenshkrime te avancuara me certifikata X.509 ne perputhje me standartet europiane eIDAS dhe ETSI EN 319 142.",
      icon: Fingerprint,
      details: [
        "Certifikate X.509 per cdo nenshkrues",
        "PAdES format per PDF nenshkrime",
        "SHA-256 hash per integritet",
        "Ne perputhje me eIDAS dhe ETSI",
      ],
    },
    {
      title: "Polygon Blockchain (STAMLES)",
      description:
        "Cdo 24 ore, te gjitha hash-et bashkohen ne nje Merkle tree. Vetem root-i ruhet ne Polygon blockchain.",
      icon: Database,
      details: [
        "Merkle tree batching: mijera dokumente ne 1 transaksion",
        "Polygon PoS: konfirmim 2-5 sekonda",
        "Merkle proof per verifikim te pavarur",
        "I verifikueshem ne PolygonScan",
      ],
    },
    {
      title: "IPFS Distributed Storage",
      description:
        "Metadata e proves ruhet ne IPFS - nje rrjet te shperndare ku askush nuk mund ta fshije informacionin.",
      icon: Globe,
      details: [
        "CID i pandryshueshem garanton integritetin",
        "I replikuar ne dhjetera nyje IPFS globale",
        "Permban te dhenat per verifikim offline",
        "Aksesueshme edhe pa doc.al",
      ],
    },
    {
      title: "doc.al Sequential Chain",
      description:
        "Cdo dokument lidhet kriptografikisht me te gjithe dokumentet para tij, duke krijuar nje zinxhir te pandryshueshem.",
      icon: LinkIcon,
      details: [
        "Seq. Fingerprint = SHA-256(prevHash + hash + timestamp)",
        "Ndryshimi i nje entry prisht te gjithe zinxhirin",
        "Numeri sekuencial garanton rradhen kronologjike",
        "I verifikueshem publikisht ne Explorer",
      ],
    },
  ];

  const privacyItems = [
    { icon: Eye, text: "Dokumentet NUK ruhen ne serverin tone" },
    {
      icon: Fingerprint,
      text: "Vetem hash SHA-256 ruhet - asnjehere dokumenti i plote",
    },
    {
      icon: FileText,
      text: "PDF dergohet me email dhe fshihet menjehere nga serveri",
    },
    {
      icon: Lock,
      text: "Enkriptim end-to-end per te gjitha komunikimet",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <nav className="border-b border-slate-800/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/api/logo"
              unoptimized
              alt="doc.al"
              width={44}
              height={44}
              className="h-9 w-9 sm:h-11 sm:w-11"
            />
            <span className="text-2xl sm:text-3xl font-bold text-white">
              doc<span className="text-blue-500">.al</span>
            </span>
          </Link>
          <PublicNav />
        </div>
      </nav>

      {/* ─── Section 1: Hero ─── */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pb-16 pt-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-400"
          >
            <Shield className="h-3.5 w-3.5" />
            Teknologji Blockchain
          </motion.div>

          <motion.h1
            className="text-4xl font-bold tracking-tight sm:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Si Funksionon{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              doc.al
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-2xl text-lg text-slate-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Nenshkrime dixhitale te sigurta me teknologji blockchain
          </motion.p>

          <DocumentAnimation />
        </div>
      </section>

      {/* ─── Section 2: Process Flow Timeline ─── */}
      <section className="relative border-t border-slate-800/50 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <AnimatedSection className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Procesi i{" "}
              <span className="text-blue-400">Nenshkrimit</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Nga ngarkimi deri te verifikimi - 6 hapa te sigurt
            </p>
          </AnimatedSection>

          <div className="ml-2 sm:ml-8">
            {timelineSteps.map((step, i) => (
              <TimelineStep
                key={i}
                index={i}
                total={timelineSteps.length}
                icon={step.icon}
                title={step.title}
                description={step.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 3: 4 Shtresat e Sigurise ─── */}
      <section className="border-t border-slate-800/50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <AnimatedSection className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-400">
              <Layers className="h-3.5 w-3.5" />
              4 Shtresa Sigurie
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              4 Shtresat e{" "}
              <span className="text-blue-400">Sigurise</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Cdo dokument mbrohet me 4 shtresa te pavarura teknologjike
            </p>
          </AnimatedSection>

          <div className="grid gap-6 sm:grid-cols-2">
            {securityLayers.map((layer, i) => (
              <SecurityLayerCard
                key={i}
                number={i + 1}
                title={layer.title}
                description={layer.description}
                icon={layer.icon}
                details={layer.details}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 4: Merkle Tree Vizualizim ─── */}
      <section className="border-t border-slate-800/50 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <AnimatedSection className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-400">
              <Layers className="h-3.5 w-3.5" />
              Merkle Tree Batching
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Si funksionon{" "}
              <span className="text-blue-400">Merkle Tree</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Ne vend qe te ruajme cdo hash individualisht ne blockchain,
              bashkojme te gjitha hash-et ne nje peme Merkle. Vetem root-i
              shkon ne Polygon.
            </p>
          </AnimatedSection>

          <AnimatedMerkleTree />

          {/* Info cards */}
          <AnimatedSection delay={0.3}>
            <motion.div
              className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {[
                {
                  icon: Layers,
                  title: "Batching",
                  desc: "Te gjitha dokumentet e dites grupohen. Cdo hash kombinohet me hash-in fqinj.",
                  color: "text-slate-400",
                },
                {
                  icon: Database,
                  title: "1 Transaksion",
                  desc: "Vetem Merkle root ruhet ne Polygon. Nje transaksion per mijera dokumente.",
                  color: "text-blue-400",
                },
                {
                  icon: CheckCircle,
                  title: "Verifikim",
                  desc: "Merkle proof provon qe hash-i juaj eshte pjese e pemes blockchain.",
                  color: "text-green-400",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-center"
                >
                  <item.icon className={`mx-auto h-8 w-8 ${item.color}`} />
                  <h4 className="mt-3 font-semibold text-white">
                    {item.title}
                  </h4>
                  <p className="mt-2 text-xs text-slate-400">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Section 5: Privatesia ─── */}
      <section className="border-t border-slate-800/50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <AnimatedSection className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-4 py-1.5 text-xs font-medium text-green-400">
              <Lock className="h-3.5 w-3.5" />
              Privatesi Maksimale
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Privatesia{" "}
              <span className="text-green-400">Juaj</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Ne nuk ruajme asnjehere dokumentet tuaja - vetem provat
              kriptografike
            </p>
          </AnimatedSection>

          <div className="space-y-3">
            {privacyItems.map((item, i) => (
              <PrivacyItem key={i} icon={item.icon} text={item.text} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Section 6: CTA ─── */}
      <section className="border-t border-slate-800/50 bg-slate-900/30 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <AnimatedSection>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Gati per te filluar?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Krijoni llogarine tuaj falas dhe filloni te nenshkruani dokumente
              me siguri blockchain
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-shadow hover:shadow-blue-500/40"
                >
                  Filloni Tani - Falas
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/explorer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-8 py-3.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
                >
                  Shiko Explorer
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <Footer />
    </div>
  );
}
