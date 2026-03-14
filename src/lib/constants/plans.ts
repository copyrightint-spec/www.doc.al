export interface PlanDefinition {
  name: string;
  label: string;
  description: string;
  billingCycles: {
    monthly: number;  // price in EUR
    yearly: number;   // price in EUR (discounted)
  };
  quotas: {
    maxTimestamps: number;
    maxSignatures: number;
    maxSeals: number;          // seal applications per billing period
    maxSealTemplates: number;  // how many seal templates (definitions) org can create
    maxApiCalls: number;
    maxDocuments: number;
    maxUsers: number;
  };
  features: string[];
  eidasLevel: "BASIC" | "ADVANCED" | "QUALIFIED";
  etsiCompliance: string[];
  sealTypes: string[];
  supportLevel: string;
  sla: string;
}

export const PLANS: Record<string, PlanDefinition> = {
  FREE: {
    name: "FREE",
    label: "Free",
    description: "Per individe dhe testim",
    billingCycles: { monthly: 0, yearly: 0 },
    quotas: {
      maxTimestamps: 50,
      maxSignatures: 10,
      maxSeals: 0,
      maxSealTemplates: 0,
      maxApiCalls: 100,
      maxDocuments: 25,
      maxUsers: 1,
    },
    features: [
      "Nenshkrime elektronike bazike",
      "Timestamp server DOC.AL",
      "Verifikim dokumentash",
      "1 perdorues",
    ],
    eidasLevel: "BASIC",
    etsiCompliance: ["ETSI EN 319 421"],
    sealTypes: [],
    supportLevel: "Community",
    sla: "N/A",
  },
  PRO: {
    name: "PRO",
    label: "Professional",
    description: "Per biznese te vogla dhe mesme",
    billingCycles: { monthly: 29, yearly: 290 },
    quotas: {
      maxTimestamps: 500,
      maxSignatures: 100,
      maxSeals: 25,
      maxSealTemplates: 3,
      maxApiCalls: 5000,
      maxDocuments: 500,
      maxUsers: 10,
    },
    features: [
      "Nenshkrime te avancuara elektronike (AdES)",
      "Timestamp server DOC.AL + OpenTimestamps/Bitcoin",
      "Vula dixhitale e kompanise",
      "API akses i plote",
      "Certifikata X.509 organizative",
      "Template nenshkrimesh",
      "Deri ne 10 perdorues",
      "Eksport PKCS#12",
    ],
    eidasLevel: "ADVANCED",
    etsiCompliance: ["ETSI EN 319 421", "ETSI EN 319 411-1", "ETSI EN 319 122-1"],
    sealTypes: ["COMPANY_SEAL", "INVOICE_SEAL"],
    supportLevel: "Email (24h response)",
    sla: "99.5% uptime",
  },
  ENTERPRISE: {
    name: "ENTERPRISE",
    label: "Enterprise",
    description: "Per organizata te medha dhe institucione",
    billingCycles: { monthly: 199, yearly: 1990 },
    quotas: {
      maxTimestamps: 10000,
      maxSignatures: 2000,
      maxSeals: 500,
      maxSealTemplates: 20,
      maxApiCalls: 100000,
      maxDocuments: 10000,
      maxUsers: 100,
    },
    features: [
      "Nenshkrime te kualifikuara elektronike (QES)",
      "Dual timestamp: Server DOC.AL + OpenTimestamps/Bitcoin",
      "Vula zyrtare dixhitale (eIDAS eSeal)",
      "API i pakufizuar (me rate limit)",
      "Certifikata X.509 te kualifikuara",
      "White-label branding",
      "Webhook integrime",
      "SSO / SAML integration",
      "Custom template builder",
      "Deri ne 100 perdorues",
      "Audit log i avancuar",
      "Eksport PKCS#12 & PEM",
      "Custom compliance reports",
      "Dedicated account manager",
    ],
    eidasLevel: "QUALIFIED",
    etsiCompliance: [
      "ETSI EN 319 421",    // Policy for TSP providing time-stamping services
      "ETSI EN 319 411-1",  // Policy for TSP issuing certificates - General
      "ETSI EN 319 411-2",  // Policy for TSP issuing QC certificates
      "ETSI EN 319 122-1",  // CAdES digital signatures
      "ETSI EN 319 132-1",  // XAdES digital signatures
      "ETSI EN 319 142-1",  // PAdES digital signatures
      "ETSI EN 319 521",    // Policy for electronic registered delivery services
    ],
    sealTypes: ["COMPANY_SEAL", "OFFICIAL_STAMP", "INVOICE_SEAL", "CUSTOM"],
    supportLevel: "Priority (4h response) + Dedicated manager",
    sla: "99.9% uptime",
  },
};

// Seal status display
export const SEAL_STATUS: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "destructive" | "purple" }> = {
  ACTIVE: { label: "Aktive", variant: "success" },
  INACTIVE: { label: "Joaktive", variant: "default" },
  EXPIRED: { label: "Skaduar", variant: "warning" },
  REVOKED: { label: "Revokuar", variant: "destructive" },
};

export const SEAL_TYPE_LABELS: Record<string, string> = {
  COMPANY_SEAL: "Vula e Kompanise",
  OFFICIAL_STAMP: "Vula Zyrtare",
  INVOICE_SEAL: "Vula Faturash",
  CUSTOM: "Custom",
};

export const EIDAS_LEVELS: Record<string, { label: string; description: string; color: string }> = {
  BASIC: { label: "Baze", description: "Nenshkrim elektronik baze (SES)", color: "text-slate-500" },
  ADVANCED: { label: "I Avancuar", description: "Nenshkrim elektronik i avancuar (AdES)", color: "text-blue-500" },
  QUALIFIED: { label: "I Kualifikuar", description: "Nenshkrim elektronik i kualifikuar (QES)", color: "text-green-500" },
};
