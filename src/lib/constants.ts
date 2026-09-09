export const propertyStatusFilter = [
  { value: "available", label: "Available" },
  { value: "sold", label: "Sold" },
  { value: "leased", label: "Leased" },
  { value: "rented", label: "Rented" },
  { value: "under_contract", label: "Under Contract" },
  { value: "off_market", label: "Off Market" },
  { value: "occupied", label: "Occupied" },
  { value: "vacant", label: "Vacant" },
  { value: "maintenance", label: "Maintenance" },
  { value: "archived", label: "Archived" },
]

export const propertyTypeFilter = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "industrial", label: "Industrial" },
  { value: "mixed_use", label: "Mixed Use" },
  { value: "apartment", label: "Apartment" },
  { value: "warehouse", label: "WareHouse" },
  { value: "office", label: "Office" },
  { value: "plot", label: "Plot" },
  { value: "land", label: "Land" },
  { value: "house", label: "House" },
]

export const countryFilter = [{ value: "pakistan", label: "Pakistan" }]

export const stateFilter = [
  { value: "federal", label: "Federal" },
  { value: "punjab", label: "Punjab" },
  { value: "kpk", label: "KPK" },
  { value: "blochistan", label: "Blochistan" },
]

export const roleFilter = [
  { value: "admin", label: "Admin" },
  { value: "client", label: "Client" },
  { value: "tenant", label: "Tenant" },
  { value: "property_manager", label: "Property Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "owner", label: "Owner" },
  { value: "maintenance_staff", label: "Maintenance Staff" },
]

export const dealTypeFilter = [
  { value: "cash_sale", label: "Cash Sale" },
  { value: "fixed_lease", label: "Fixed Lease" },
  { value: "periodic_rent", label: "Periodic Rent" },
  { value: "installment_purchase", label: "Installment Purchase" },
]

export const dealStatusFilter = [
  { value: "pending_acceptance", label: "Pending Acceptance" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "terminated", label: "Terminated" },
  { value: "defaulted", label: "Defaulted" },
]

export const dealFrequencyFilter = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
]

export const taxPolicyKindFilter = [
  { value: "percentage", label: "Percentage" },
  { value: "fixed_amount", label: "Fixed Amount" },
]

export const installmentPlanStatusFilter = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
]

export const taxAppliesToOptions = [
  { value: "cash_sale", label: "Cash Sale" },
  { value: "installment_purchase", label: "Installment Purchase" },
  { value: "fixed_lease", label: "Fixed Lease" },
  { value: "periodic_rent", label: "Periodic Rent" },
]