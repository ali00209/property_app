import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────
// Custom geography column types (requires `CREATE EXTENSION postgis;`
// to be run once in a migration before these tables are created).
// ─────────────────────────────────────────────────────────────────────────

export const geographyPoint = customType<{ data: string }>({
  dataType() {
    return "geography(Point,4326)";
  },
});

export const geographyPolygon = customType<{ data: string }>({
  dataType() {
    return "geography(Polygon,4326)";
  },
});

// ─────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────

export const propertyTypeEnum = pgEnum("property_type", [
  "residential",
  "commercial",
  "industrial",
  "land",
  "unit",
  "apartment",
  "house",
  "office",
  "warehouse",
  "mixed_use",
]);

export const propertyStatusEnum = pgEnum("property_status", [
  "available",
  "off_market",
  "occupied",
  "vacant",
  "maintenance",
  "archived",
]);

// What the listing is being marketed for, independent of its current
// occupancy/deal status above. Drives public search/browse filters.
export const listingPurposeEnum = pgEnum("listing_purpose", ["sale", "rent"]);

export const areaUnitEnum = pgEnum("area_unit", [
  "marla",
  "kanal",
  "acre",
  "sqft",
  "sqyd",
  "sqm",
]);

// A "society" here covers anything a unit/address sits inside: a formal
// housing society, a commercial zone, or a generic named locality that
// doesn't have surveyed unit data (yet). This replaces the old, separate
// `localities` table — same concept, one table.
export const societyKindEnum = pgEnum("society_kind", [
  "housing_society",
  "commercial_area",
  "industrial_zone",
  "general_locality",
]);

export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "new",
  "assigned",
  "in_progress",
  "waiting_parts",
  "completed",
  "closed",
]);

export const maintenancePriorityEnum = pgEnum("maintenance_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "cheque",
  "card",
  "online",
]);

// entityType/entityId polymorphic pairing used by `documents` and `activity`.
export const documentEntityTypeEnum = pgEnum("document_entity_type", [
  "users",
  "properties",
  "maintenance",
  "deals",
]);

export const activityEntityTypeEnum = pgEnum("activity_entity_type", [
  "users",
  "userBankAccounts",
  "properties",
  "propertyFeatures",
  "propertyImages",
  "addresses",
  "propertyOwner",
  "maintenance",
  "documents",
  "deals",
  "societies",
  "units",
]);

export const activityActionEnum = pgEnum("activity_action", [
  "create",
  "delete",
  "update",
  "hide",
  "show",
]);

export const addressEntityTypeEnum = pgEnum("address_entity_type", [
  "user",
  "property",
]);

export const stateEnum = pgEnum("state", [
  "federal",
  "punjab",
  "sindh",
  "kpk",
  "balochistan",
  "gilgit_baltistan",
  "azad_kashmir",
]);

export const filerStatusEnum = pgEnum("filer_status", [
  "filer",
  "late_filer",
  "non_filer",
]);

export const mutationStatusEnum = pgEnum("mutation_status", [
  "not_applicable",
  "pending",
  "in_progress",
  "completed",
]);

export const possessionStatusEnum = pgEnum("possession_status", [
  "not_applicable",
  "pending",
  "granted",
  "disputed",
]);

export const nocStatusEnum = pgEnum("noc_status", [
  "not_required",
  "file_under_process",
  "approved",
]);

export const milestoneTypeEnum = pgEnum("milestone_type", [
  "booking",
  "confirmation",
  "monthly",
  "balloting",
  "allotment",
  "other",
]);

// Canonical deal lifecycle (replaces the old separate transactions /
// leases / installment-plan / purchase-request / purchase-contract tables).
export const dealTypeEnum = pgEnum("deal_type", [
  "cash_sale",
  "fixed_lease",
  "periodic_rent",
  "installment_purchase",
]);

export const dealStatusEnum = pgEnum("deal_status", [
  "pending_acceptance",
  "active",
  "completed",
  "cancelled",
  "terminated",
  "defaulted",
]);

export const dealFrequencyEnum = pgEnum("deal_frequency", [
  "monthly",
  "quarterly",
  "annually",
]);

export const dealPaymentStatusEnum = pgEnum("deal_payment_status", [
  "posted",
  "reversed",
]);

