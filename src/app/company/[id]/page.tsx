import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { companyTypeLabel } from "@/lib/utils";
import { CompanyContentForm } from "./content-form";
import { CompanyEditForm } from "./edit-form";
import { TeamInviteForm } from "./team-invite-form";
import { DomainManageForm } from "./domain-manage-form";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, name: true, title: true, email: true, isCompanyAdmin: true } },
      content: { orderBy: { createdAt: "desc" } },
      useCases: true,
      domains: { orderBy: { domain: "asc" } },
    },
  });

  if (!company) notFound();

  const isAdmin = user.companyId === company.id && user.isCompanyAdmin;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Badge>{companyTypeLabel(company.type)}</Badge>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{company.name}</h1>
          {company.description && <p className="mt-2 text-slate-600">{company.description}</p>}
          {company.website && (
            <a href={company.website} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-brand hover:underline">
              {company.website}
            </a>
          )}
          {company.linkedInVerified && (
            <p className="mt-1 text-xs text-emerald-400">LinkedIn verified</p>
          )}
        </div>
      </div>

      {isAdmin && company.type !== "individual" && (
        <Card title="Authorized email domains">
          <DomainManageForm companyId={company.id} initialDomains={company.domains} />
        </Card>
      )}

      {isAdmin && (
        <Card title="Edit company profile">
          <CompanyEditForm
            company={{
              id: company.id,
              name: company.name,
              description: company.description ?? "",
              website: company.website ?? "",
            }}
          />
        </Card>
      )}

      <Card title="Team members">
        <ul className="divide-y divide-navy-border">
          {company.users.map((u) => (
            <li key={u.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-slate-900">{u.name}</p>
                <p className="text-sm text-slate-500">{u.title ?? u.email}</p>
              </div>
              {u.isCompanyAdmin && <Badge>Admin</Badge>}
            </li>
          ))}
        </ul>
      </Card>

      {isAdmin && (
        <Card title="Add team member">
          <TeamInviteForm companyId={company.id} />
        </Card>
      )}

      {company.type === "vendor" && (
        <>
          <Card title="Partner portal content">
            {company.content.length === 0 ? (
              <p className="text-sm text-slate-500">No content published yet.</p>
            ) : (
              <ul className="divide-y divide-navy-border">
                {company.content.map((c) => (
                  <li key={c.id} className="py-3">
                    <div className="flex items-center gap-2">
                      <Badge>{c.type}</Badge>
                      <a href={c.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                        {c.title}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {isAdmin && (
            <Card title="Add partner content">
              <CompanyContentForm companyId={company.id} />
            </Card>
          )}

          {company.useCases.length > 0 && (
            <Card title="Use cases">
              <div className="flex flex-wrap gap-2">
                {company.useCases.map((uc) => (
                  <Badge key={uc.id}>{uc.tag}</Badge>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
