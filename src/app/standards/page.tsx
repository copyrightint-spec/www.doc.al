import Link from "next/link";
import Image from "next/image";
import PublicNav from "@/components/PublicNav";
import Footer from "@/components/Footer";
import {
  Shield,
  Clock,
  FileCheck,
  Award,
  Lock,
  Globe,
  CheckCircle,
  ExternalLink,
  Fingerprint,
  ScrollText,
} from "lucide-react";

export const metadata = {
  title: "Standardet - doc.al",
  description:
    "Standardet nderkombetare qe doc.al ndjek: eIDAS, ETSI EN 319 422, RFC 3161, PAdES, dhe ISO 27001.",
};

function StandardCard({
  icon: Icon,
  title,
  subtitle,
  description,
  compliance,
  details,
  sourceUrl,
  sourceLabel,
}: {
  icon: typeof Shield;
  title: string;
  subtitle: string;
  description: string;
  compliance: "plotesisht" | "pjeserisht" | "ne-proces";
  details: string[];
  sourceUrl: string;
  sourceLabel: string;
}) {
  const complianceBadge = {
    plotesisht: {
      label: "Plotesisht konform",
      className:
        "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    },
    pjeserisht: {
      label: "Pjeserisht konform",
      className:
        "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    },
    "ne-proces": {
      label: "Ne proces implementimi",
      className:
        "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    },
  };

  const badge = complianceBadge[compliance];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {title}
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
            >
              <CheckCircle className="h-3 w-3" />
              {badge.label}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400">
            {subtitle}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {description}
          </p>
          <ul className="mt-4 space-y-2">
            {details.map((detail) => (
              <li
                key={detail}
                className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400"
              >
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                {detail}
              </li>
            ))}
          </ul>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-700 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
          >
            <ExternalLink className="h-3 w-3" />
            {sourceLabel}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function StandardsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Nav */}
      <nav className="border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/api/logo" unoptimized alt="doc.al" width={44} height={44} className="h-9 w-9 sm:h-11 sm:w-11" />
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              doc<span className="text-blue-600">.al</span>
            </span>
          </Link>
          <PublicNav />
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <Award className="h-3.5 w-3.5" />
          Standardet Nderkombetare
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
          Standardet qe ndjekim
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 dark:text-slate-400">
          doc.al nderton sigurine e platformen mbi standarde nderkombetare te njohura
          per nenshkrime elektronike, timestamp, dhe sigurine e informacionit.
        </p>
      </section>

      {/* Main Standards */}
      <section className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 pb-16">
        <StandardCard
          icon={Shield}
          title="eIDAS Regulation"
          subtitle="Rregullorja (BE) Nr. 910/2014"
          description="Rregullorja eIDAS (Electronic Identification, Authentication and Trust Services) eshte kuadri ligjor i Bashkimit Europian per identifikimin elektronik dhe sherbimet e besimit. Ajo percakton standardet per nenshkrime elektronike, vula elektronike, vula kohore, dhe sherbime te tjera te besimit qe mundesojne transaksione te sigurta elektronike ne te gjithe BE-ne."
          compliance="plotesisht"
          details={[
            "Nenshkrime elektronike te thjeshta, te avancuara, dhe te kualifikuara sipas nenit 3 te rregullores",
            "Certifikata dixhitale X.509 per identifikimin unik te nenshkruesit",
            "Vula kohore te kualifikuara per proveshmeri ligjore te koher se nenshkrimit",
            "Integriteti i dokumentit i garantuar permes hash-eve kriptografike SHA-256",
            "Auditim i plote i te gjitha veprimeve ne perputhje me kerkesat e rregullores",
          ]}
          sourceUrl="https://eur-lex.europa.eu/eli/reg/2014/910/oj"
          sourceLabel="Lexo rregulloren ne EUR-Lex"
        />

        <StandardCard
          icon={Clock}
          title="ETSI EN 319 422"
          subtitle="Time-Stamping Protocol and Profile"
          description="Ky standard i ETSI (European Telecommunications Standards Institute) percakton protokollin per sherbimet e vules kohore (timestamping). Ai specifikon si duhet te funksionoje nje Autoritet i Vules Kohore (TSA) per te garantuar qe nje dokument ekzistonte ne nje moment te caktuar kohor, duke ofruar prove te besueshme dhe te verifikueshme."
          compliance="plotesisht"
          details={[
            "Timestamp Authority (TSA) i brendshem qe gjeneron vula kohore per cdo dokument",
            "Sekuenca zinxhir (sequential chain) ku cdo timestamp lidhet kriptografikisht me te meparsmin",
            "Ankorim ne Polygon blockchain permes Merkle tree batching per prove te pandryshueshem",
            "Verifikim publik i pavarur permes Explorer - askush nuk ka nevoje te besoje doc.al",
            "Ruajtje ne IPFS per decentralizim te metadates se proves",
          ]}
          sourceUrl="https://www.etsi.org/deliver/etsi_en/319400_319499/319422/"
          sourceLabel="Lexo standardin ne ETSI"
        />

        <StandardCard
          icon={FileCheck}
          title="RFC 3161"
          subtitle="Internet X.509 Public Key Infrastructure Time-Stamp Protocol"
          description="RFC 3161 eshte standardi i IETF (Internet Engineering Task Force) qe percakton protokollin per sherbimet e vules kohore ne infrastrukturen e celese publike X.509. Ai specifikon si nje klient kerkon nje vule kohore nga nje TSA dhe si TSA-ja gjeneron pergjigjen me proven kriptografike te kohes."
          compliance="plotesisht"
          details={[
            "TSA e doc.al gjeneron vula kohore konform me RFC 3161 per cdo dokument te nenshkruar",
            "Hash-i SHA-256 i dokumentit dergohet ne TSA pa zbuluar permbajtjen e dokumentit",
            "Vula kohore nenshkruhet kriptografikisht per te garantuar autenticitetin",
            "Zinxhiri sekuencial shton nje shtrese ekstra sigurie pertej RFC 3161 standard",
            "Prove e pandryshueshem e ankruar ne blockchain per verifikim afatgjate",
          ]}
          sourceUrl="https://tools.ietf.org/html/rfc3161"
          sourceLabel="Lexo RFC 3161 ne IETF"
        />
      </section>

      {/* Additional Standards */}
      <section className="border-t border-slate-100 bg-slate-50 py-16 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Standarde shtese
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-500 dark:text-slate-400">
              Pervec standardeve kryesore, doc.al ndjek edhe keto standarde per te garantuar sigurine dhe cilesine me te larte.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {/* PAdES */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                <ScrollText className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-slate-50">
                ETSI EN 319 142
              </h3>
              <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                PAdES - PDF Advanced Electronic Signatures
              </p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Standardi per nenshkrime elektronike te avancuara ne formate PDF. Siguron qe nenshkrimet dixhitale ne dokumente PDF jane te verifikueshme dhe konform me eIDAS.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
                  <CheckCircle className="h-3 w-3" />
                  Konform
                </span>
              </div>
            </div>

            {/* Certificate Policy */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                <Fingerprint className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-slate-50">
                ETSI EN 319 411
              </h3>
              <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                Certificate Policy for Trust Service Providers
              </p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Percakton politikat dhe praktikat per ofruesit e sherbimeve te besimit qe leshojne certifikata dixhitale. Siguron qe certifikatat X.509 te doc.al ndjekin praktika te njohura nderkombetarisht.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
                  <CheckCircle className="h-3 w-3" />
                  Konform
                </span>
              </div>
            </div>

            {/* ISO 27001 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-slate-50">
                ISO 27001
              </h3>
              <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                Information Security Management System
              </p>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Standardi nderkombetar per menaxhimin e sigurise se informacionit. doc.al zbaton kontrollet e sigurise te percaktuara nga ISO 27001 per te mbrojtur te dhenat dhe infrastrukturen.
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  <CheckCircle className="h-3 w-3" />
                  Ne proces implementimi
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            Keni pyetje rreth standardeve?
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            Na kontaktoni per te mesuar me shume rreth perputhshmerise tone me standardet nderkombetare
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              Na kontaktoni
            </Link>
            <Link
              href="/si-funksionon"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
            >
              Si funksionon doc.al
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
