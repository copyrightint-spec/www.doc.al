import {
  Upload,
  Mail,
  PenTool,
  Shield,
  Eye,
  Clock,
  CreditCard,
  FileText,
  CheckCircle,
  Send,
  Info,
  type LucideIcon,
} from "lucide-react";

// Document status → Badge variant mapping
export const DOCUMENT_STATUS: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" | "purple" }> = {
  DRAFT: { label: "Draft", variant: "default" },
  PENDING_SIGNATURE: { label: "Ne Pritje", variant: "warning" },
  PARTIALLY_SIGNED: { label: "Pjeserisht", variant: "info" },
  COMPLETED: { label: "Perfunduar", variant: "success" },
  ARCHIVED: { label: "Arkivuar", variant: "default" },
};

// Contract status → Badge variant mapping
export const CONTRACT_STATUS: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" | "purple" }> = {
  PENDING: { label: "Ne Pritje", variant: "warning" },
  SENT: { label: "Derguar", variant: "info" },
  SIGNED: { label: "Nenshkruar", variant: "success" },
  EXPIRED: { label: "Skaduar", variant: "destructive" },
  REJECTED: { label: "Refuzuar", variant: "destructive" },
  CANCELLED: { label: "Anulluar", variant: "default" },
  ARCHIVED: { label: "Arkivuar", variant: "default" },
};

// Signature status → Badge variant mapping
export const SIGNATURE_STATUS: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" | "purple" }> = {
  PENDING: { label: "Ne Pritje", variant: "warning" },
  SIGNED: { label: "Nenshkruar", variant: "success" },
  REJECTED: { label: "Refuzuar", variant: "destructive" },
  EXPIRED: { label: "Skaduar", variant: "destructive" },
};

// KYC status → Badge variant
export const KYC_STATUS: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" | "purple" }> = {
  PENDING: { label: "Ne Pritje", variant: "warning" },
  SUBMITTED: { label: "Dorezuar", variant: "info" },
  VERIFIED: { label: "Verifikuar", variant: "success" },
  REJECTED: { label: "Refuzuar", variant: "destructive" },
};

// User roles → Badge variant
export const ROLE_BADGE: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" | "purple" }> = {
  USER: { label: "User", variant: "default" },
  ADMIN: { label: "Admin", variant: "purple" },
  SUPER_ADMIN: { label: "Super Admin", variant: "destructive" },
  ORGANIZATION_ADMIN: { label: "Org Admin", variant: "info" },
};

// Audit action icons and labels
export const ACTION_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  DOCUMENT_UPLOADED: { icon: Upload, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", label: "Dokument i ngarkuar" },
  SIGNATURE_REQUESTED: { icon: Mail, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", label: "Kerkese per nenshkrim" },
  DOCUMENT_SIGNED: { icon: PenTool, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", label: "Dokument i nenshkruar" },
  CERTIFICATE_GENERATED: { icon: Shield, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", label: "Certifikate e gjeneruar" },
  DOCUMENT_VIEWED: { icon: Eye, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800", label: "Dokument i pare" },
  TIMESTAMP_CREATED: { icon: Clock, color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", label: "Timestamp i krijuar" },
  KYC_SUBMITTED: { icon: CreditCard, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", label: "KYC e dorezuar" },
  SIGNING_REQUEST_CREATED: { icon: Send, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30", label: "Kerkese nenshkrimi e krijuar" },
  SIGNING_REQUEST_COMPLETED: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/30", label: "Kerkese nenshkrimi e perfunduar" },
  DOCUMENT_CREATED: { icon: FileText, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800", label: "Dokument i krijuar" },
};

// Default action config for unknown actions
export const DEFAULT_ACTION_CONFIG = {
  icon: Info,
  color: "text-slate-500",
  bg: "bg-slate-100 dark:bg-slate-800",
};
