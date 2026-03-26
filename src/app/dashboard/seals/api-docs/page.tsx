"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Code2,
  Terminal,
  Globe,
  Key,
  FileText,
  Shield,
  Bell,
  Image,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

/* ---------- helpers ---------- */

function CopyBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative">
      <div className="mb-1 flex items-center gap-2">
        <Badge variant="default">{lang}</Badge>
      </div>
      <pre className="overflow-x-auto rounded-xl border border-border bg-[#0d1117] p-4 text-[13px] leading-relaxed text-slate-300">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="absolute right-3 top-10 rounded-lg border border-border bg-muted p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "border-green-600 bg-green-900/40 text-green-400",
    POST: "border-blue-600 bg-blue-900/40 text-blue-400",
    PUT: "border-yellow-600 bg-yellow-900/40 text-yellow-400",
    DELETE: "border-red-600 bg-red-900/40 text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold uppercase ${colors[method] || colors.GET}`}>
      {method}
    </span>
  );
}

function EndpointSection({
  method,
  path,
  description,
  auth,
  requestBody,
  responseBody,
  errorCodes,
  curlExample,
  jsExample,
  pyExample,
}: {
  method: string;
  path: string;
  description: string;
  auth: string;
  requestBody?: string;
  responseBody: string;
  errorCodes: { code: number; description: string }[];
  curlExample: string;
  jsExample: string;
  pyExample: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"curl" | "js" | "py">("curl");

  return (
    <Card className="overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setExpanded(!expanded);
        }}
        className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-muted/50"
      >
        <MethodBadge method={method} />
        <code className="text-sm font-semibold text-foreground">{path}</code>
        <span className="ml-auto text-xs text-muted-foreground">{description}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </div>

      {expanded && (
        <CardContent className="space-y-5 border-t border-border p-5">
          {/* Auth */}
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Autentikimi</h4>
            <code className="rounded-lg bg-muted px-3 py-1.5 text-xs text-foreground">{auth}</code>
          </div>

          {/* Request body */}
          {requestBody && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Request Body</h4>
              <CopyBlock code={requestBody} lang="JSON" />
            </div>
          )}

          {/* Response body */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Response</h4>
            <CopyBlock code={responseBody} lang="JSON" />
          </div>

          {/* Error codes */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kodet e Gabimit</h4>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Kodi</th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Pershkrimi</th>
                  </tr>
                </thead>
                <tbody>
                  {errorCodes.map((ec) => (
                    <tr key={ec.code} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-mono text-foreground">{ec.code}</td>
                      <td className="px-3 py-2 text-muted-foreground">{ec.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Code examples */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shembuj Kodi</h4>
            <div className="mb-3 flex gap-1 rounded-xl border border-border bg-muted p-1">
              {(["curl", "js", "py"] as const).map((t) => (
                <button
                  key={t}
                  onClick={(e) => { e.stopPropagation(); setTab(t); }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "curl" ? "cURL" : t === "js" ? "JavaScript" : "Python"}
                </button>
              ))}
            </div>
            <CopyBlock
              code={tab === "curl" ? curlExample : tab === "js" ? jsExample : pyExample}
              lang={tab === "curl" ? "bash" : tab === "js" ? "JavaScript" : "Python"}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function GuideSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen(!open); }}
        className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-muted/50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900/30 text-blue-400">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <ChevronDown className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <CardContent className="border-t border-border p-5 text-sm leading-relaxed text-muted-foreground">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

/* ---------- page ---------- */

const BASE = "https://www.doc.al/api/v1";

export default function SealApiDocsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/seals"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader
          title="API Dokumentacion - Vulat Dixhitale"
          subtitle="Integroni vulat dixhitale te doc.al ne sistemet tuaja permes API"
        />
      </div>

      {/* Base URL */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900/30 text-emerald-400">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Base URL</span>
            <p className="font-mono text-sm text-foreground">{BASE}</p>
          </div>
          <Badge variant="info">REST API v1</Badge>
          <Badge variant="success">HTTPS Only</Badge>
          <Badge variant="default">JSON Responses</Badge>
        </CardContent>
      </Card>

      {/* ====== ENDPOINTS ====== */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Terminal className="h-5 w-5 text-blue-400" />
          Endpoint-et
        </h2>
        <div className="space-y-3">
          {/* 1. GET /seals */}
          <EndpointSection
            method="GET"
            path="/api/v1/seals"
            description="Listo te gjitha vulat e organizates"
            auth="Authorization: Bearer YOUR_API_KEY"
            responseBody={`{
  "success": true,
  "data": [
    {
      "id": "seal_abc123",
      "name": "Vula Zyrtare 2026",
      "type": "COMPANY_SEAL",
      "status": "ACTIVE",
      "eidasLevel": "ADVANCED",
      "etsiPolicy": "ETSI EN 319 411-1",
      "expiresAt": "2028-01-15T00:00:00.000Z",
      "createdAt": "2026-01-15T10:30:00.000Z"
    }
  ]
}`}
            errorCodes={[
              { code: 401, description: "API key i pavlefshem ose mungon" },
              { code: 403, description: "API key nuk eshte i lidhur me nje organizate" },
              { code: 500, description: "Gabim ne server" },
            ]}
            curlExample={`curl -X GET "${BASE}/seals" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
            jsExample={`const response = await fetch("${BASE}/seals", {
  headers: {
    "Authorization": "Bearer YOUR_API_KEY"
  }
});

const { data } = await response.json();
console.log(data); // Array of seals`}
            pyExample={`import requests

response = requests.get(
    "${BASE}/seals",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)

seals = response.json()["data"]
print(seals)`}
          />

          {/* 2. POST /seals/apply */}
          <EndpointSection
            method="POST"
            path="/api/v1/seals/apply"
            description="Apliko vulen ne nje dokument"
            auth="Authorization: Bearer YOUR_API_KEY"
            requestBody={`{
  "documentId": "doc_xyz789",
  "sealId": "seal_abc123",
  "position": {
    "page": 1,
    "x": 50,
    "y": 50
  }
}`}
            responseBody={`{
  "success": true,
  "data": {
    "appliedSealId": "as_def456",
    "certificationHash": "a1b2c3d4e5f6...64 hex chars",
    "verificationUrl": "https://www.doc.al/verify/seal/a1b2c3d4...",
    "timestamp": {
      "serverSequence": 1042,
      "otsSubmitted": true,
      "note": "Bitcoin confirmation typically takes 1-2 hours"
    }
  }
}`}
            errorCodes={[
              { code: 400, description: "documentId ose sealId mungon" },
              { code: 401, description: "API key i pavlefshem" },
              { code: 403, description: "API key nuk eshte i lidhur me nje organizate" },
              { code: 404, description: "Dokumenti ose vula nuk u gjet" },
              { code: 429, description: "Kuota e API thirrjeve ose vulave u tejkalua" },
              { code: 500, description: "Gabim ne server" },
            ]}
            curlExample={`curl -X POST "${BASE}/seals/apply" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "documentId": "doc_xyz789",
    "sealId": "seal_abc123",
    "position": { "page": 1, "x": 50, "y": 50 }
  }'`}
            jsExample={`const response = await fetch("${BASE}/seals/apply", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    documentId: "doc_xyz789",
    sealId: "seal_abc123",
    position: { page: 1, x: 50, y: 50 }
  })
});

const { data } = await response.json();
console.log(data.verificationUrl);`}
            pyExample={`import requests

response = requests.post(
    "${BASE}/seals/apply",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "documentId": "doc_xyz789",
        "sealId": "seal_abc123",
        "position": {"page": 1, "x": 50, "y": 50}
    }
)

data = response.json()["data"]
print(data["verificationUrl"])`}
          />

          {/* 3. GET /seals/verify */}
          <EndpointSection
            method="GET"
            path="/api/v1/seals/verify?hash={hash}"
            description="Verifiko nje dokument te vulosur"
            auth="Publik - nuk kerkohet autentikim"
            responseBody={`{
  "success": true,
  "data": {
    "valid": true,
    "sealInfo": {
      "organizationName": "Kompania SH.P.K.",
      "sealName": "Vula Zyrtare 2026",
      "sealType": "COMPANY_SEAL",
      "eidasLevel": "ADVANCED",
      "etsiPolicy": "ETSI EN 319 411-1",
      "appliedAt": "2026-03-15T14:30:00.000Z",
      "appliedBy": "Filan Fisteku",
      "documentTitle": "Kontrate Sherbimi",
      "documentHash": "abc123..."
    },
    "timestamps": {
      "server": {
        "timestamp": "2026-03-15T14:30:00.000Z",
        "sequenceNumber": 1042,
        "fingerprint": "fp_abc..."
      },
      "bitcoin": {
        "status": "CONFIRMED",
        "txId": "tx_abc...",
        "blockHeight": 890123,
        "blockHash": "00000000..."
      }
    },
    "certificate": {
      "serialNumber": "SN-abc123...",
      "subjectDN": "CN=Kompania SH.P.K. - Vula Zyrtare",
      "issuerDN": "CN=DOC.AL CA",
      "validFrom": "2026-01-15T00:00:00.000Z",
      "validTo": "2028-01-15T00:00:00.000Z",
      "signatureValid": true
    },
    "chainIntegrity": true
  }
}`}
            errorCodes={[
              { code: 400, description: "Hash SHA-256 i pavlefshem (duhet 64 hex chars)" },
              { code: 500, description: "Gabim ne verifikim" },
            ]}
            curlExample={`curl -X GET "${BASE}/seals/verify?hash=a1b2c3d4e5f6789..."`}
            jsExample={`const hash = "a1b2c3d4e5f6789..."; // SHA-256 certification hash
const response = await fetch(
  \`${BASE}/seals/verify?hash=\${hash}\`
);

const { data } = await response.json();
if (data.valid) {
  console.log("Dokumenti eshte i vulosur!", data.sealInfo);
} else {
  console.log("Vula nuk u verifikua.");
}`}
            pyExample={`import requests

hash = "a1b2c3d4e5f6789..."  # SHA-256 certification hash
response = requests.get(
    f"${BASE}/seals/verify",
    params={"hash": hash}
)

data = response.json()["data"]
if data["valid"]:
    print("Dokumenti eshte i vulosur!", data["sealInfo"])
else:
    print("Vula nuk u verifikua.")`}
          />

          {/* 4. GET /seals/{id} */}
          <EndpointSection
            method="GET"
            path="/api/v1/seals/{id}"
            description="Merr detajet e nje vule"
            auth="Authorization: Bearer YOUR_API_KEY"
            responseBody={`{
  "success": true,
  "data": {
    "id": "seal_abc123",
    "name": "Vula Zyrtare 2026",
    "description": "Vula kryesore e kompanise",
    "type": "COMPANY_SEAL",
    "template": "official",
    "primaryColor": "#0f172a",
    "secondaryColor": "#ffffff",
    "borderText": "KOMPANIA SH.P.K.",
    "centerText": "VULE ZYRTARE",
    "eidasLevel": "ADVANCED",
    "etsiPolicy": "ETSI EN 319 411-1",
    "status": "ACTIVE",
    "activatedAt": "2026-01-15T10:30:00.000Z",
    "expiresAt": "2028-01-15T00:00:00.000Z",
    "createdAt": "2026-01-15T10:30:00.000Z",
    "certificate": {
      "serialNumber": "SN-abc123...",
      "validTo": "2028-01-15T00:00:00.000Z",
      "revoked": false
    },
    "totalApplications": 42
  }
}`}
            errorCodes={[
              { code: 401, description: "API key i pavlefshem" },
              { code: 403, description: "Vula nuk i perket organizates suaj" },
              { code: 404, description: "Vula nuk u gjet" },
              { code: 500, description: "Gabim ne server" },
            ]}
            curlExample={`curl -X GET "${BASE}/seals/seal_abc123" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
            jsExample={`const sealId = "seal_abc123";
const response = await fetch(\`${BASE}/seals/\${sealId}\`, {
  headers: {
    "Authorization": "Bearer YOUR_API_KEY"
  }
});

const { data } = await response.json();
console.log(data.name, data.status);`}
            pyExample={`import requests

seal_id = "seal_abc123"
response = requests.get(
    f"${BASE}/seals/{seal_id}",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)

seal = response.json()["data"]
print(seal["name"], seal["status"])`}
          />
        </div>
      </div>

      {/* ====== INTEGRATION GUIDE ====== */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Code2 className="h-5 w-5 text-emerald-400" />
          Udhezues Integrimi
        </h2>
        <div className="space-y-3">
          {/* 1. Si te merrni API Key */}
          <GuideSection title="Si te merrni API Key" icon={Key}>
            <div className="space-y-3">
              <p>Per te perdorur API-ne e vulave dixhitale, ju nevojitet nje API Key.</p>
              <ol className="list-inside list-decimal space-y-2">
                <li>Shkoni ne <strong>Settings &rarr; API Keys</strong> ne panelin e administrimit.</li>
                <li>Klikoni butonin <strong>&quot;Krijo API Key te Ri&quot;</strong>.</li>
                <li>Zgjidhni lejet (permissions) qe doni te jepni: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">seals:read</code>, <code className="rounded bg-muted px-1.5 py-0.5 text-xs">seals:write</code>, <code className="rounded bg-muted px-1.5 py-0.5 text-xs">documents:read</code>.</li>
                <li>Kopjoni API Key-n menjehere - ajo shfaqet vetem nje here.</li>
                <li>Ruajeni ne menyre te sigurte (environment variables, secret manager).</li>
              </ol>
              <div className="mt-3 rounded-xl border border-amber-800 bg-amber-900/20 p-3 text-xs text-amber-300">
                <strong>Kujdes:</strong> Mos e ndani API Key-n ne kod publik, Git repositories, ose me persona te paautorizuar.
              </div>
            </div>
          </GuideSection>

          {/* 2. Si te aplikoni vulen ne dokument */}
          <GuideSection title="Si te aplikoni vulen ne dokument" icon={FileText}>
            <div className="space-y-3">
              <p>Procesi per te aplikuar nje vule dixhitale ne nje dokument:</p>
              <ol className="list-inside list-decimal space-y-2">
                <li><strong>Ngarkoni dokumentin PDF</strong> permes endpoint-it te dokumenteve (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">POST /api/v1/documents</code>).</li>
                <li><strong>Merrni listen e vulave</strong> aktive (<code className="rounded bg-muted px-1.5 py-0.5 text-xs">GET /api/v1/seals</code>).</li>
                <li><strong>Aplikoni vulen</strong> ne dokument duke derguar <code className="rounded bg-muted px-1.5 py-0.5 text-xs">documentId</code> dhe <code className="rounded bg-muted px-1.5 py-0.5 text-xs">sealId</code> ne <code className="rounded bg-muted px-1.5 py-0.5 text-xs">POST /api/v1/seals/apply</code>.</li>
                <li>Merrni <strong>certificationHash</strong> dhe <strong>verificationUrl</strong> nga pergjigja.</li>
                <li>PDF-ja e vulosur mund te shkarkohet permes endpoint-it te dokumenteve.</li>
              </ol>
              <CopyBlock
                lang="JavaScript"
                code={`// Shembull i plote: apliko vulen ne dokument
const sealId = "seal_abc123";  // ID e vules tuaj
const documentId = "doc_xyz";  // ID e dokumentit te ngarkuar

const res = await fetch("${BASE}/seals/apply", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    documentId,
    sealId,
    position: { page: 1, x: 400, y: 50 }
  })
});

const { data } = await res.json();
console.log("Verification URL:", data.verificationUrl);`}
              />
            </div>
          </GuideSection>

          {/* 3. Si te verifikoni */}
          <GuideSection title="Si te verifikoni nje dokument te vulosur" icon={Shield}>
            <div className="space-y-3">
              <p>Verifikimi i nje dokumenti te vulosur eshte publik dhe nuk kerkon autentikim.</p>
              <ol className="list-inside list-decimal space-y-2">
                <li>Merrni <strong>certificationHash</strong> nga dokumenti i vulosur (ose skanoni QR kodin).</li>
                <li>Dergoni kerkese ne <code className="rounded bg-muted px-1.5 py-0.5 text-xs">GET /api/v1/seals/verify?hash=...</code></li>
                <li>Kontrolloni fushen <code className="rounded bg-muted px-1.5 py-0.5 text-xs">valid</code> ne pergjigje.</li>
                <li>Verifikoni informacionet: organizaten, daten, certifikaten, blockchain timestamp.</li>
              </ol>
              <div className="mt-3 rounded-xl border border-green-800 bg-green-900/20 p-3 text-xs text-green-300">
                <strong>Tip:</strong> Perdorni URL-ne e verifikimit (<code>doc.al/verify/seal/...</code>) per verifikim vizual, ose API-ne per verifikim programatik.
              </div>
            </div>
          </GuideSection>

          {/* 4. Webhooks */}
          <GuideSection title="Webhooks - Njoftimet automatike" icon={Bell}>
            <div className="space-y-3">
              <p>Merrni njoftime automatike kur nje vule aplikohet ne nje dokument.</p>
              <ol className="list-inside list-decimal space-y-2">
                <li>Shkoni ne <strong>Settings &rarr; Webhooks</strong>.</li>
                <li>Shtoni URL-ne tuaj te webhook-ut (HTTPS).</li>
                <li>Zgjidhni ngjarjet: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">seal.applied</code>, <code className="rounded bg-muted px-1.5 py-0.5 text-xs">seal.verified</code>, <code className="rounded bg-muted px-1.5 py-0.5 text-xs">seal.revoked</code>.</li>
              </ol>
              <CopyBlock
                lang="JSON"
                code={`// Shembull webhook payload per seal.applied
{
  "event": "seal.applied",
  "timestamp": "2026-03-15T14:30:00.000Z",
  "data": {
    "appliedSealId": "as_def456",
    "documentId": "doc_xyz789",
    "sealId": "seal_abc123",
    "organizationName": "Kompania SH.P.K.",
    "certificationHash": "a1b2c3d4...",
    "verificationUrl": "https://www.doc.al/verify/seal/a1b2c3d4..."
  }
}`}
              />
            </div>
          </GuideSection>

          {/* 5. Logo dhe branding */}
          <GuideSection title="Logo dhe branding" icon={Image}>
            <div className="space-y-3">
              <p>Personalizoni pamjen e vules me logon e organizates suaj.</p>
              <ol className="list-inside list-decimal space-y-2">
                <li>Ngarkoni logon ne <strong>Settings &rarr; Organizata &rarr; Logo</strong> (format: PNG, SVG; madhesia: min 200x200px).</li>
                <li>Kur krijoni nje vule te re, logo vendoset automatikisht ne qender te vules.</li>
                <li>Zgjidhni ngjyrat kryesore dhe sekondare te vules.</li>
                <li>Personalizoni tekstin rrethor (p.sh. emri i kompanise) dhe tekstin qendror.</li>
              </ol>
              <div className="mt-3 rounded-xl border border-blue-800 bg-blue-900/20 p-3 text-xs text-blue-300">
                <strong>Formato e rekomanduar:</strong> PNG me sfond transparent, madhesi minimale 200x200 piksele. Logo do te shkallezuhet automatikisht brenda vules.
              </div>
            </div>
          </GuideSection>
        </div>
      </div>

      {/* Rate limits */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Limitet e Thirrjeve (Rate Limits)</h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Plani</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Thirrje API / muaj</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Vula aktive</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Aplikime / muaj</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="px-3 py-2 font-medium text-foreground">PRO</td>
                  <td className="px-3 py-2 text-muted-foreground">5,000</td>
                  <td className="px-3 py-2 text-muted-foreground">3</td>
                  <td className="px-3 py-2 text-muted-foreground">500</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-foreground">ENTERPRISE</td>
                  <td className="px-3 py-2 text-muted-foreground">Pa limit</td>
                  <td className="px-3 py-2 text-muted-foreground">Pa limit</td>
                  <td className="px-3 py-2 text-muted-foreground">Pa limit</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
