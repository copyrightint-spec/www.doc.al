export const metadata = {
  title: "Na Kontaktoni - doc.al Nënshkrime Digjitale",
  description:
    "Kontaktoni ekipin e doc.al për pyetje rreth nënshkrimeve digjitale, certifikatave eIDAS, dhe shërbimeve tona në Shqipëri. COPYRIGHT sh.p.k, Tiranë.",
  alternates: {
    canonical: "https://www.doc.al/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
