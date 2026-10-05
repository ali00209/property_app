import * as bcrypt from "bcryptjs";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { exit } from "process";
import * as schema from "../src/db/schema";
import { getDatabaseUrl } from "@/lib/utils";

config();

const DATABASE_URL = getDatabaseUrl();

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
    await db.delete(schema.dealPaymentAllocations);
    await db.delete(schema.dealPaymentSchedules);
    await db.delete(schema.dealTaxSnapshots);
    await db.delete(schema.dealSettlements);
    await db.delete(schema.dealAcceptances);
    await db.delete(schema.dealSaleDetails);
    await db.delete(schema.dealLeaseDetails);
    await db.delete(schema.dealInstallmentDetails);
    await db.delete(schema.deals);
    await db.delete(schema.dealPayments);
    await db.delete(schema.propertyOwner);
    await db.delete(schema.propertyImages);
    await db.delete(schema.propertyFeatures);
    await db.delete(schema.addresses);
    await db.delete(schema.documents);
    await db.delete(schema.activity);
    await db.delete(schema.properties);
    await db.delete(schema.units);
    await db.delete(schema.societySectors);
    await db.delete(schema.societies);
    await db.delete(schema.cities);
    await db.delete(schema.taxPolicies);
    await db.delete(schema.maintenance);
    await db.delete(schema.userBankAccounts);
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
        phone: "+921234567890",
      },
      {
        name: "John",
        email: "john@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "client")!.id,
        phone: "+921987654321",
      },
      {
        name: "Manager",
        email: "manager@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "property_manager")!.id,
        phone: "+921122334455",
      },
      {
        name: "Accountant",
        email: "accountant@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "accountant")!.id,
        phone: "+921122334456",
      },
      {
        name: "Owner",
        email: "owner@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "owner")!.id,
        phone: "+921122334457",
      },
      {
        name: "Tenant",
        email: "tenant@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "tenant")!.id,
        phone: "+921122334458",
      },
      {
        name: "Maintenance Staff",
        email: "maintenance@gmail.com",
        password: hashPassword,
        roleId: roles.find((r) => r.role === "maintenance_staff")!.id,
        phone: "+921122334459",
      },
    ];
    const users = await db.insert(schema.users).values(userValues).returning();

    console.log(`Seeded ${users.length} users`);

    // -------------------- User Addresses ---------------------

    console.log("Seeding users address...");
    const userAddressValues = users.map((user) => ({
      city: "Islamabad",
      state: "federal" as const,
      street: "none",
      entityId: user.id,
      entityType: "user" as const,
      zipCode: "46000",
    }));

    await db.insert(schema.addresses).values(userAddressValues);

    // -------------------- Geo chain (city → society → sector → unit) ---------------------

    console.log("Seeding geo chain...");
    const [city] = await db
      .insert(schema.cities)
      .values({
        name: "Islamabad",
        slug: "islamabad",
        province: "federal",
        centerPoint: "POINT(73.0479 33.6844)",
      })
      .returning();

    const [society] = await db
      .insert(schema.societies)
      .values({
        cityId: city.id,
        name: "Bahria Enclave",
        slug: "bahria-enclave",
        kind: "housing_society",
        isActive: true,
        boundary:
          "POLYGON((73.04 33.68, 73.06 33.68, 73.06 33.70, 73.04 33.70, 73.04 33.68))",
      })
      .returning();

    const [sector] = await db
      .insert(schema.societySectors)
      .values({ societyId: society.id, name: "Sector C" })
      .returning();

    const [unit] = await db
      .insert(schema.units)
      .values({
        sectorId: sector.id,
        unitNumber: "C-105",
        streetNumber: "7",
        centroid: "POINT(73.0520 33.6885)",
        areaValue: "500",
        areaUnit: "sqyd",
        type: "residential",
      })
      .returning();

    const adminId = users.find(
      (u) => u.roleId === roles.find((r) => r.role === "admin")!.id,
    )!.id;

    // -------------------- Properties ---------------------

    console.log("Seeding properties...");
    const propertyValues = [
      {
        title: "Luxury Downtown Apartment",
        slug: "luxury-downtown-apartment",
        description:
          "A beautiful luxury apartment in the heart of the city with modern amenities.",
        type: "apartment" as const,
        status: "available" as const,
        listingPurpose: "sale" as const,
        cityId: city.id,
        societyId: society.id,
        sectorId: sector.id,
        unitId: unit.id,
        locationPoint: "POINT(73.0520 33.6885)",
        price: "500000",
        monthlyRent: "45000",
        areaValue: "1200",
        areaUnit: "sqft" as const,
        areaSqft: "1200",
        bedrooms: 2,
        bathrooms: 2,
      },
      {
        title: "Spacious Family House",
        slug: "spacious-family-house",
        description:
          "A spacious family house with a large backyard perfect for kids and pets.",
        type: "house" as const,
        status: "available" as const,
        listingPurpose: "sale" as const,
        cityId: city.id,
        societyId: society.id,
        sectorId: sector.id,
        unitId: unit.id,
        locationPoint: "POINT(73.0480 33.6900)",
        price: "750000",
        areaValue: "200",
        areaUnit: "marla" as const,
        areaSqft: "10890",
        bedrooms: 5,
        bathrooms: 4,
      },
      {
        title: "Modern Office Space",
        slug: "modern-office-space",
        description:
          "Modern office space in a prime business district with high-speed internet.",
        type: "office" as const,
        status: "available" as const,
        listingPurpose: "rent" as const,
        cityId: city.id,
        societyId: society.id,
        sectorId: sector.id,
        unitId: unit.id,
        locationPoint: "POINT(73.0540 33.6860)",
        price: "300000",
        monthlyRent: "30000",
        areaValue: "1500",
        areaUnit: "sqft" as const,
        areaSqft: "1500",
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
      city: "Islamabad",
      cityId: city.id,
      area: society.name,
      state: "federal" as const,
      street: "none",
      entityId: property.id,
      entityType: "property" as const,
      zipCode: "46000",
      latitude: "33.6885",
      longitude: "73.0520",
    }));

    await db.insert(schema.addresses).values(propertyAddressesValues);

    // -------------------- Property Owners ---------------------

    console.log("Seeding properties owners...");
    const ownerId = users.find(
      (u) => u.roleId === roles.find((r) => r.role === "owner")!.id,
    )!.id;
    const propertyOwnerValues: (typeof schema.propertyOwner.$inferInsert)[] = [
      {
        propertyId: properties[0].id,
        ownerId,
        ownershipPercentage: 100,
      },
      {
        propertyId: properties[2].id,
        ownerId,
        ownershipPercentage: 100,
      },
    ];
    await db.insert(schema.propertyOwner).values(propertyOwnerValues);

    // -------------------- Deal (active cash sale) ---------------------

    console.log("Seeding a cash-sale deal...");
    const tenantId = users.find(
      (u) => u.roleId === roles.find((r) => r.role === "tenant")!.id,
    )!.id;
    const [deal] = await db
      .insert(schema.deals)
      .values({
        propertyId: properties[2].id,
        type: "cash_sale",
        status: "pending_acceptance",
        counterpartyId: tenantId,
        sellerId: ownerId,
        currency: "PKR",
        totalAmount: "300000",
        taxAmount: "0",
        taxPayer: "counterparty",
        createdBy: adminId,
        snapshot: {
          property: {
            id: properties[2].id,
            title: properties[2].title,
            type: properties[2].type,
            price: properties[2].price,
            areaValue: properties[2].areaValue,
            areaUnit: properties[2].areaUnit,
          },
          capturedAt: new Date().toISOString(),
        },
      })
      .returning();

    await db.insert(schema.dealSaleDetails).values({
      dealId: deal.id,
      paymentMethod: "bank_transfer",
      dueOn: new Date().toISOString().slice(0, 10),
    });
    await db.insert(schema.dealPaymentSchedules).values({
      dealId: deal.id,
      sequence: 0,
      dueOn: new Date().toISOString().slice(0, 10),
      principalAmount: "300000",
      taxAmount: "0",
    });

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
        completedDate: new Date().toISOString().slice(0, 10),
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
        name: "sale_agreement.pdf",
        fileType: "pdf",
        fileSize: 1024,
        fileUrl: "https://example.com/documents/sale_agreement.pdf",
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
        entityType: "users",
        entityId: tenantId,
        doneBy: adminId,
      },
      {
        action: "create",
        entityType: "properties",
        entityId: properties[0].id,
        doneBy: adminId,
      },
      {
        action: "create",
        entityType: "deals",
        entityId: deal.id,
        doneBy: adminId,
        details: { event: "created", type: deal.type },
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
