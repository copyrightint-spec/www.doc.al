export const metadata = {
  title: "Kushtet e Përdorimit - Termat dhe Kushtet",
  description:
    "Kushtet e përdorimit të platformës doc.al për nënshkrime digjitale. Informacion ligjor, politika e privatësisë, dhe të drejtat e përdoruesit.",
  alternates: {
    canonical: "https://www.doc.al/terms",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
