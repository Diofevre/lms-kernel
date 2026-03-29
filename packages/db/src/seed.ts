import { prisma } from "./client.js";

async function main(): Promise<void> {
  // Dev tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "dev" },
    update: {},
    create: {
      slug: "dev",
      name: "Development Tenant",
      isActive: true,
      keycloakRealm: "kern",
      primaryColor: "#0f172a",
      enabledModules: ["core", "audit", "storage"],
    },
  });

  // Super admin user
  await prisma.tenantUser.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@kern.dev" } },
    update: {},
    create: {
      tenantId: tenant.id,
      keycloakId: "dev-admin-keycloak-id",
      email: "admin@kern.dev",
      username: "admin",
      firstName: "Admin",
      lastName: "Dev",
      roles: ["super_admin"],
    },
  });

  console.log("Seed completed: dev tenant + admin user");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
