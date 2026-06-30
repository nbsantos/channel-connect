import { CompanyType } from "@prisma/client";

export function homePathForCompanyType(type: CompanyType) {
  if (type === "vendor") return "/vendor";
  if (type === "reseller") return "/reseller";
  return "/home";
}

export function homePathForUser(user: {
  company: { type: CompanyType; contractSignedAt: Date | null; annualFeePaidAt: Date | null };
  isCompanyAdmin: boolean;
}) {
  if (user.company.type === "vendor" && user.isCompanyAdmin) {
    if (!user.company.annualFeePaidAt || !user.company.contractSignedAt) {
      return "/vendor/onboarding";
    }
  }
  return homePathForCompanyType(user.company.type);
}

export function formatDealStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function companyTypeLabel(type: CompanyType) {
  if (type === "vendor") return "Vendor";
  if (type === "reseller") return "Reseller";
  return "Individual";
}
