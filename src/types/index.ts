export type UUID = string
export type DateTime = string
export type Decimal = string

export type AreaUnit = "marla" | "kanal" | "acre" | "sqft" | "sqyd" | "sqm"
export type ListingPurpose = "sale" | "rent"

export type SocietyKind =
  | "housing_society"
  | "commercial_area"
  | "industrial_zone"
  | "general_locality"

export type UserRole =
  | 'admin'
  | 'client'
  | 'property_manager'
  | 'accountant'
  | 'owner'
  | 'tenant'
  | 'maintenance_staff'

export type PropertyType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'land'
  | 'unit'
  | 'apartment'
  | 'house'
  | 'office'
  | 'warehouse'
  | 'mixed_use'

export type PropertyStatus =
  | 'available'
  | 'off_market'
  | 'occupied'
  | 'vacant'
  | 'maintenance'
  | 'archived'

export type FilerStatus = 'filer' | 'late_filer' | 'non_filer'
export type MutationStatus = 'not_applicable' | 'pending' | 'in_progress' | 'completed'
export type PossessionStatus = 'not_applicable' | 'pending' | 'granted' | 'disputed'
export type NocStatus = 'not_required' | 'file_under_process' | 'approved'
export type MilestoneType = 'booking' | 'confirmation' | 'monthly' | 'balloting' | 'allotment' | 'other'

export interface Role {
  id: UUID
  role: string
  createdAt?: DateTime
  updatedAt?: DateTime
}

export interface User {
  id: UUID
  name: string
  email: string | null
  role: string
  roleId: UUID
  avatarUrl?: string | null
  phone?: string | null
  cnic?: string | null
  filerStatus?: FilerStatus
  createdAt?: DateTime
  updatedAt?: DateTime
}

export interface SessionUser {
  id: UUID
  name: string
  email: string | null
  phone?: string | null
  role: UserRole
}

export interface Address {
  id?: UUID
  entityId?: UUID
  entityType?: string
  street: string
  area?: string | null
  cityId?: UUID | null
  city?: string | null
  state: string
  zipCode: string
  country?: string | null
  latitude?: string | null
  longitude?: string | null
  formattedAddress?: string | null
  createdAt?: DateTime
  updatedAt?: DateTime
}

export interface PropertyFeatures {
  id?: UUID
  propertyId: UUID
  feature: string
  value: string
  createdAt?: DateTime
  updatedAt?: DateTime
}

export interface PropertyOwner {
  id?: UUID
  propertyId: UUID
  ownerId?: UUID | null
  ownershipPercentage?: number | null
  createdAt?: DateTime
  updatedAt?: DateTime
  user?: User | null
}

export interface PropertyImage {
  id?: UUID
  propertyId: UUID
  url: string
  isPrimary?: boolean | null
  createdAt?: DateTime
  updatedAt?: DateTime
}

export interface Document {
  id: UUID
  entityType: string
  entityId: UUID
  name: string
  fileType: string
  fileSize?: number | null
  fileUrl?: string | null
  createdAt?: DateTime
}

export interface Property {
  id: UUID
  title: string
  slug: string
  description?: string | null
  type: PropertyType
  status: PropertyStatus
  listingPurpose: ListingPurpose
  cityId?: UUID | null
  societyId?: UUID | null
  sectorId?: UUID | null
  unitId?: UUID | null
  locationPoint?: string | null
  price: Decimal
  monthlyRent?: Decimal | null
  areaValue: Decimal
  areaUnit: AreaUnit
  areaSqft?: Decimal | null
  bedrooms?: number | null
  bathrooms?: number | null
  yearBuilt?: number | null
  isBalloted?: boolean | null
  fbrValuation?: Decimal | null
  dcRate?: Decimal | null
  parcelNumber?: string | null
  viewsCount: number
  createdAt?: DateTime
  updatedAt?: DateTime
}

export type PropertyDetail = Property & {
  address: Address | null
  features: PropertyFeatures[]
  owners: PropertyOwner[]
  images: PropertyImage[]
  documents: Document[]
}

export interface PropertyCreateInput {
  title: string
  description?: string | null
  type: string
  price: string
  monthlyRent?: string
  area: number
  bedrooms?: number
  bathrooms?: number
  yearBuilt?: number
  parcelNumber?: string
  ownerId?: string
  country?: string
  state?: string
  city?: string
  street?: string
  zipCode?: string
  latitude?: string
  longitude?: string
  formattedAddress?: string
  coverImage: File | null
  documents: File[]
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { message: string; fieldErrors?: Record<string, string[]> } }

