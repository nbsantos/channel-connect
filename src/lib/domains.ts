const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

export function emailDomain(email: string) {
  const parts = email.toLowerCase().trim().split("@");
  return parts.length === 2 ? parts[1] : "";
}

export function isWorkEmail(email: string) {
  const domain = emailDomain(email);
  return domain.length > 0 && !FREE_EMAIL_DOMAINS.has(domain);
}

export function isLinkedInProfileUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("linkedin.com") && parsed.pathname.includes("/in/");
  } catch {
    return false;
  }
}
