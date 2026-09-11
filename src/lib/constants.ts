export const propertyStatusFilter = [
  { value: "available", label: "Available" },
  { value: "off_market", label: "Off Market" },
  { value: "occupied", label: "Occupied" },
  { value: "vacant", label: "Vacant" },
  { value: "maintenance", label: "Maintenance" },
  { value: "archived", label: "Archived" },
];

export const propertyTypeFilter = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "mixed_use", label: "Mixed Use" },
  { value: "apartment", label: "Apartment" },
  { value: "warehouse", label: "WareHouse" },
  { value: "office", label: "Office" },
  { value: "unit", label: "Unit" },
  { value: "land", label: "Land" },
  { value: "house", label: "House" },
];

export const countryFilter = [{ value: "pakistan", label: "Pakistan" }];

export const stateFilter = [
  { value: "federal", label: "Federal" },
  { value: "punjab", label: "Punjab" },
  { value: "kpk", label: "KPK" },
  { value: "blochistan", label: "Blochistan" },
];

export const roleFilter = [
  { value: "admin", label: "Admin" },
  { value: "client", label: "Client" },
  { value: "tenant", label: "Tenant" },
  { value: "property_manager", label: "Property Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "owner", label: "Owner" },
  { value: "maintenance_staff", label: "Maintenance Staff" },
];

export const dealTypeFilter = [
  { value: "cash_sale", label: "Cash Sale" },
  { value: "fixed_lease", label: "Fixed Lease" },
  { value: "periodic_rent", label: "Periodic Rent" },
  { value: "installment_purchase", label: "Installment Purchase" },
];

export const dealStatusFilter = [
  { value: "pending_acceptance", label: "Pending Acceptance" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "terminated", label: "Terminated" },
  { value: "defaulted", label: "Defaulted" },
];

export const dealFrequencyFilter = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

export const taxPolicyKindFilter = [
  { value: "percentage", label: "Percentage" },
  { value: "fixed_amount", label: "Fixed Amount" },
];

export const installmentPlanStatusFilter = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export const taxAppliesToOptions = [
  { value: "cash_sale", label: "Cash Sale" },
  { value: "installment_purchase", label: "Installment Purchase" },
  { value: "fixed_lease", label: "Fixed Lease" },
  { value: "periodic_rent", label: "Periodic Rent" },
];

export const nocStatusFilter = [
  { value: "not_required", label: "Not Required" },
  { value: "file_under_process", label: "File Under Process" },
  { value: "approved", label: "Approved" },
];

export const mutationStatusFilter = [
  { value: "not_applicable", label: "Not Applicable" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export const possessionStatusFilter = [
  { value: "not_applicable", label: "Not Applicable" },
  { value: "pending", label: "Pending" },
  { value: "granted", label: "Granted" },
  { value: "disputed", label: "Disputed" },
];

export const filerStatusFilter = [
  { value: "filer", label: "Filer" },
  { value: "late_filer", label: "Late Filer" },
  { value: "non_filer", label: "Non Filer" },
];

export const milestoneTypeFilter = [
  { value: "booking", label: "Booking" },
  { value: "confirmation", label: "Confirmation" },
  { value: "monthly", label: "Monthly" },
  { value: "balloting", label: "Balloting" },
  { value: "allotment", label: "Allotment" },
  { value: "other", label: "Other" },
];

export const societyKindString = [
  "housing_society",
  "commercial_area",
  "industrial_zone",
  "general_locality",
] as const;

export const societyKindFilter = [
  { value: "housing_society", label: "Housing Society" },
  { value: "commercial_area", label: "Commercial Area" },
  { value: "industrial_zone", label: "Industrial Zone" },
  { value: "general_locality", label: "General Locality" },
];

export const areaUnitString = ["marla", "kanal", "acre", "sqft", "sqyd", "sqm"] as const;

export const areaUnitFilter = [
  { value: "marla", label: "Marla" },
  { value: "kanal", label: "Kanal" },
  { value: "acre", label: "Acre" },
  { value: "sqft", label: "Sq ft" },
  { value: "sqyd", label: "Sq yd" },
  { value: "sqm", label: "Sq m" },
];

export const unitTypeString = [
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
] as const;

export const provinceFilter = [
  { value: "federal", label: "Federal" },
  { value: "punjab", label: "Punjab" },
  { value: "sindh", label: "Sindh" },
  { value: "kpk", label: "KPK" },
  { value: "balochistan", label: "Balochistan" },
  { value: "gilgit_baltistan", label: "Gilgit Baltistan" },
  { value: "azad_kashmir", label: "Azad Kashmir" },
];

export const propertyTypes = propertyTypeFilter.map((t) => t.value) as string[];
export const listingPurposeFilter = [
  { value: "sale", label: "Sale" },
  { value: "rent", label: "Rent" },
];

export const paymentMethodFilter = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online" },
];
