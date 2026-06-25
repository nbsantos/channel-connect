import { CompanyType } from "@prisma/client";

export function homePathForCompanyType(type: CompanyType) {
  return type === "vendor" ? "/vendor" : "/reseller";
}

export function formatDealStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function companyTypeLabel(type: CompanyType) {
  return type === "vendor" ? "Vendor" : "Reseller";
}
