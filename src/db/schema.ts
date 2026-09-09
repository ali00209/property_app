import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const propertyTypeEnum = pgEnum("property_type", [
  "residential",
  "commercial",
  "industrial",
  "land",
  "plot",
  "apartment",
  "house",
  "office",
  "warehouse",
  "mixed_use",
]);

export const propertyStatusEnum = pgEnum("property_status", [
  "available",
  "sold",
  "leased",
  "rented",
  "under_contract",
  "off_market",
  "occupied",
  "vacant",
  "maintenance",
  "archived",
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

export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "monthly",
  "quarterly",
  "annually",
  "custom",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "paid",
  "pending",
  "overdue",
  "partial",
  "refunded",
]);

export const installmentFrequencyEnum = pgEnum("installment_frequency", [
  "monthly",
  "quarterly",
  "annually",
]);

export const installmentPlanStatusEnum = pgEnum("installment_plan_status", [
  "draft",
  "published",
  "archived",
]);

export const purchaseRequestStatusEnum = pgEnum("purchase_request_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const purchaseContractStatusEnum = pgEnum("purchase_contract_status", [
  "pending_down_payment",
  "active",
  "cancelled",
  "completed",
  "defaulted",
]);

export const scheduledInstallmentStatusEnum = pgEnum(
  "scheduled_installment_status",
  ["scheduled", "partially_paid", "paid", "overdue", "cancelled"],
);

export const paymentEntryTypeEnum = pgEnum("payment_entry_type", [
  "payment",
  "reversal",
  "refund",
]);

export const paymentEntryStatusEnum = pgEnum("payment_entry_status", [
  "posted",
  "reversed",
]);

// export const userRole = pgEnum("user_role", [
//   "admin",
//   "client",
//   "property_manager",
//   "accountant",
//   "owner",
//   "tenant",
//   "maintenance_staff",
// ]);

export const activityType = pgEnum("activity_type", [
  "users",
  "userBankAccounts",
  "properties",
  "propertyFeatures",
  "propertyImages",
  "addresses",
  "propertyOwner",
  "transactions",
  "leases",
  "maintenance",
  "documents",
]);

export const documentType = pgEnum("document_type", [
  "users",
  "properties",
  "maintenance",
  "transaction",
]);

export const activityAction = pgEnum("activity_action", [
  "create",
  "delete",
  "update",
  "hide",
  "show",
]);