export const dealPaymentScheduleStatusEnum = pgEnum(
  "deal_payment_schedule_status",
  ["scheduled", "partially_paid", "paid", "cancelled"],
);

// Who bears a given tax line on a deal.
export const dealTaxPayerEnum = pgEnum("deal_tax_payer", [
  "seller",
  "counterparty",
]);

export const taxPolicyKindEnum = pgEnum("tax_policy_kind", [
  "percentage",
  "fixed_amount",
]);

// ─────────────────────────────────────────────────────────────────────────
// Identity
// ─────────────────────────────────────────────────────────────────────────

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    role: varchar("role").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("roles_role_idx").on(table.role)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).unique(),
    password: text("password").notNull(),
    roleId: uuid("role_id")
      .references(() => roles.id)
      .notNull(),
    avatarUrl: text("avatar_url"),
    phone: varchar("phone", { length: 50 }).unique(),
    cnic: varchar("cnic", { length: 15 }),
    filerStatus: filerStatusEnum("filer_status").default("non_filer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check(
      "users_email_or_phone_check",
      sql`${table.email} IS NOT NULL OR ${table.phone} IS NOT NULL`,
    ),
  ],
);

export const userBankAccounts = pgTable("user_bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  accountNumber: varchar("account_number", { length: 255 }).notNull().unique(),
  iban: varchar("iban").notNull().unique(),
  creditLimit: integer("credit_limit"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// Geo layer: City → Society (or generic locality) → Sector/Phase → Unit
// This is the map data backing the public search/browse experience.
// ─────────────────────────────────────────────────────────────────────────

export const cities = pgTable(
  "cities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    province: stateEnum("province"),
    centerPoint: geographyPoint("center_point"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("cities_slug_idx").on(table.slug)],
);

export const societies = pgTable(
  "societies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cityId: uuid("city_id")
      .references(() => cities.id, { onDelete: "restrict" })
      .notNull(),
    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    kind: societyKindEnum("kind").notNull().default("general_locality"),
    developer: varchar("developer", { length: 150 }),
    regulatoryAuthority: varchar("regulatory_authority", { length: 255 }),
    boundary: geographyPolygon("boundary"),
    description: text("description"),
    coverImage: varchar("cover_image", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("societies_slug_idx").on(table.slug),
    index("societies_city_idx").on(table.cityId),
    index("societies_boundary_gix").using("gist", table.boundary),
  ],
);

export const societySectors = pgTable(
  "society_sectors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    societyId: uuid("society_id")
      .references(() => societies.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("society_sectors_society_name_idx").on(
      table.societyId,
      table.name,
    ),
  ],
);

export const units = pgTable(
  "units",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sectorId: uuid("sector_id")
      .references(() => societySectors.id, { onDelete: "cascade" })
      .notNull(),
    unitNumber: varchar("unit_number", { length: 50 }).notNull(),
    streetNumber: varchar("street_number", { length: 50 }),
    centroid: geographyPoint("centroid").notNull(),
    areaValue: numeric("area_value", { precision: 10, scale: 2 }),
    areaUnit: areaUnitEnum("area_unit"),
    type: propertyTypeEnum("type"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("units_sector_unit_number_idx").on(
      table.sectorId,
      table.unitNumber,
    ),
  ],
);

// ─────────────────────────────────────────────────────────────────────────
// Properties (listings)
// ─────────────────────────────────────────────────────────────────────────

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 300 }).notNull(),
    description: text("description"),
    type: propertyTypeEnum("type").notNull().default("residential"),
    status: propertyStatusEnum("status").notNull().default("available"),
    listingPurpose: listingPurposeEnum("listing_purpose").notNull(),

    // Geo placement: exact unit when known, else a fallback pin.
    cityId: uuid("city_id").references(() => cities.id),
    societyId: uuid("society_id").references(() => societies.id),
    sectorId: uuid("sector_id").references(() => societySectors.id),
    unitId: uuid("unit_id").references(() => units.id),
    locationPoint: geographyPoint("location_point"),

    price: numeric("price", { precision: 14, scale: 2 }).notNull(),
    monthlyRent: numeric("monthly_rent", { precision: 14, scale: 2 }),

    areaValue: numeric("area_value", { precision: 10, scale: 2 }).notNull(),
    areaUnit: areaUnitEnum("area_unit").notNull(),
    // Cached cross-unit value so mixed-unit listings can be sorted/filtered
    // together without recomputing conversions on every query.
    areaSqft: numeric("area_sqft", { precision: 12, scale: 2 }),

    bedrooms: smallint("bedrooms"),
    bathrooms: smallint("bathrooms"),
    yearBuilt: integer("year_built"),
    isBalloted: boolean("is_balloted").notNull().default(false),
    fbrValuation: numeric("fbr_valuation", { precision: 14, scale: 2 }),
    dcRate: numeric("dc_rate", { precision: 14, scale: 2 }),
    parcelNumber: varchar("parcel_number", { length: 255 }),

    viewsCount: integer("views_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("properties_slug_idx").on(table.slug),
    index("properties_location_gix").using("gist", table.locationPoint),
    index("properties_society_search_idx").on(
      table.societyId,
      table.listingPurpose,
      table.status,
    ),
    index("properties_price_idx").on(table.price),
  ],
);

