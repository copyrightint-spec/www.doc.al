export const metadata = {
  title: "Explorer - Zinxhiri Publik i Nënshkrimeve",
  description:
    "Eksploroni zinxhirin publik të nënshkrimeve digjitale. Verifikoni çdo dokument me hash SHA-256 në blockchain Polygon.",
  alternates: {
    canonical: "https://www.doc.al/explorer",
  },
};

export default function ExplorerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
