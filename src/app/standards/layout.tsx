export const metadata = {
  title: "Standardet - eIDAS, ETSI, PAdES, Blockchain",
  description:
    "Standardet ndërkombëtare që doc.al zbaton: eIDAS (BE) Nr. 910/2014, ETSI EN 319 142, PAdES, SHA-256, Polygon blockchain, dhe IPFS për nënshkrime digjitale.",
  alternates: {
    canonical: "https://www.doc.al/standards",
  },
};

export default function StandardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