export const propertyFeatures = pgTable(
  "property_features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .references(() => properties.id, { onDelete: "cascade" })
      .notNull(),
    feature: varchar("feature").notNull(),
    value: varchar("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("property_features_property_feature_idx").on(
      table.propertyId,
      table.feature,
    ),
  ],
);

export const propertyImages = pgTable(
  "property_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .references(() => properties.id, { onDelete: "cascade" })
      .notNull(),
    url: varchar("url").notNull(),
    isPrimary: boolean("is_primary").notNull().default(false),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("property_images_property_idx").on(table.propertyId)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: addressEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    street: varchar("street", { length: 255 }).notNull(),
    area: varchar("area", { length: 255 }),
    cityId: uuid("city_id").references(() => cities.id),
    state: stateEnum("state").notNull(),
    zipCode: varchar("zip_code").notNull(),
    country: text("country").default("pakistan"),
    latitude: numeric("latitude", { precision: 10, scale: 6 }),
    longitude: numeric("longitude", { precision: 10, scale: 6 }),
    formattedAddress: text("formatted_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("addresses_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const propertyOwner = pgTable(
  "property_owner",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .references(() => properties.id, { onDelete: "cascade" })
      .notNull(),
    ownerId: uuid("owner_id").references(() => users.id),
    ownershipPercentage: integer("ownership_percentage"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // A property can have several co-owners, but not the same owner twice.
    uniqueIndex("property_owner_property_owner_idx").on(
      table.propertyId,
      table.ownerId,
    ),
    check(
      "property_owner_percentage_range_check",
      sql`${table.ownershipPercentage} IS NULL OR ${table.ownershipPercentage} BETWEEN 0 AND 100`,
    ),
  ],
);

export const maintenance = pgTable("maintenance", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => properties.id, { onDelete: "cascade" })
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: maintenancePriorityEnum("priority").notNull().default("medium"),
  status: maintenanceStatusEnum("status").notNull().default("new"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  estimatedCost: numeric("estimated_cost", { precision: 12, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 12, scale: 2 }),
  completedDate: date("completed_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Generic file attachments for users / properties / maintenance / deals.
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: documentEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    name: varchar("name", { length: 500 }).notNull(),
    fileType: varchar("file_type", { length: 50 }).notNull(),
    fileSize: integer("file_size"),
    fileUrl: text("file_url"),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("documents_entity_idx").on(table.entityType, table.entityId),
  ],
);

// Generic audit trail for every domain above, including deals — replaces
// the old deal-specific and installment-specific audit-log tables.
export const activity = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    action: activityActionEnum("action").notNull(),
    details: jsonb("details"),
    entityType: activityEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    doneBy: uuid("done_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activities_entity_idx").on(table.entityType, table.entityId),
  ],
);

