import {
  Home,
  FileSignature,
  LayoutTemplate,
  Zap,
  Stamp,
  User,
  PenTool,
  CreditCard,
  Lock,
  LayoutDashboard,
  Users,
  Building2,
  FileText,
  FileCheck,
  Shield,
  Clock,
  Mail,
  Send,
  ScrollText,
  Scale,
  KeyRound,
  Search,
  type LucideIcon,
} from "lucide-react";

export interface NavChild {
  href: string;
  label: string;
}

export interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  children?: NavChild[];
  badgeKey?: string; // key to match against notification counts (e.g., "contacts")
}

export const dashboardNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  {
    label: "eSign",
    icon: PenTool,
    children: [
      { href: "/dashboard/contracts/self-sign", label: "Nenshkruaj Dokument" },
      { href: "/dashboard/contracts/new", label: "Krijo Marreveshje" },
    ],
  },
  { href: "/dashboard/documents", label: "Dokumentat", icon: FileText },
  { href: "/dashboard/templates", label: "Shabllonet", icon: LayoutTemplate },
  { href: "/dashboard/seals", label: "Vulat Dixhitale", icon: Stamp },
  { href: "/explorer", label: "Explorer", icon: Search },
];

export const settingsNav: NavItem[] = [
  { href: "/settings/profile", label: "Profili im", icon: User },
  { href: "/settings/signature", label: "Nenshkrimi im", icon: PenTool },
  { href: "/settings/kyc", label: "Verifikimi KYC", icon: CreditCard },
  { href: "/settings/security", label: "Siguria", icon: Lock },
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Perdoruesit", icon: Users },
  { href: "/admin/kyc", label: "Verifikimi KYC", icon: CreditCard },
  { href: "/admin/organizations", label: "Organizata", icon: Building2 },
  { href: "/admin/documents", label: "Dokumenta", icon: FileText },
  { href: "/admin/contracts", label: "Kontrata", icon: FileCheck },
  { href: "/admin/legal-bases", label: "Bazat Ligjore", icon: Scale },
  { href: "/admin/certificates", label: "Certifikata", icon: Shield },
  { href: "/admin/ca", label: "Autoriteti CA", icon: KeyRound },
  { href: "/admin/timestamps", label: "Timestamps", icon: Clock },
  { href: "/admin/seals", label: "Vulat Dixhitale", icon: Stamp },
  { href: "/admin/contacts", label: "Kontakte", icon: Mail, badgeKey: "contacts" },
  { href: "/admin/emails", label: "Emailet", icon: Send },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
];
