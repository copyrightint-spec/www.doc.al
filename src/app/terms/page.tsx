import Link from "next/link";
import Image from "next/image";
import PublicNav from "@/components/PublicNav";
import Footer from "@/components/Footer";
import { Scale, FileText } from "lucide-react";

export const metadata = {
  title: "Kushtet e Perdorimit - doc.al",
  description:
    "Kushtet e perdorimit te platformen doc.al per nenshkrime elektronike dhe timestamp.",
};

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-start gap-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
          {number}
        </span>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Nav */}
      <nav className="border-b border-slate-100 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/api/logo" unoptimized alt="doc.al" width={44} height={44} className="h-11 w-11" />
            <span className="text-3xl font-bold text-slate-900 dark:text-white">
              doc<span className="text-blue-600">.al</span>
            </span>
          </Link>
          <PublicNav />
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <Scale className="h-3.5 w-3.5" />
          Dokument Ligjor
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
          Kushtet e Perdorimit
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 dark:text-slate-400">
          Kushtet qe rregullojne perdorimin e platformen doc.al per nenshkrime elektronike,
          timestamp dhe sherbime te lidhura.
        </p>
        <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
          Perditesuar se fundmi: Mars 2026
        </p>
      </section>

      {/* Table of Contents */}
      <section className="mx-auto max-w-3xl px-6 pb-12">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
            <FileText className="h-4 w-4" />
            Tabela e permbajtjes
          </h3>
          <nav className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              { id: "perkufizime", label: "1. Perkufizime" },
              { id: "perdorimi", label: "2. Perdorimi i Sherbimit" },
              { id: "regjistrimi", label: "3. Regjistrimi dhe Llogaria" },
              { id: "nenshkrimet", label: "4. Nenshkrimet Elektronike" },
              { id: "privatesia", label: "5. Privatesia dhe Siguria" },
              { id: "pergjegjesite", label: "6. Pergjegjesite dhe Kufizimet" },
              { id: "pronesia", label: "7. Pronesia Intelektuale" },
              { id: "nderprerja", label: "8. Nderprerja e Sherbimit" },
              { id: "ligji", label: "9. Ligji i Aplikueshem" },
              { id: "kontakti", label: "10. Kontakti" },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-3xl space-y-12 px-6 pb-16">
        <Section id="perkufizime" number="1" title="Perkufizime">
          <p>
            Per qellimet e ketyre kushteve, termat e meposhtme kane kuptimin e percaktuar me poshte:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong>&quot;Platforma&quot;</strong> ose <strong>&quot;doc.al&quot;</strong> - sistemi online i ofruar nga COPYRIGHT sh.p.k per nenshkrime elektronike, timestamp, dhe sherbime te lidhura.
            </li>
            <li>
              <strong>&quot;Perdoruesi&quot;</strong> - cdo person fizik ose juridik qe perdor platformen doc.al, pavaresisht nese ka llogari te regjistruar ose jo.
            </li>
            <li>
              <strong>&quot;Nenshkrim Elektronik&quot;</strong> - te dhena ne forme elektronike qe jane bashkangjitur ose jane lidhur logjikisht me te dhena te tjera elektronike dhe qe perdoren si metode per nenshkrim, ne perputhje me Ligjin Nr. 9880/2008.
            </li>
            <li>
              <strong>&quot;Timestamp&quot;</strong> ose <strong>&quot;Vula Kohore&quot;</strong> - nje prove kriptografike qe verteton ekzistencen e nje dokumenti ne nje moment te caktuar kohor.
            </li>
            <li>
              <strong>&quot;Organizata&quot;</strong> - nje entitet juridik i regjistruar ne platforme qe menaxhon perdoruesit dhe dokumentet e saj.
            </li>
            <li>
              <strong>&quot;Certifikate Dixhitale&quot;</strong> - nje certifikate X.509 e leshuar nga Autoriteti i Certifikimit i doc.al per nenshkrime elektronike.
            </li>
          </ul>
        </Section>

        <Section id="perdorimi" number="2" title="Perdorimi i Sherbimit">
          <p>
            Platforma doc.al ofron sherbimet e meposhtme:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>Nenshkrime elektronike te avancuara me certifikata dixhitale X.509</li>
            <li>Timestamp server (vula kohore) me ankorim ne Polygon blockchain</li>
            <li>Verifikim publik i dokumenteve permes Explorer</li>
            <li>API per integrime me sisteme te tjera</li>
            <li>Menaxhim i template-ve per dokumente</li>
            <li>Certifikata dixhitale per individe dhe organizata</li>
          </ul>
          <p>
            Perdoruesi pranon te perdore platformen vetem per qellime te ligjshme dhe ne perputhje me legjislacionin shqiptar dhe europian ne fuqi. Ndalohet perdorimi i platformen per:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>Aktivitete te paligjshme ose mashtruese</li>
            <li>Falsifikimin e dokumenteve ose identitetit</li>
            <li>Shkeljen e te drejtave te pronesise intelektuale te te treteve</li>
            <li>Sulme ndaj infrastruktures teknologjike te platformen</li>
          </ul>
        </Section>

        <Section id="regjistrimi" number="3" title="Regjistrimi dhe Llogaria">
          <p>
            Per te perdorur sherbimet e plota te doc.al, perdoruesi duhet te krijoje nje llogari duke dhene informacione te sakta dhe te plota. Perdoruesi eshte pergjegjes per:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>Ruajtjen e konfidencialitetit te kredencialeve te llogarise (emri i perdoruesit dhe fjalekalimi)</li>
            <li>Te gjitha aktivitetet qe kryhen permes llogarise se tij</li>
            <li>Njoftimin e menjehershem te doc.al per cdo perdorim te paautorizuar te llogarise</li>
            <li>Sigurimin qe informacionet e profilit jane te sakta dhe te perditesuar</li>
          </ul>
          <p>
            doc.al rezervon te drejten te pezulloje ose mbyllse llogarine e perdoruesit ne rast te shkeljes se ketyre kushteve, pa njoftim paraprak nese rrethana e kerkojne.
          </p>
          <p>
            Per organizatat, administratori i organizates eshte pergjegjes per menaxhimin e perdoruesve brenda organizates dhe per sigurimin qe te gjithe perdoruesit respektojne keto kushte.
          </p>
        </Section>

        <Section id="nenshkrimet" number="4" title="Nenshkrimet Elektronike">
          <p>
            doc.al ofron nenshkrime elektronike ne perputhje me kuadrin ligjor te Republikes se Shqiperise dhe Bashkimit Europian:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong>Ligji Nr. 9880/2008</strong> &quot;Per nenshkrimin elektronik ne Republiken e Shqiperise&quot; - percakton kuadrin ligjor per nenshkrimet elektronike, certifikatat dixhitale, dhe ofruesit e sherbimeve te certifikimit.
            </li>
            <li>
              <strong>Rregullorja eIDAS (BE) Nr. 910/2014</strong> - rregullorja europiane per identifikimin elektronik dhe sherbimet e besimit per transaksionet elektronike ne tregun e brendshem.
            </li>
          </ul>
          <p>
            Nenshkrimet elektronike te kryera permes doc.al kane vlere ligjore ne perputhje me legjislacionin e siperpermendur. Platforma ofron tre nivele nenshkrimesh:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li><strong>Nenshkrim i Thjeshte</strong> - nenshkrim elektronik baze, i pranueshem per shumicen e dokumenteve te perditshme.</li>
            <li><strong>Nenshkrim i Avancuar</strong> - nenshkrim me certifikate dixhitale X.509, qe identifikon ne menyre unike nenshkruesin dhe siguron integritetin e dokumentit.</li>
            <li><strong>Nenshkrim i Kualifikuar</strong> - niveli me i larte i nenshkrimit elektronik, ekuivalent me nenshkrimin dore ne perputhje me legjislacionin ne fuqi.</li>
          </ul>
          <p>
            Perdoruesi pranon qe nenshkrimi elektronik i kryer permes platformen ka te njejten vlere ligjore si nenshkrimi ne leter, ne perputhje me ligjin ne fuqi.
          </p>
        </Section>

        <Section id="privatesia" number="5" title="Privatesia dhe Siguria">
          <p>
            doc.al angazhohet per mbrojtjen e te dhenave personale te perdoruesve ne perputhje me:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong>Ligjin Nr. 9887/2008</strong> &quot;Per mbrojtjen e te dhenave personale&quot; ne Republiken e Shqiperise
            </li>
            <li>
              <strong>Rregulloren e Pergjithshme per Mbrojtjen e te Dhenave (GDPR)</strong> te Bashkimit Europian
            </li>
          </ul>
          <p>
            Masat e sigurise qe doc.al zbaton perfshijne:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>Enkriptim end-to-end per te gjitha komunikimet</li>
            <li>Hashing kriptografik SHA-256 per fingerprint-et e dokumenteve</li>
            <li>Ankorim ne Polygon blockchain per prove te pandryshueshmne</li>
            <li>Ruajtje ne IPFS per decentralizim te provave</li>
            <li>Kontrolle aksesi te bazuara ne role (RBAC)</li>
            <li>Auditim i plote i te gjitha veprimeve ne platforme</li>
          </ul>
          <p>
            doc.al nuk ruan permbajtjen e dokumenteve te nenshkruara. Vetem hash-i kriptografik (fingerprint) i dokumentit ruhet ne sistemin tone per qellime verifikimi.
          </p>
        </Section>

        <Section id="pergjegjesite" number="6" title="Pergjegjesite dhe Kufizimet">
          <p>
            doc.al ofron platformen &quot;sic eshte&quot; (as-is) dhe nuk garanton:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>Disponueshmerine e panderprerje te sherbimit</li>
            <li>Mungesen e plote te gabimeve teknike</li>
            <li>Pershtatshmeri per nje qellim specifik te perdoruesit</li>
          </ul>
          <p>
            doc.al nuk eshte pergjegjes per:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>Humbje ose demtime te shkaktuara nga perdorimi i gabuar i platformen</li>
            <li>Nderprerje te sherbimit per shkaqe te forces madhore</li>
            <li>Veprime te paautorizuara te kryera nga te trete permes llogarise se perdoruesit</li>
            <li>Permbajtjen e dokumenteve qe nenshkruhen permes platformen</li>
          </ul>
          <p>
            Pergjegjesia totale e doc.al ndaj perdoruesit kufizohet ne masen e tarifave te paguara nga perdoruesi per sherbimin gjate 12 muajve te fundit.
          </p>
        </Section>

        <Section id="pronesia" number="7" title="Pronesia Intelektuale">
          <p>
            Te gjitha te drejtat e pronesise intelektuale mbi platformen doc.al, perfshire por jo vetem:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>Kodin burimor dhe softuer-in</li>
            <li>Dizajnin, logon, dhe marken tregtare</li>
            <li>Dokumentacionin dhe materialet udhezuese</li>
            <li>Algortimet dhe procedurate teknike</li>
          </ul>
          <p>
            i perkasin ekskluzivisht COPYRIGHT sh.p.k. Perdoruesi nuk fiton asnje te drejte pronesie intelektuale mbi platformen permes perdorimit te saj.
          </p>
          <p>
            Perdoruesi ruan te gjitha te drejtat mbi dokumentet e tij qe nenshkruhen ose verifikohen permes doc.al. doc.al nuk pretendon asnje te drejte mbi permbajtjen e dokumenteve te perdoruesit.
          </p>
        </Section>

        <Section id="nderprerja" number="8" title="Nderprerja e Sherbimit">
          <p>
            Perdoruesi mund te nderprese perdorimin e platformen ne cdo kohe duke fshire llogarise e tij. Ne kete rast:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>Te dhenat personale do te fshihen brenda 30 diteve nga kerkesa</li>
            <li>Hash-et kriptografike te dokumenteve do te mbeten ne zinxhirin publik per qellime verifikimi</li>
            <li>Te dhenat e ankruara ne blockchain jane te pandryshueshem dhe nuk mund te fshihen</li>
          </ul>
          <p>
            doc.al rezervon te drejten te nderprese sherbimin ndaj perdoruesit ne rastet e meposhtme:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>Shkelje e ketyre kushteve te perdorimit</li>
            <li>Aktivitet i dyshimte ose mashtrues</li>
            <li>Kerkese nga autoritetet ligjzbatuese</li>
            <li>Mospagese e tarifave (per planet me pagese)</li>
          </ul>
        </Section>

        <Section id="ligji" number="9" title="Ligji i Aplikueshem">
          <p>
            Keto kushte perdorimi rregullohen dhe interpretohen ne perputhje me ligjet e Republikes se Shqiperise. Per cdo mosmarreveshje qe lind nga perdorimi i platformen, palet bien dakord te perpiqen te zgjidhin mosmarreveshjen ne menyre miqesore.
          </p>
          <p>
            Ne rast se mosmarreveshja nuk zgjidhet ne menyre miqesore, ajo do t&apos;i nenshtrohet juridiksionit te gjykatave kompetente te Tiranes, Shqiperi.
          </p>
          <p>
            Legjislacioni i referencuar:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>Ligji Nr. 9880/2008 &quot;Per nenshkrimin elektronik ne Republiken e Shqiperise&quot;</li>
            <li>Rregullorja eIDAS (BE) Nr. 910/2014 per identifikimin elektronik</li>
            <li>Ligji Nr. 9887/2008 &quot;Per mbrojtjen e te dhenave personale&quot;</li>
            <li>Kodi Civil i Republikes se Shqiperise</li>
            <li>Ligji Nr. 10128/2009 &quot;Per tregtine elektronike&quot;</li>
          </ul>
        </Section>

        <Section id="kontakti" number="10" title="Kontakti">
          <p>
            Per cdo pyetje, ankese, ose kerkese ne lidhje me keto kushte perdorimi, ju lutem na kontaktoni:
          </p>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Kompania</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-50">COPYRIGHT sh.p.k</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Adresa</p>
                <p className="mt-1 font-medium text-slate-900 dark:text-slate-50">Tirane, Shqiperi</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</p>
                <a href="mailto:info@doc.al" className="mt-1 block font-medium text-blue-600 hover:underline dark:text-blue-400">
                  info@doc.al
                </a>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Website</p>
                <a href="https://doc.al" className="mt-1 block font-medium text-blue-600 hover:underline dark:text-blue-400">
                  doc.al
                </a>
              </div>
            </div>
          </div>
        </Section>
      </section>

      <Footer />
    </div>
  );
}
