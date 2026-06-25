import { prisma } from "./prisma";

export const DEFAULT_DEAL_FEE_CENTS = 50000;

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function currentBillingPeriod() {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { periodStart, periodEnd };
}

export async function getOrCreateDraftInvoice(vendorId: string) {
  const { periodStart, periodEnd } = currentBillingPeriod();

  return prisma.invoice.upsert({
    where: {
      vendorId_periodStart: { vendorId, periodStart },
    },
    create: {
      vendorId,
      periodStart,
      periodEnd,
      status: "draft",
      totalCents: 0,
    },
    update: {},
    include: { lineItems: { include: { deal: true } } },
  });
}

export async function recordBillableDeal(dealId: string) {
  const deal = await prisma.dealRegistration.findUnique({
    where: { id: dealId },
    include: { vendor: true, invoiceLineItem: true },
  });

  if (!deal || deal.initiator !== "vendor" || deal.status !== "approved" || deal.invoiceLineItem) {
    return null;
  }

  const amountCents = deal.vendor.dealRegistrationFeeCents;
  const invoice = await getOrCreateDraftInvoice(deal.vendorId);

  const lineItem = await prisma.invoiceLineItem.create({
    data: {
      invoiceId: invoice.id,
      dealId: deal.id,
      amountCents,
    },
  });

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { totalCents: { increment: amountCents } },
  });

  return lineItem;
}

export async function signVendorContract(vendorId: string, billingEmail?: string) {
  return prisma.company.update({
    where: { id: vendorId },
    data: {
      contractSignedAt: new Date(),
      billingEmail: billingEmail || undefined,
    },
  });
}