// ─────────────────────────────────────────────────────────────────────────
// Deals — the single canonical lifecycle for every sale, lease, rental or
// installment-purchase agreement on a property.
// ─────────────────────────────────────────────────────────────────────────

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .references(() => properties.id, { onDelete: "restrict" })
      .notNull(),
    type: dealTypeEnum("type").notNull(),
    status: dealStatusEnum("status").notNull().default("pending_acceptance"),
    sellerId: uuid("seller_id").references(() => users.id),
    counterpartyId: uuid("counterparty_id")
      .references(() => users.id)
      .notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("PKR"),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }),
    earnestAmount: numeric("earnest_amount", { precision: 14, scale: 2 }),
    tokenPaidAt: timestamp("token_paid_at"),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    taxPayer: dealTaxPayerEnum("tax_payer").notNull().default("counterparty"),
    nocStatus: nocStatusEnum("noc_status").notNull().default("not_required"),
    mutationStatus: mutationStatusEnum("mutation_status")
      .notNull()
      .default("not_applicable"),
    mutationCompletedAt: timestamp("mutation_completed_at"),
    possessionStatus: possessionStatusEnum("possession_status")
      .notNull()
      .default("not_applicable"),
    possessionGrantedAt: timestamp("possession_granted_at"),
    snapshot: jsonb("snapshot").notNull(),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    acceptedAt: timestamp("accepted_at"),
    completedAt: timestamp("completed_at"),
    cancelledAt: timestamp("cancelled_at"),
    terminatedAt: timestamp("terminated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("deals_property_idx").on(table.propertyId),
    index("deals_status_idx").on(table.status),
    uniqueIndex("deals_one_active_property_idx")
      .on(table.propertyId)
      .where(sql`${table.status} in ('pending_acceptance', 'active')`),
  ],
);

