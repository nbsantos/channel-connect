import { PrismaClient, CompanyType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.partnership.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.watchedAccount.deleteMany();
  await prisma.dealRegistration.deleteMany();
  await prisma.customerAccount.deleteMany();
  await prisma.companyContent.deleteMany();
  await prisma.useCaseTag.deleteMany();
  await prisma.companyDomain.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  const linkedInUrl = "https://www.linkedin.com/in/example";

  const ionix = await prisma.company.create({
    data: {
      name: "Ionix",
      type: CompanyType.vendor,
      description: "Cloud security and compliance platform for enterprise workloads.",
      website: "https://ionix.io",
      linkedInUrl,
      linkedInVerified: true,
      inSecuritySpace: true,
      annualFeePaidAt: new Date(),
      contractSignedAt: new Date(),
      billingEmail: "vendor@ionix.io",
      domains: { create: { domain: "ionix.io" } },
      useCases: {
        create: [
          { tag: "cloud security" },
          { tag: "compliance" },
          { tag: "Mythos remediation" },
        ],
      },
      content: {
        create: [
          { type: "video", title: "Ionix Platform Overview", url: "https://example.com/ionix-overview" },
          { type: "whitepaper", title: "Enterprise Cloud Security Guide", url: "https://example.com/whitepaper" },
        ],
      },
    },
  });

  const guidepoint = await prisma.company.create({
    data: {
      name: "Guidepoint",
      type: CompanyType.reseller,
      description: "Global technology reseller and solutions provider.",
      website: "https://guidepoint.com",
      linkedInUrl,
      linkedInVerified: true,
      domains: { create: { domain: "guidepoint.com" } },
    },
  });

  await prisma.partnership.create({
    data: {
      vendorId: ionix.id,
      resellerId: guidepoint.id,
      status: "approved",
      requestedBy: "vendor",
      signedAt: new Date(),
    },
  });

  const vendorUser = await prisma.user.create({
    data: {
      email: "vendor@ionix.io",
      passwordHash,
      name: "Nelson Santos",
      title: "Channel Manager",
      location: "New York, NY",
      linkedInUrl,
      linkedInVerified: true,
      isCompanyAdmin: true,
      companyId: ionix.id,
    },
  });

  const resellerAdmin = await prisma.user.create({
    data: {
      email: "admin@guidepoint.com",
      passwordHash,
      name: "Alex Morgan",
      title: "Strategic Alliance Lead",
      location: "Boston, MA",
      linkedInUrl,
      linkedInVerified: true,
      isCompanyAdmin: true,
      companyId: guidepoint.id,
    },
  });

  const resellerRep = await prisma.user.create({
    data: {
      email: "rep@guidepoint.com",
      passwordHash,
      name: "Jordan Lee",
      title: "Account Executive",
      location: "Chicago, IL",
      linkedInUrl,
      linkedInVerified: true,
      isCompanyAdmin: false,
      companyId: guidepoint.id,
    },
  });

  const accounts = await Promise.all([
    prisma.customerAccount.create({
      data: {
        accountName: "Mythos Corp",
        industry: "Financial Services",
        useCase: "cloud security and Mythos remediation",
        resellerId: guidepoint.id,
        repId: resellerRep.id,
      },
    }),
    prisma.customerAccount.create({
      data: {
        accountName: "Acme Healthcare",
        industry: "Healthcare",
        useCase: "HIPAA compliance",
        resellerId: guidepoint.id,
        repId: resellerRep.id,
      },
    }),
    prisma.customerAccount.create({
      data: {
        accountName: "Northwind Logistics",
        industry: "Transportation",
        useCase: "supply chain security",
        resellerId: guidepoint.id,
        repId: resellerAdmin.id,
      },
    }),
  ]);

  const deal = await prisma.dealRegistration.create({
    data: {
      title: "Mythos Corp - Ionix Security Assessment",
      description: "Vendor-initiated opportunity for cloud security assessment at Mythos Corp.",
      initiator: "vendor",
      status: "pending",
      vendorId: ionix.id,
      resellerId: guidepoint.id,
      accountId: accounts[0].id,
      initiatorId: vendorUser.id,
      assigneeId: resellerRep.id,
    },
  });

  await prisma.notification.create({
    data: {
      userId: resellerRep.id,
      title: "New deal registration",
      body: `Nelson Santos registered "${deal.title}" for your review.`,
    },
  });

  console.log("Seed complete.");
  console.log("Vendor login: vendor@ionix.io / password123");
  console.log("Reseller admin: admin@guidepoint.com / password123");
  console.log("Reseller rep: rep@guidepoint.com / password123");
  console.log("Individual (no company): use register with a work email whose domain is not ionix.io or guidepoint.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
