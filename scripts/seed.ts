import * as bcrypt from "bcryptjs";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { exit } from "process";
import * as schema from "../src/db/schema";

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not defined in .env file");
  exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const db = drizzle({ client: pool });

async function main() {
  console.log("Starting database seeding...");

  try {
    console.log("Clearing existing data...");
    await db.delete(schema.dealPayments);
    await db.delete(schema.dealPaymentAllocations);
    await db.delete(schema.dealPaymentSchedules);
    await db.delete(schema.dealAuditLogs);
    await db.delete(schema.dealDocuments);
    await db.delete(schema.dealAcceptances);
    await db.delete(schema.dealSettlements);
    await db.delete(schema.dealTaxSnapshots);
    await db.delete(schema.scheduledInstallments);
    await db.delete(schema.installmentAuditLogs);
    await db.delete(schema.paymentLedger);
    await db.delete(schema.purchaseContracts);
    await db.delete(schema.deals);
    await db.delete(schema.purchaseRequests);
    await db.delete(schema.purchaseRequests);
    await db.delete(schema.propertyInstallmentPlans);
    await db.delete(schema.installmentPlanTemplates);
    await db.delete(schema.taxPolicies);
    await db.delete(schema.userBankAccounts);
    await db.delete(schema.propertyOwner);
    await db.delete(schema.transactions);
    await db.delete(schema.leases);
    await db.delete(schema.maintenance);
    await db.delete(schema.propertyImages);
    await db.delete(schema.propertyFeatures);
    await db.delete(schema.addresses);
    await db.delete(schema.activity);
    await db.delete(schema.documents);
    await db.delete(schema.properties);
    await db.delete(schema.users);
    await db.delete(schema.roles);

    // -------------------- Roles ---------------------

    console.log("Seeding roles...");
    const roleValues = [
      "admin",
      "client",
      "property_manager",
      "accountant",
      "owner",
      "tenant",
      "maintenance_staff",
    ].map((role) => ({ role }));

    const roles = await db.insert(schema.roles).values(roleValues).returning();

    console.log(`Seeded ${roles.length} roles`);

    // -------------------- Users ---------------------

    console.log("Seeding users...");

    const hashPassword = await bcrypt.hash("password", 12);

    const userValues = [
      {
        name: "Admin",
        email: "admin@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "admin")!.id,
        phone: "+1234567890",
      },
      {
        name: "John",
        email: "john@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "client")!.id,
        phone: "+1987654321",
      },
      {
        name: "Manager",
        email: "manager@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "property_manager")!.id,
        phone: "+1122334455",
      },
      {
        name: "Accountant",
        email: "accountant@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "accountant")!.id,
        phone: "+1122334455",
      },
      {
        name: "Owner",
        email: "owner@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "owner")!.id,
        phone: "+1122334455",
      },
      {
        name: "Tenant",
        email: "tenant@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "tenant")!.id,
        phone: "+1122334455",
      },
      {
        name: "Maintenance Staff",
        email: "maintenance@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "maintenance_staff")!.id,
        phone: "+1122334455",
      },
    ];
    const users = await db.insert(schema.users).values(userValues).returning();

    console.log(`Seeded ${users.length} users`);

    // -------------------- User Addresses ---------------------

    console.log("Seeding users address...");
    const userAddressValues = users.map((user) => ({
      city: "Lahore",
      state: "punjab" as const,
      street: "none",
      entityId: user.id,
      entityType: "user" as const,
      zipCode: "30333",
    }));

    await db.insert(schema.addresses).values(userAddressValues);

    // -------------------- Properties ---------------------

    console.log("Seeding properties...");
    const propertyValues = [
      {
        title: "Luxury Downtown Apartment",
        description:
          "A beautiful luxury apartment in the heart of the city with modern amenities.",
        type: "apartment" as const,
        status: "available" as const,
        price: "500000",
        monthlyRent: "45000",
        area: 1200,
      },
      {
        title: "Spacious Family House",
        description:
          "A spacious family house with a large backyard perfect for kids and pets.",
        type: "house" as const,
        status: "available" as const,
        price: "750000",
        area: 2500,
      },
      {
        title: "Modern Office Space",
        description:
          "Modern office space in a prime business district with high-speed internet.",
        type: "office" as const,
        status: "leased" as const,
        price: "300000",
        area: 1500,
      },
    ];
    const properties = await db
      .insert(schema.properties)
      .values(propertyValues)
      .returning();

    console.log(`Seeded ${properties.length} properties`);

    // -------------------- Properties Features ---------------------

    console.log("Seeding properties features...");
    const propertyFeaturesValues: (typeof schema.propertyFeatures.$inferInsert)[] =
      properties.flatMap((property) => [
        { propertyId: property.id, feature: "Bed Room", value: "2" },
        { propertyId: property.id, feature: "Bath Room", value: "2" },
        { propertyId: property.id, feature: "Parking", value: "false" },
      ]);

    await db.insert(schema.propertyFeatures).values(propertyFeaturesValues);

    // -------------------- Property Addresses ---------------------

    console.log("Seeding properties addresses...");
    const propertyAddressesValues = properties.map((property) => ({
      city: "Lahore",
      state: "punjab" as const,
      street: "none",
      entityId: property.id,
      entityType: "property" as const,
      zipCode: "30333",
    }));

    await db.insert(schema.addresses).values(propertyAddressesValues);

    // -------------------- Property Owners ---------------------

    console.log("Seeding properties owners...");
    const propertyOwnerValues: (typeof schema.propertyOwner.$inferInsert)[] = [
      {
        propertyId: properties[0].id,
        ownerId: users.find(
          (u) => u.roleId === roles.find((r) => r.role === "owner")!.id,
        )!.id,
        ownershipPercentage: 100,
      },
      {
        propertyId: properties[2].id,
        ownerId: users.find(
          (u) => u.roleId === roles.find((r) => r.role === "owner")!.id,
        )!.id,
        ownershipPercentage: 20,
      },
    ];
    await db.insert(schema.propertyOwner).values(propertyOwnerValues);

    // -------------------- Leases ---------------------

    console.log("Seeding lease...");
    const leaseValues: (typeof schema.leases.$inferInsert)[] = [
      {
        propertyId: properties[2].id,
        tenentId: users.find(
          (u) => u.roleId === roles.find((r) => r.role === "tenant")?.id,
        )?.id,
        deposit: 30000,
        monthlyRent: 3000,
        startDate: "2024-01-16",
      },
    ];

    const leases = await db.insert(schema.leases).values(leaseValues).returning();

    // -------------------- Transactions ---------------------

    console.log("Seeding transactions...");
    const transactionValues: (typeof schema.transactions.$inferInsert)[] = [
      {
        propertyId: properties[2].id,
        status: "paid",
        amount: leases[0].deposit!,
        notes: "Down payment for luxury apartment",
        paymentMethod: "bank_transfer",
        tenentId: users.find(
          (u) => u.roleId === roles.find((r) => r.role === "tenant")?.id,
        )?.id,
      },
    ];
    await db.insert(schema.transactions).values(transactionValues);

    // -------------------- Maintenance ---------------------

    console.log("Seeding maintenance records...");
    const maintenanceValues: (typeof schema.maintenance.$inferInsert)[] = [
      {
        propertyId: properties[2].id,
        title: "Leaky Faucet Repair",
        description: "Fix leaky faucet in the kitchen",
        priority: "medium",
        status: "completed",
        assignedTo: users.find(
          (user) =>
            user.roleId ===
            roles.find((role) => role.role === "maintenance_staff")!.id,
        )!.id,
        estimatedCost: "150",
        actualCost: "120",
        completedDate: "2024-01-16",
      },
      {
        propertyId: properties[2].id,
        title: "Lawn Mowing Service",
        description: "Monthly lawn mowing and maintenance",
        priority: "low",
        status: "in_progress",
        assignedTo: users.find(
          (user) =>
            user.roleId ===
            roles.find((role) => role.role === "maintenance_staff")!.id,
        )!.id,
        estimatedCost: "100",
        actualCost: null,
      },
    ];
    await db.insert(schema.maintenance).values(maintenanceValues);

    // -------------------- Documents ---------------------

    console.log("Seeding documents...");
    const documentValues: (typeof schema.documents.$inferInsert)[] = [
      {
        entityId: properties[2].id,
        entityType: "properties",
        name: "lease_agreement.pdf",
        fileType: "pdf",
        fileSize: 1024,
        fileUrl: "https://example.com/documents/lease_agreement.pdf",
      },
      {
        entityId: properties[1].id,
        entityType: "properties",
        name: "property_photos.zip",
        fileType: "zip",
        fileSize: 5120,
        fileUrl: "https://example.com/documents/property_photos.zip",
      },
    ];
    await db.insert(schema.documents).values(documentValues);

    // -------------------- Activities ---------------------

    console.log("Seeding activities...");
    const activityValues: (typeof schema.activity.$inferInsert)[] = [
      {
        action: "create",
        details: "Created new tenent user",
        entityType: "users",
        entityId: users[5].id,
      },
      {
        action: "create",
        details: "Created luxury downtown apartment",
        entityType: "properties",
        entityId: properties[0].id,
      },
    ];
    await db.insert(schema.activity).values(activityValues);

    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    exit(1);
  } finally {
    await pool.end();
  }
}

main();