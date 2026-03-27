import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.doc.al"),
  title: {
    default:
      "doc.al — Nënshkrime Digjitale Falas | Firma Elektronike në Shqipëri",
    template: "%s | doc.al",
  },
  description:
    "Platforma #1 në Shqipëri për nënshkrime digjitale falas. Nënshkruani dokumente online me certifikatë eIDAS, blockchain Polygon, dhe IPFS. Siguri maksimale, falas përgjithmonë.",
  keywords: [
    "nënshkrim elektronik",
    "nënshkrim digjital",
    "firma elektronike",
    "nënshkrim online",
    "dokument digjital",
    "eIDAS shqipëri",
    "certifikatë digjitale",
    "nënshkrim falas",
    "firma digjitale falas",
    "digital signature albania",
    "electronic signature",
    "e-signature albania",
    "nënshkrim dokumentesh",
    "vërtetim dokumenti",
    "blockchain timestamp",
    "nënshkrim i sigurt",
    "doc.al",
    "copyright shpk",
    "polygon blockchain",
    "IPFS",
    "STAMLES",
    "PAdES",
    "ETSI",
    "nënshkrim me certifikatë",
    "verifikim dokumenti online",
  ],
  authors: [{ name: "COPYRIGHT sh.p.k", url: "https://copyright.al" }],
  creator: "COPYRIGHT sh.p.k",
  publisher: "doc.al",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  openGraph: {
    type: "website",
    locale: "sq_AL",
    url: "https://www.doc.al",
    siteName: "doc.al",
    title: "doc.al — Nënshkrime Digjitale Falas në Shqipëri",
    description:
      "Nënshkruani dokumente online me certifikatë eIDAS, blockchain Polygon, dhe IPFS. 100% falas.",
    images: [
      { url: "/api/logo", width: 200, height: 200, alt: "doc.al logo" },
    ],
  },
  twitter: {
    card: "summary",
    title: "doc.al — Nënshkrime Digjitale Falas",
    description: "Platforma #1 për nënshkrime elektronike në Shqipëri",
  },
  alternates: {
    canonical: "https://www.doc.al",
  },
  verification: {},
  category: "technology",
  icons: {
    icon: "/api/logo",
    apple: "/api/logo",
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "doc.al",
  legalName: "COPYRIGHT sh.p.k",
  url: "https://www.doc.al",
  logo: "https://www.doc.al/api/logo",
  description: "Platforma e nënshkrimeve digjitale në Shqipëri",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Bulevardi Zogu i Pare, 1016, PO.Box 55",
    addressLocality: "Tiranë",
    addressCountry: "AL",
  },
  sameAs: ["https://copyright.al"],
  foundingDate: "2026",
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@doc.al",
    contactType: "customer service",
  },
};

const appSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "doc.al",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  description:
    "Nënshkrime digjitale falas me certifikatë eIDAS dhe blockchain Polygon",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
  },
};

const siteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "doc.al",
  url: "https://www.doc.al",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://www.doc.al/verify?hash={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "A është falas nënshkrimi digjital me doc.al?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Po, doc.al ofron nënshkrime digjitale 100% falas për individë. Plani bazë përfshin nënshkrime të pakufizuara me certifikatë eIDAS.",
      },
    },
    {
      "@type": "Question",
      name: "A ka vlefshmëri ligjore nënshkrimi elektronik në Shqipëri?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Po, nënshkrimet elektronike kanë vlefshmëri ligjore sipas Ligjit Nr. 9880/2008 dhe Rregullores eIDAS (BE) Nr. 910/2014.",
      },
    },
    {
      "@type": "Question",
      name: "Si funksionon verifikimi i dokumenteve?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Çdo dokument i nënshkruar ka QR kod dhe hash SHA-256. Skanoni QR kodin ose futni hash-in në www.doc.al/verify për të verifikuar autenticitetin.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-TD5Q887P');`,
          }}
        />
        {/* Google Analytics (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-LGLR5EW3X4" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-LGLR5EW3X4');`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-TD5Q887P"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