export type DealType =
  | 'cash_sale'
  | 'fixed_lease'
  | 'periodic_rent'
  | 'installment_purchase'

export type DealStatus =
  | 'pending_acceptance'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'terminated'
  | 'defaulted'

export type DealFrequency = 'monthly' | 'quarterly' | 'annually'

export type DealPaymentStatus = 'posted' | 'reversed'

export type DealPaymentScheduleStatus =
  | 'scheduled'
  | 'partially_paid'
  | 'paid'
  | 'cancelled'

export interface Deal {
  id: UUID
  propertyId: UUID
  type: DealType
  status: DealStatus
  sellerId?: UUID | null
  counterpartyId: UUID
  currency: string
  startsOn?: string | null
  endsOn?: string | null
  totalAmount?: Decimal | null
  earnestAmount?: Decimal | null
  tokenPaidAt?: DateTime | null
  taxAmount: Decimal
  taxPayer: string
  nocStatus: NocStatus
  mutationStatus: MutationStatus
  mutationCompletedAt?: DateTime | null
  possessionStatus: PossessionStatus
  possessionGrantedAt?: DateTime | null
  snapshot: Record<string, unknown>
  createdBy?: UUID | null
  acceptedAt?: DateTime | null
  completedAt?: DateTime | null
  cancelledAt?: DateTime | null
  terminatedAt?: DateTime | null
  createdAt?: DateTime
  updatedAt?: DateTime
  property?: Property | null
}

export interface DealSaleDetails {
  dealId: UUID
  paymentMethod?: string | null
  dueOn?: string | null
  createdAt?: DateTime
}

export interface DealLeaseDetails {
  dealId: UUID
  rentAmount: Decimal
  depositAmount: Decimal
  advanceRentMonths: number
  frequency: DealFrequency
  fixedTerm: boolean
  noticePeriodDays?: number | null
  agreementRegisteredAt?: DateTime | null
  createdAt?: DateTime
}

export interface DealInstallmentDetails {
  dealId: UUID
  downPaymentAmount: Decimal
  installmentAmount: Decimal
  installmentCount: number
  frequency: DealFrequency
  createdAt?: DateTime
}

export interface DealPayment {
  id: UUID
  dealId: UUID
  amount: Decimal
  principalAmount: Decimal
  taxAmount: Decimal
  status: DealPaymentStatus
  paymentMethod?: string | null
  reference?: string | null
  notes?: string | null
  recordedBy?: UUID | null
  reversedBy?: UUID | null
  reversedAt?: DateTime | null
  createdAt?: DateTime
}

export interface DealAcceptance {
  id: UUID
  dealId: UUID
  acceptedBy: UUID
  acceptedAt?: DateTime
}

export interface DealSettlement {
  id: UUID
  dealId: UUID
  kind: string
  paidAmount: Decimal
  refundAmount: Decimal
  refundPrincipalAmount: Decimal
  refundTaxAmount: Decimal
  reason?: string | null
  settledBy?: UUID | null
  createdAt?: DateTime
}

export interface DealSchedule {
  id: UUID
  dealId: UUID
  sequence: number
  dueOn?: string | null
  milestoneType: MilestoneType
  eventDate?: string | null
  principalAmount: Decimal
  taxAmount: Decimal
  paidPrincipal: Decimal
  paidTax: Decimal
  status: DealPaymentScheduleStatus
  createdAt?: DateTime
}

export interface DealAllocation {
  id: UUID
  paymentId: UUID
  scheduleId: UUID
  principalAmount: Decimal
  taxAmount: Decimal
  createdAt?: DateTime
}

export interface DealDetail extends Omit<Deal, "property"> {
  property?: Property | null
  sale?: DealSaleDetails | null
  lease?: DealLeaseDetails | null
  installment?: DealInstallmentDetails | null
  payments: DealPayment[]
  documents: Document[]
  acceptances: DealAcceptance[]
  taxes: DealTaxSnapshot[]
  paymentSchedule: DealSchedule[]
  paymentAllocations: DealAllocation[]
  settlements: DealSettlement[]
  auditLogs: ActivityItem[]
}

export interface DealTaxSnapshot {
  id: UUID
  dealId: UUID
  policyId: UUID
  policyName: string
  policyKind: 'percentage' | 'fixed_amount'
  policyValue: Decimal
  filerStatusUsed?: FilerStatus | null
  policyCode?: string | null
  authority?: string | null
  baseAmount: Decimal
  taxAmount: Decimal
  currency: string
  createdAt?: DateTime
}

export type TaxPolicyKind = "percentage" | "fixed_amount"

