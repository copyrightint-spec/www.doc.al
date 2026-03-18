import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Lock,
  Globe,
  ArrowRight,
  FileText,
  Hash,
  Layers,
  Database,
  CheckCircle,
  Link as LinkIcon,
} from "lucide-react";

export const metadata = {
  title: "Si Funksionon - doc.al",
  description:
    "Si funksionon sistemi i sigurise doc.al: Merkle tree batching, Polygon blockchain, IPFS, dhe verifikimi i dokumenteve.",
};

function MerkleTreeDiagram() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Merkle Root */}
      <div className="flex justify-center">
        <div className="rounded-2xl border-2 border-purple-500 bg-purple-50 px-6 py-3 text-center dark:border-purple-400 dark:bg-purple-950/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Merkle Root
          </p>
          <p className="mt-1 font-mono text-xs text-purple-800 dark:text-purple-200">
            H(AB + CD)
          </p>
          <p className="mt-1 text-[10px] text-purple-500">
            Ruhet ne Polygon blockchain
          </p>
        </div>
      </div>

      {/* Lines down */}
      <div className="flex justify-center">
        <div className="flex w-64 justify-between">
          <div className="ml-16 h-8 w-px bg-purple-300 dark:bg-purple-700" />
          <div className="mr-16 h-8 w-px bg-purple-300 dark:bg-purple-700" />
        </div>
      </div>

      {/* Level 2 */}
      <div className="flex justify-center gap-16">
        <div className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-center dark:border-blue-700 dark:bg-blue-950/40">
          <p className="font-mono text-xs text-blue-700 dark:text-blue-300">
            H(A + B)
          </p>
        </div>
        <div className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-center dark:border-blue-700 dark:bg-blue-950/40">
          <p className="font-mono text-xs text-blue-700 dark:text-blue-300">
            H(C + D)
          </p>
        </div>
      </div>

      {/* Lines down */}
      <div className="flex justify-center gap-16">
        <div className="flex w-24 justify-between">
          <div className="ml-4 h-8 w-px bg-blue-300 dark:bg-blue-700" />
          <div className="mr-4 h-8 w-px bg-blue-300 dark:bg-blue-700" />
        </div>
        <div className="flex w-24 justify-between">
          <div className="ml-4 h-8 w-px bg-blue-300 dark:bg-blue-700" />
          <div className="mr-4 h-8 w-px bg-blue-300 dark:bg-blue-700" />
        </div>
      </div>

      {/* Leaf Nodes */}
      <div className="flex justify-center gap-4">
        {["Doc A", "Doc B", "Doc C", "Doc D"].map((doc, i) => (
          <div
            key={doc}
            className="rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-center dark:border-green-700 dark:bg-green-950/40"
          >
            <FileText className="mx-auto h-4 w-4 text-green-600 dark:text-green-400" />
            <p className="mt-1 text-[10px] font-medium text-green-700 dark:text-green-300">
              {doc}
            </p>
            <p className="font-mono text-[9px] text-green-500">
              SHA-256
            </p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        4 dokumente &rarr; 2 nivele hash &rarr; 1 Merkle root ne blockchain
      </p>
    </div>
  );
}

function SecurityLayer({
  number,
  title,
  description,
  icon: Icon,
  color,
  details,
}: {
  number: number;
  title: string;
  description: string;
  icon: typeof Shield;
  color: "green" | "purple" | "blue" | "orange";
  details: string[];
}) {
  const colors = {
    green: {
      border: "border-green-200 dark:border-green-800",
      bg: "bg-green-50 dark:bg-green-950/30",
      icon: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
      number: "text-green-600 dark:text-green-400",
      title: "text-green-800 dark:text-green-200",
      dot: "bg-green-500",
    },
    purple: {
      border: "border-purple-200 dark:border-purple-800",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      icon: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
      number: "text-purple-600 dark:text-purple-400",
      title: "text-purple-800 dark:text-purple-200",
      dot: "bg-purple-500",
    },
    blue: {
      border: "border-blue-200 dark:border-blue-800",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      icon: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
      number: "text-blue-600 dark:text-blue-400",
      title: "text-blue-800 dark:text-blue-200",
      dot: "bg-blue-500",
    },
    orange: {
      border: "border-orange-200 dark:border-orange-800",
      bg: "bg-orange-50 dark:bg-orange-950/30",
      icon: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
      number: "text-orange-600 dark:text-orange-400",
      title: "text-orange-800 dark:text-orange-200",
      dot: "bg-orange-500",
    },
  };

  const c = colors[color];

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-6`}>
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${c.number}`}>
              SHTRESA {number}
            </span>
          </div>
          <h3 className={`mt-1 text-lg font-bold ${c.title}`}>{title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <ul className="mt-3 space-y-1.5">
            {details.map((d) => (
              <li key={d} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function SiFunksionon() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Nav */}
      <nav className="border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/docal-icon.png" unoptimized alt="doc.al" width={44} height={44} className="h-11 w-11" />
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              doc<span className="text-blue-600">.al</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/explorer" className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400">Explorer</Link>
            <Link href="/verify" className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400">Verify</Link>
            <Link href="/auth/login" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
              Hyr
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-xs font-medium text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
          <Shield className="h-3.5 w-3.5" />
          4 Shtresa Sigurie
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
          Si e mbrojme dokumentin tuaj
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 dark:text-slate-400">
          Cdo dokument qe nenshkruhet ne doc.al mbrohet me 4 shtresa te pavarura sigurie.
          Edhe nese serveri yne zhduket, prova e dokumentit tuaj mbetet e verifikueshme
          ne Polygon blockchain dhe IPFS.
        </p>
      </section>

      {/* 4 Security Layers */}
      <section className="mx-auto max-w-4xl space-y-6 px-6 pb-16">
        <SecurityLayer
          number={1}
          title="doc.al Sequential Chain"
          description="Cdo dokument merr nje numer unik ne zinxhirin tone te brendshem. Cdo hash lidhet kriptografikisht me hash-in e meparshem, duke krijuar nje zinxhir te pandryshueshem."
          icon={LinkIcon}
          color="green"
          details={[
            "Seq. Fingerprint = SHA-256(prevSeqFingerprint + fingerprint + timestamp)",
            "Numeri sekuencial garanton rradhen kronologjike",
            "Asnje entry nuk mund te fshihet ose ndryshohet pa prishur zinxhirin",
            "I verifikueshem publikisht ne Explorer",
          ]}
        />

        <SecurityLayer
          number={2}
          title="Polygon Blockchain (STAMLES)"
          description="Cdo 24 ore, te gjitha hash-et e dites bashkohen ne nje Merkle tree. Vetem root-i (nje hash i vetem) ruhet ne Polygon blockchain - duke garantuar efikasitet maksimal."
          icon={Database}
          color="purple"
          details={[
            "Merkle tree batching: mijera dokumente → 1 transaksion",
            "Polygon PoS: konfirmim 2-5 sekonda",
            "Merkle proof provon perfshirjen e dokumentit tuaj ne batch",
            "I verifikueshem ne PolygonScan nga kushdo",
          ]}
        />

        <SecurityLayer
          number={3}
          title="IPFS Network (Prove e Decentralizuar)"
          description="Metadata e plote e proves (hash, timestamp, Merkle path, lidhjet e zinxhirit) ruhet ne IPFS - nje rrjet te shperndare ku askush nuk mund ta fshije."
          icon={Globe}
          color="blue"
          details={[
            "CID (Content ID) i pandryshueshem - perdorimi garanton integritetin",
            "I replikuar ne dhjetera nyje IPFS ne bote",
            "Permban te dhenat per verifikim te pavarur offline",
            "Edhe pa doc.al, prova mbetet e aksesueshme",
          ]}
        />

        <SecurityLayer
          number={4}
          title="doc.al Chain (Fingerprint Sekuencial)"
          description="Fingerprinti sekuencial lidh cdo dokument me te gjithe dokumentet para tij. Kjo krijon nje prove te forte qe asnje dokument nuk eshte shtuar ose hequr pas faktit."
          icon={Lock}
          color="orange"
          details={[
            "Hash zinxhir: cdo entry varet nga entry para tij",
            "Ndryshimi i nje entry te vetem prisht te gjithe zinxhirin pas tij",
            "I verifikueshem me nje komande te vetme",
            "Funksionon si nje blockchain privat brenda doc.al",
          ]}
        />
      </section>

      {/* Merkle Tree Diagram */}
      <section className="border-t border-slate-100 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
              <Layers className="h-3.5 w-3.5" />
              Merkle Tree Batching
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Si funksionon Merkle Tree
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-500 dark:text-slate-400">
              Ne vend qe te ruajme cdo dokument individualisht ne blockchain,
              bashkojme te gjitha hash-et ne nje peme Merkle. Vetem root-i shkon ne Polygon.
            </p>
          </div>

          <MerkleTreeDiagram />

          <div className="mx-auto mt-8 grid max-w-3xl gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-800">
              <Hash className="mx-auto h-8 w-8 text-slate-400" />
              <h4 className="mt-3 font-semibold text-slate-900 dark:text-slate-50">
                Batching
              </h4>
              <p className="mt-2 text-xs text-slate-500">
                Te gjitha dokumentet e dites grupohen. Cdo hash kombinohet me
                hash-in fqinj per te krijuar nivele me te larta.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-800">
              <Database className="mx-auto h-8 w-8 text-purple-500" />
              <h4 className="mt-3 font-semibold text-slate-900 dark:text-slate-50">
                1 Transaksion
              </h4>
              <p className="mt-2 text-xs text-slate-500">
                Vetem Merkle root ruhet ne Polygon. Nje transaksion per mijera
                dokumente, efikasitet maksimal.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-700 dark:bg-slate-800">
              <CheckCircle className="mx-auto h-8 w-8 text-green-500" />
              <h4 className="mt-3 font-semibold text-slate-900 dark:text-slate-50">
                Verifikim
              </h4>
              <p className="mt-2 text-xs text-slate-500">
                Per te verifikuar dokumentin tuaj, sistemi provon qe hash-i juaj
                eshte pjese e pemes permes Merkle proof.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Verification Flow */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Procesi i Verifikimit
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-500 dark:text-slate-400">
              Kushdo mund te verifikoje cdo dokument, pa nevoje te besoje doc.al
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {[
              {
                step: "1",
                title: "Llogarit hash-in SHA-256 te dokumentit",
                desc: "Gjeni fingerprint-in unik te skedarit. E njejta file jep gjithmone te njejtin hash.",
              },
              {
                step: "2",
                title: "Kerko ne doc.al Explorer",
                desc: "Fut hash-in ne Explorer per te gjetur entry-n ne zinxhirin tone publik.",
              },
              {
                step: "3",
                title: "Kontrollo Merkle proof ne IPFS",
                desc: "Shkarko metadata-n nga IPFS per te marre Merkle proof (rrugen nga hash deri te root).",
              },
              {
                step: "4",
                title: "Verifiko ne Polygon blockchain",
                desc: "Kontrollo ne PolygonScan qe Merkle root perputhet me transaksionin on-chain.",
              },
              {
                step: "5",
                title: "Verifikimi i zinxhirit sekuencial",
                desc: "Kontrollo qe fingerprinti sekuencial lidhet sakte me entry-n para tij.",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-50">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Provoni vete
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            Shikoni zinxhirin publik ne kohe reale ose verifikoni nje dokument
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/explorer"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:opacity-90 dark:bg-slate-100 dark:text-slate-900"
            >
              Shiko Explorer
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Verifiko Dokument
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Krijo Llogari Falas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-slate-400">
          &copy; {new Date().getFullYear()} doc.al. Te gjitha te drejtat e rezervuara.
        </div>
      </footer>
    </div>
  );
}