export const dealSaleDetails = pgTable("deal_sale_details", {
  dealId: uuid("deal_id")
    .references(() => deals.id, { onDelete: "cascade" })
    .primaryKey(),
  paymentMethod: paymentMethodEnum("payment_method"),
  dueOn: date("due_on"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dealLeaseDetails = pgTable("deal_lease_details", {
  dealId: uuid("deal_id")
    .references(() => deals.id, { onDelete: "cascade" })
    .primaryKey(),
  rentAmount: numeric("rent_amount", { precision: 14, scale: 2 }).notNull(),
  depositAmount: numeric("deposit_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  advanceRentMonths: smallint("advance_rent_months").notNull().default(0),
  frequency: dealFrequencyEnum("frequency").notNull().default("monthly"),
  fixedTerm: boolean("fixed_term").notNull().default(true),
  noticePeriodDays: integer("notice_period_days"),
  agreementRegisteredAt: timestamp("agreement_registered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dealInstallmentDetails = pgTable("deal_installment_details", {
  dealId: uuid("deal_id")
    .references(() => deals.id, { onDelete: "cascade" })
    .primaryKey(),
  downPaymentAmount: numeric("down_payment_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  installmentAmount: numeric("installment_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  installmentCount: integer("installment_count").notNull(),
  frequency: dealFrequencyEnum("frequency").notNull().default("monthly"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dealPaymentSchedules = pgTable(
  "deal_payment_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id")
      .references(() => deals.id, { onDelete: "cascade" })
      .notNull(),
    sequence: integer("sequence").notNull(),
    dueOn: date("due_on"),
    milestoneType: milestoneTypeEnum("milestone_type").notNull().default("monthly"),
    eventDate: date("event_date"),
    principalAmount: numeric("principal_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    // Denormalized running totals for fast schedule-list rendering; the
    // source of truth is the sum of `deal_payment_allocations` rows.
    paidPrincipal: numeric("paid_principal", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    paidTax: numeric("paid_tax", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    status: dealPaymentScheduleStatusEnum("status")
      .notNull()
      .default("scheduled"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("deal_payment_schedules_deal_sequence_idx").on(
      table.dealId,
      table.sequence,
    ),
    index("deal_payment_schedules_deal_idx").on(table.dealId),
  ],
);

export const dealPayments = pgTable(
  "deal_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id")
      .references(() => deals.id, { onDelete: "cascade" })
      .notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    principalAmount: numeric("principal_amount", {
      precision: 14,
      scale: 2,
    })
      .notNull()
      .default("0"),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    status: dealPaymentStatusEnum("status").notNull().default("posted"),
    paymentMethod: paymentMethodEnum("payment_method"),
    reference: varchar("reference", { length: 255 }),
    notes: text("notes"),
    recordedBy: uuid("recorded_by")
      .references(() => users.id)
      .notNull(),
    reversedBy: uuid("reversed_by").references(() => users.id),
    reversedAt: timestamp("reversed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("deal_payments_deal_idx").on(table.dealId),
    check(
      "deal_payments_amount_breakdown_check",
      sql`${table.principalAmount} + ${table.taxAmount} = ${table.amount}`,
    ),
  ],
);

export const dealPaymentAllocations = pgTable(
  "deal_payment_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    paymentId: uuid("payment_id")
      .references(() => dealPayments.id, { onDelete: "cascade" })
      .notNull(),
    scheduleId: uuid("schedule_id")
      .references(() => dealPaymentSchedules.id, { onDelete: "cascade" })
      .notNull(),
    principalAmount: numeric("principal_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("deal_payment_allocations_payment_schedule_idx").on(
      table.paymentId,
      table.scheduleId,
    ),
    index("deal_payment_allocations_payment_idx").on(table.paymentId),
  ],
);

export const dealAcceptances = pgTable("deal_acceptances", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id")
    .references(() => deals.id, { onDelete: "cascade" })
    .notNull(),
  acceptedBy: uuid("accepted_by")
    .references(() => users.id)
    .notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
});

export const dealSettlements = pgTable("deal_settlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  dealId: uuid("deal_id")
    .references(() => deals.id, { onDelete: "cascade" })
    .notNull(),
  kind: varchar("kind", { length: 20 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  refundAmount: numeric("refund_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  refundPrincipalAmount: numeric("refund_principal_amount", {
    precision: 14,
    scale: 2,
  })
    .notNull()
    .default("0"),
  refundTaxAmount: numeric("refund_tax_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  reason: text("reason"),
  settledBy: uuid("settled_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taxPolicies = pgTable(
  "tax_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    kind: taxPolicyKindEnum("kind").notNull(),
    value: numeric("value", { precision: 14, scale: 2 }).notNull(),
    minValue: numeric("min_value", { precision: 14, scale: 2 }),
    maxValue: numeric("max_value", { precision: 14, scale: 2 }),
    filerStatus: filerStatusEnum("filer_status"),
    appliesTo: dealTypeEnum("applies_to").array().notNull(),
    active: boolean("active").notNull().default(true),
    effectiveStart: date("effective_start"),
    effectiveEnd: date("effective_end"),
    code: varchar("code", { length: 100 }),
    authority: varchar("authority", { length: 255 }),
    description: text("description"),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tax_policies_active_idx").on(table.active),
    index("tax_policies_effective_idx").on(
      table.effectiveStart,
      table.effectiveEnd,
    ),
  ],
);

export const propertyTaxAssignments = pgTable(
  "property_tax_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .references(() => properties.id, { onDelete: "cascade" })
      .notNull(),
    policyId: uuid("policy_id")
      .references(() => taxPolicies.id, { onDelete: "cascade" })
      .notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("property_tax_assignments_property_policy_idx").on(
      table.propertyId,
      table.policyId,
    ),
    index("property_tax_assignments_property_idx").on(table.propertyId),
  ],
);

export const dealTaxSnapshots = pgTable(
  "deal_tax_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id")
      .references(() => deals.id, { onDelete: "cascade" })
      .notNull(),
    policyId: uuid("policy_id")
      .references(() => taxPolicies.id, { onDelete: "restrict" })
      .notNull(),
    policyName: varchar("policy_name", { length: 255 }).notNull(),
    policyKind: taxPolicyKindEnum("policy_kind").notNull(),
    policyValue: numeric("policy_value", {
      precision: 14,
      scale: 2,
    }).notNull(),
    filerStatusUsed: filerStatusEnum("filer_status_used"),
    policyCode: varchar("policy_code", { length: 100 }),
    authority: varchar("authority", { length: 255 }),
    baseAmount: numeric("base_amount", { precision: 14, scale: 2 }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("PKR"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("deal_tax_snapshots_deal_policy_idx").on(
      table.dealId,
      table.policyId,
    ),
    index("deal_tax_snapshots_deal_idx").on(table.dealId),
  ],
);