export interface TaxPolicy {
  id: UUID
  name: string
  kind: TaxPolicyKind
  value: Decimal
  minValue?: Decimal | null
  maxValue?: Decimal | null
  filerStatus?: FilerStatus | null
  appliesTo: DealType[]
  active: boolean
  effectiveStart: string | null
  effectiveEnd: string | null
  code: string | null
  authority: string | null
  description: string | null
  notes: string | null
  createdBy: UUID
  createdAt: DateTime
  updatedAt: DateTime
}

export interface PolicyMeta {
  id: UUID
  name: string
  kind: TaxPolicyKind
  value: Decimal
  minValue?: Decimal | null
  maxValue?: Decimal | null
  filerStatus?: FilerStatus | null
  appliesTo: DealType[]
  effectiveStart: string | null
  effectiveEnd: string | null
  authority: string | null
}

export interface DealTaxCandidates {
  byProperty: Record<string, PolicyMeta[]>
  fallback: PolicyMeta[]
}

export interface DealOption {
  id: UUID
  name: string
  role: string
}

export type MaintenancePriority = "low" | "medium" | "high" | "urgent"

export type MaintenanceStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "waiting_parts"
  | "completed"
  | "closed"

export interface MaintenanceRequest {
  id: UUID
  propertyId: UUID
  propertyTitle: string
  title: string
  description?: string | null
  priority: MaintenancePriority
  status: MaintenanceStatus
  assignedTo?: UUID | null
  assignedName?: string | null
  estimatedCost?: Decimal | null
  actualCost?: Decimal | null
  completedDate?: string | null
  createdAt?: DateTime
  updatedAt?: DateTime
}

export type ActivityAction = "create" | "delete" | "update" | "hide" | "show"

export type ActivityEntityType =
  | "users"
  | "userBankAccounts"
  | "properties"
  | "propertyFeatures"
  | "propertyImages"
  | "addresses"
  | "propertyOwner"
  | "maintenance"
  | "documents"
  | "deals"
  | "societies"
  | "units"

export interface ActivityItem {
  id: UUID
  action: ActivityAction
  details?: Record<string, unknown> | null
  entityType: ActivityEntityType
  entityId: UUID
  doneBy?: UUID | null
  doneByName?: string | null
  entityLabel?: string | null
  createdAt?: DateTime
}

export interface DealSummary {
  id: UUID
  type: DealType
  status: DealStatus
  totalAmount: Decimal
  taxAmount: Decimal
  counterpartyName?: string | null
  createdAt?: DateTime
}

export interface PaymentLedgerRow {
  id: UUID
  dealId: UUID
  propertyTitle: string
  dealType: DealType
  dealStatus: DealStatus
  counterpartyName?: string | null
  amount: Decimal
  principalAmount: Decimal
  taxAmount: Decimal
  status: DealPaymentStatus
  paymentMethod?: string | null
  reference?: string | null
  notes?: string | null
  recordedByName?: string | null
  reversedAt?: DateTime | null
  createdAt?: DateTime
}
export interface MapCity {
  city: string
  lat: number
  lng: number
  count: number
}

export interface MapArea {
  id: UUID
  city: string
  area: string
  lat: number
  lng: number
  count: number
  boundary?: string | null
}

export interface MapUnit {
  id: UUID
  societyId: UUID
  unitNumber: string
  lat: number
  lng: number
}

export interface MapProperty {
  id: UUID
  title: string
  status: string
  type: string
  price: Decimal
  monthlyRent?: Decimal | null
  city: string
  area?: string | null
  societyId?: UUID | null
  lat: number
  lng: number
}

export interface MapPayload {
  cities: MapCity[]
  areas: MapArea[]
  properties: MapProperty[]
  units: MapUnit[]
}

export interface City {
  id: UUID
  name: string
  slug: string
  province?: string | null
  centerPoint?: string | null
  createdAt?: DateTime
  updatedAt?: DateTime
}

export interface Society {
  id: UUID
  cityId: UUID
  city?: string | null
  name: string
  slug: string
  kind: SocietyKind
  developer?: string | null
  regulatoryAuthority?: string | null
  boundary?: string | null
  description?: string | null
  coverImage?: string | null
  isActive: boolean
  createdAt?: DateTime
  updatedAt?: DateTime
}

export interface SocietySector {
  id: UUID
  societyId: UUID
  name: string
  createdAt?: DateTime
}

export interface Unit {
  id: UUID
  sectorId: UUID
  unitNumber: string
  streetNumber?: string | null
  lat: number
  lng: number
  areaValue?: Decimal | null
  areaUnit?: AreaUnit | null
  type?: PropertyType | null
  createdAt?: DateTime
  updatedAt?: DateTime
}
