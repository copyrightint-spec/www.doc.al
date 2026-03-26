export const metadata = {
  title: "Verifikoni Dokumentin - Kontrolloni Nënshkrimin Digjital",
  description:
    "Verifikoni autenticitetin e çdo dokumenti të nënshkruar me doc.al. Futni hash-in SHA-256 për të kontrolluar nënshkrimin në blockchain.",
  alternates: {
    canonical: "https://www.doc.al/verify",
  },
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