export const addressType = pgEnum("entity_type", ["user", "property"]);
export const stateEnum = pgEnum("state", [
  "federal",
  "punjab",
  "kpk",
  "blochistan",
]);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  role: varchar("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  roleId: uuid("role_id")
    .references(() => roles.id)
    .notNull(),
  avatarUrl: text("avatar_url"),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userBankAccounts = pgTable("user_bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  bankName: varchar("bankName", { length: 255 }).notNull(),
  accountNumber: varchar("accountNumber", { length: 255 }).notNull().unique(),
  iban: varchar("iban").notNull().unique(),
  limit: integer("limit"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const properties = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  type: propertyTypeEnum("type").notNull().default("residential"),
  status: propertyStatusEnum("status").notNull().default("available"),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  monthlyRent: numeric("monthly_rent", { precision: 14, scale: 2 }),
  area: integer("area").notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  yearBuilt: integer("year_built"),
  parcelNumber: varchar("parcel_number", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const propertyFeatures = pgTable("property_features", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => properties.id, { onDelete: "cascade" })
    .notNull(),
  feature: varchar("feature").notNull(),
  value: varchar("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const propertyImages = pgTable("property_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => properties.id, { onDelete: "cascade" })
    .notNull(),
  url: varchar("url").notNull(),
  isPrimary: boolean("is_primary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: addressType().notNull(),
  entityId: uuid("entityId").notNull(),
  street: varchar("street", { length: 255 }).notNull(),
  area: varchar("area", { length: 255 }),
  city: varchar("city", { length: 255 }).notNull(),
  state: stateEnum("state").notNull(),
  zipCode: varchar("zip_code").notNull(),
  country: text("country").default("pakistan"),
  latitude: numeric("latitude", { precision: 10, scale: 6 }),
  longitude: numeric("longitude", { precision: 10, scale: 6 }),
  formattedAddress: text("formatted_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  (table) => [uniqueIndex("property_owner_property_idx").on(table.propertyId)],
);

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => properties.id, { onDelete: "cascade" })
    .notNull(),
  ownerId: uuid("owner_id").references(() => users.id),
  tenentId: uuid("tenent_id").references(() => users.id),
  status: transactionStatusEnum("status").notNull().default("pending"),
  amount: integer("amount").notNull(),
  notes: text("notes"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leases = pgTable("leases", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => properties.id, { onDelete: "cascade" })
    .notNull(),
  tenentId: uuid("tenent_id").references(() => users.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  monthlyRent: integer("monthly_rent"),
  deposit: integer("deposit"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const maintenance = pgTable("maintenance", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => properties.id)
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

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: documentType().notNull(),
  entityId: uuid("entity_id").notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: integer("file_size"),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const activity = pgTable("activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: activityAction().notNull(),
  details: text("details"),
  entityType: activityType().notNull(),
  entityId: uuid("entity_id").notNull(),
  doneBy: uuid("done_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const installmentPlanTemplates = pgTable("installment_plan_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  frequency: installmentFrequencyEnum("frequency").notNull().default("monthly"),
  termMonths: integer("term_months").notNull(),
  downPaymentPercent: numeric("down_payment_percent", {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default("20"),
  interestRate: numeric("interest_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  status: installmentPlanStatusEnum("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const propertyInstallmentPlans = pgTable("property_installment_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .references(() => properties.id, { onDelete: "cascade" })
    .notNull(),
  templateId: uuid("template_id")
    .references(() => installmentPlanTemplates.id)
    .notNull(),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  downPaymentAmount: numeric("down_payment_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  installmentAmount: numeric("installment_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  status: installmentPlanStatusEnum("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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

export const purchaseRequests = pgTable("purchase_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyPlanId: uuid("property_plan_id")
    .references(() => propertyInstallmentPlans.id)
    .notNull(),
  propertyId: uuid("property_id")
    .references(() => properties.id)
    .notNull(),
  buyerId: uuid("buyer_id")
    .references(() => users.id)
    .notNull(),
  status: purchaseRequestStatusEnum("status").notNull().default("pending"),
  note: text("note"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const purchaseContracts = pgTable("purchase_contracts", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestId: uuid("request_id")
    .references(() => purchaseRequests.id)
    .notNull()
    .unique(),
  propertyPlanId: uuid("property_plan_id")
    .references(() => propertyInstallmentPlans.id)
    .notNull(),
  propertyId: uuid("property_id")
    .references(() => properties.id)
    .notNull(),
  buyerId: uuid("buyer_id")
    .references(() => users.id)
    .notNull(),
  dealId: uuid("deal_id"),
  status: purchaseContractStatusEnum("status").notNull().default("active"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
  downPaymentAmount: numeric("down_payment_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  installmentAmount: numeric("installment_amount", {
    precision: 14,
    scale: 2,
  }).notNull(),
  installmentCount: integer("installment_count").notNull(),
  startDate: date("start_date").notNull(),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  refundAmount: numeric("refund_amount", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scheduledInstallments = pgTable("scheduled_installments", {
  id: uuid("id").defaultRandom().primaryKey(),
  contractId: uuid("contract_id")
    .references(() => purchaseContracts.id, { onDelete: "cascade" })
    .notNull(),
  sequence: integer("sequence").notNull(),
  dueDate: date("due_date").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  status: scheduledInstallmentStatusEnum("status")
    .notNull()
    .default("scheduled"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentLedger = pgTable("payment_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  contractId: uuid("contract_id")
    .references(() => purchaseContracts.id, { onDelete: "cascade" })
    .notNull(),
  installmentId: uuid("installment_id").references(
    () => scheduledInstallments.id,
  ),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  entryType: paymentEntryTypeEnum("entry_type").notNull().default("payment"),
  status: paymentEntryStatusEnum("status").notNull().default("posted"),
  paymentMethod: varchar("payment_method", { length: 50 }),
  reference: varchar("reference", { length: 255 }),
  notes: text("notes"),
  recordedBy: uuid("recorded_by")
    .references(() => users.id)
    .notNull(),
  reversedBy: uuid("reversed_by").references(() => users.id),
  reversedAt: timestamp("reversed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const installmentAuditLogs = pgTable("installment_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  actorId: uuid("actor_id").references(() => users.id),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Deals are the canonical lifecycle for every property agreement. The
 * legacy transaction and installment tables remain intact for compatibility;
 * new flows use these tables and can link back to legacy records by id.
 */
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

export const taxPolicyKindEnum = pgEnum("tax_policy_kind", [
  "percentage",
  "fixed_amount",
]);

export const dealPaymentScheduleStatusEnum = pgEnum(
  "deal_payment_schedule_status",
  ["scheduled", "partially_paid", "paid", "cancelled"],
);

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
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    taxPayer: varchar("tax_payer", { length: 30 })
      .notNull()
      .default("counterparty"),
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
  paymentMethod: varchar("payment_method", { length: 50 }),
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
  frequency: dealFrequencyEnum("frequency").notNull().default("monthly"),
  fixedTerm: boolean("fixed_term").notNull().default(true),
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
  legacyContractId: uuid("legacy_contract_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dealPayments = pgTable(
  "deal_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id")
      .references(() => deals.id, { onDelete: "cascade" })
      .notNull(),
    legacyPaymentId: uuid("legacy_payment_id"),
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
    paymentMethod: varchar("payment_method", { length: 50 }),
    reference: varchar("reference", { length: 255 }),
    notes: text("notes"),
    recordedBy: uuid("recorded_by")
      .references(() => users.id)
      .notNull(),
    reversedBy: uuid("reversed_by").references(() => users.id),
    reversedAt: timestamp("reversed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("deal_payments_deal_idx").on(table.dealId)],
);

export const dealDocuments = pgTable(
  "deal_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id")
      .references(() => deals.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 500 }).notNull(),
    fileType: varchar("file_type", { length: 100 }).notNull(),
    fileSize: integer("file_size"),
    fileUrl: text("file_url"),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("deal_documents_deal_idx").on(table.dealId)],
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

export const dealAuditLogs = pgTable(
  "deal_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id")
      .references(() => deals.id, { onDelete: "cascade" })
      .notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    actorId: uuid("actor_id").references(() => users.id),
    details: jsonb("details"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("deal_audit_deal_idx").on(table.dealId)],
);

export const taxPolicies = pgTable(
  "tax_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    kind: taxPolicyKindEnum("kind").notNull(),
    value: numeric("value", { precision: 14, scale: 2 }).notNull(),
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

export const dealPaymentSchedules = pgTable(
  "deal_payment_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    dealId: uuid("deal_id")
      .references(() => deals.id, { onDelete: "cascade" })
      .notNull(),
    sequence: integer("sequence").notNull(),
    dueOn: date("due_on"),
    principalAmount: numeric("principal_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
    taxAmount: numeric("tax_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
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
