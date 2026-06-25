import { getCurrentUser } from "@/lib/auth";
import { NavClient } from "./nav-client";

export async function Nav() {
  const user = await getCurrentUser();
  return (
    <NavClient
      user={
        user
          ? {
              name: user.name,
              companyId: user.companyId,
              companyType: user.company.type,
              isCompanyAdmin: user.isCompanyAdmin,
            }
          : null
      }
    />
  );
}
