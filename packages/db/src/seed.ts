import { PrismaClient, UserRole } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  console.log("🌱 Seeding LMS Kernel database...\n");

  // 1. Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      id: randomUUID(),
      slug: "demo",
      name: "Démonstration LMS",
      isActive: true,
      modules: ["auth", "courses-video"],
      config: {},
    },
  });
  console.log(`✅ Tenant created: ${tenant.name} (${tenant.slug})`);

  // 2. Create consent record (Loi 25 — required before storing PII)
  const consent = await prisma.consent.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      userId: "system-seed",
      categories: ["identity", "contact", "academic"],
      purpose: "Account creation and LMS platform usage",
      givenAt: new Date(),
      ipHash: "seed-no-ip",
    },
  });
  console.log(`✅ Consent created: ${consent.id}`);

  // 3. Create admin user with consent reference
  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: "admin@demo.lms.example.com",
      },
    },
    update: {},
    create: {
      id: randomUUID(),
      tenantId: tenant.id,
      email: "admin@demo.lms.example.com",
      consentId: consent.id,
      roles: [UserRole.ADMIN],
    },
  });
  console.log(`✅ Admin user created: ${adminUser.email}`);

  // Update consent with actual userId
  await prisma.consent.update({
    where: { id: consent.id },
    data: { userId: adminUser.id },
  });

  console.log("\n🎉 Seed completed successfully.");
  console.log(`   Tenant: ${tenant.slug} (${tenant.id})`);
  console.log(`   Admin:  ${adminUser.email} (${adminUser.id})`);
}

seed()
  .catch((e: unknown) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
