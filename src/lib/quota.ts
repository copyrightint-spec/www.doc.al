import { prisma } from "@/lib/db";
import { PLANS } from "@/lib/constants/plans";

export type QuotaType = "timestamps" | "signatures" | "seals" | "apiCalls" | "documents";

interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  plan: string;
  billingCycle: string;
  periodEnd: Date;
}

/**
 * Get or create the current billing period quota for an organization
 */
export async function getCurrentQuota(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true, billingCycle: true, customQuotas: true },
  });

  if (!org) throw new Error("Organizata nuk u gjet");

  const now = new Date();
  const billingCycle = org.billingCycle || "MONTHLY";

  // Calculate period start/end
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = billingCycle === "YEARLY"
    ? new Date(now.getFullYear() + 1, 0, 1)
    : new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Get or create quota record
  let quota = await prisma.planQuota.findFirst({
    where: {
      organizationId,
      periodStart: { lte: now },
      periodEnd: { gt: now },
    },
  });

  if (!quota) {
    const planDef = PLANS[org.plan] || PLANS.FREE;
    const customQuotas = org.customQuotas as Record<string, number> | null;

    quota = await prisma.planQuota.create({
      data: {
        organizationId,
        periodStart,
        periodEnd,
        billingCycle,
        maxTimestamps: customQuotas?.maxTimestamps ?? planDef.quotas.maxTimestamps,
        maxSignatures: customQuotas?.maxSignatures ?? planDef.quotas.maxSignatures,
        maxSeals: customQuotas?.maxSeals ?? planDef.quotas.maxSeals,
        maxSealTemplates: customQuotas?.maxSealTemplates ?? planDef.quotas.maxSealTemplates,
        maxApiCalls: customQuotas?.maxApiCalls ?? planDef.quotas.maxApiCalls,
        maxDocuments: customQuotas?.maxDocuments ?? planDef.quotas.maxDocuments,
        maxUsers: customQuotas?.maxUsers ?? planDef.quotas.maxUsers,
      },
    });
  }

  return { quota, plan: org.plan, billingCycle };
}

/**
 * Check if an organization has remaining quota for a specific resource type
 */
export async function checkQuota(
  organizationId: string,
  type: QuotaType
): Promise<QuotaCheckResult> {
  const { quota, plan, billingCycle } = await getCurrentQuota(organizationId);

  const fieldMap: Record<QuotaType, { used: string; max: string }> = {
    timestamps: { used: "usedTimestamps", max: "maxTimestamps" },
    signatures: { used: "usedSignatures", max: "maxSignatures" },
    seals: { used: "usedSeals", max: "maxSeals" },
    apiCalls: { used: "usedApiCalls", max: "maxApiCalls" },
    documents: { used: "usedDocuments", max: "maxDocuments" },
  };

  const field = fieldMap[type];
  const current = quota[field.used as keyof typeof quota] as number;
  const limit = quota[field.max as keyof typeof quota] as number;

  return {
    allowed: current < limit,
    current,
    limit,
    remaining: Math.max(0, limit - current),
    plan,
    billingCycle,
    periodEnd: quota.periodEnd,
  };
}

/**
 * Increment usage counter for a quota type
 */
export async function incrementQuota(
  organizationId: string,
  type: QuotaType,
  amount: number = 1
): Promise<void> {
  const { quota } = await getCurrentQuota(organizationId);

  const fieldMap: Record<QuotaType, string> = {
    timestamps: "usedTimestamps",
    signatures: "usedSignatures",
    seals: "usedSeals",
    apiCalls: "usedApiCalls",
    documents: "usedDocuments",
  };

  await prisma.planQuota.update({
    where: { id: quota.id },
    data: {
      [fieldMap[type]]: { increment: amount },
    },
  });
}

/**
 * Get quota usage summary for an organization
 */
export async function getQuotaSummary(organizationId: string) {
  const { quota, plan, billingCycle } = await getCurrentQuota(organizationId);
  const planDef = PLANS[plan] || PLANS.FREE;

  return {
    plan: {
      name: plan,
      label: planDef.label,
      eidasLevel: planDef.eidasLevel,
      billingCycle,
    },
    period: {
      start: quota.periodStart,
      end: quota.periodEnd,
    },
    usage: {
      timestamps: { used: quota.usedTimestamps, limit: quota.maxTimestamps, pct: Math.round((quota.usedTimestamps / quota.maxTimestamps) * 100) },
      signatures: { used: quota.usedSignatures, limit: quota.maxSignatures, pct: Math.round((quota.usedSignatures / quota.maxSignatures) * 100) },
      seals: { used: quota.usedSeals, limit: quota.maxSeals, pct: quota.maxSeals > 0 ? Math.round((quota.usedSeals / quota.maxSeals) * 100) : 0 },
      apiCalls: { used: quota.usedApiCalls, limit: quota.maxApiCalls, pct: Math.round((quota.usedApiCalls / quota.maxApiCalls) * 100) },
      documents: { used: quota.usedDocuments, limit: quota.maxDocuments, pct: Math.round((quota.usedDocuments / quota.maxDocuments) * 100) },
    },
    features: planDef.features,
    etsiCompliance: planDef.etsiCompliance,
    sealTypes: planDef.sealTypes,
  };
}
