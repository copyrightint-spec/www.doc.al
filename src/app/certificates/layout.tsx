export const metadata = {
  title: "Certifikatat Digjitale - Autoriteti Certifikues doc.al",
  description:
    "Shikoni certifikatat digjitale të lëshuara nga doc.al. Certifikata eIDAS për nënshkrime elektronike të avancuara dhe të kualifikuara në Shqipëri.",
  alternates: {
    canonical: "https://www.doc.al/certificates",
  },
};

export default function CertificatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
