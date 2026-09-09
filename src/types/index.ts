export type UUID = string
export type DateTime = string
export type Decimal = string

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
  | 'plot'
  | 'apartment'
  | 'house'
  | 'office'
  | 'warehouse'
  | 'mixed_use'

export type PropertyStatus =
  | 'available'
  | 'sold'
  | 'leased'
  | 'rented'
  | 'under_contract'
  | 'off_market'
  | 'occupied'
  | 'vacant'
  | 'maintenance'
  | 'archived'

export interface Role {
  id: UUID
  role: string
  createdAt?: DateTime
  updatedAt?: DateTime
}

export interface User {
  id: UUID
  name: string
  email: string
  role: string
  roleId: UUID
  avatarUrl?: string | null
  phone?: string | null
  createdAt?: DateTime
  updatedAt?: DateTime
}

export interface SessionUser {
  id: UUID
  name: string
  email: string
  role: UserRole
}

export interface Address {
  id?: UUID
  entityId?: UUID
  entityType?: string
  street: string
  area?: string | null
  state: string
  city: string | null
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

export type TransactionStatus = 'paid' | 'pending' | 'overdue' | 'partial' | 'refunded'

export interface Transaction {
  id: UUID
  propertyId: UUID
  ownerId: UUID
  tenentId: UUID
  status: TransactionStatus
  amount: number
  notes: string
  paymentMethod: string
  createdAt?: DateTime
  updatedAt?: DateTime
}

export interface Lease {
  id: UUID
  propertyId: UUID
  tenentId?: UUID | null
  startDate?: string | null
  endDate?: string | null
  monthlyRent?: number | null
  deposit?: number | null
  createdAt?: DateTime
  updatedAt?: DateTime
}

export interface Property {
  id: UUID
  title: string
  description?: string | null
  type: PropertyType
  status: PropertyStatus
  price: Decimal
  monthlyRent?: Decimal | null
  area: number
  bedrooms?: number | null
  bathrooms?: number | null
  yearBuilt?: number | null
  parcelNumber?: string | null
  createdAt?: DateTime
  updatedAt?: DateTime
}

export type PropertyDetail = Property & {
  address: Address | null
  features: PropertyFeatures[]
  owner: PropertyOwner | null
  images: PropertyImage[]
  documents: Document[]
  transactions: Transaction[]
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
  taxAmount: Decimal
  taxPayer: string
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
  frequency: DealFrequency
  fixedTerm: boolean
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

export interface DealDocument {
  id: UUID
  dealId: UUID
  name: string
  fileType: string
  fileSize?: number | null
  fileUrl?: string | null
  uploadedBy?: UUID | null
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

export interface DealTaxSnapshot {
  id: UUID
  dealId: UUID
  policyId: UUID
  policyName: string
  policyKind: 'percentage' | 'fixed_amount'
  policyValue: Decimal
  policyCode?: string | null
  authority?: string | null
  baseAmount: Decimal
  taxAmount: Decimal
  currency: string
  createdAt?: DateTime
}

export interface DealAuditLog {
  id: UUID
  dealId: UUID
  action: string
  actorId?: UUID | null
  details?: Record<string, unknown> | null
  createdAt?: DateTime
}

export interface DealDetail extends Deal {
  property: Property | null
  sale?: DealSaleDetails | null
  lease?: DealLeaseDetails | null
  installment?: DealInstallmentDetails | null
  payments: DealPayment[]
  documents: DealDocument[]
  acceptances: DealAcceptance[]
  taxes: DealTaxSnapshot[]
  paymentSchedule: DealSchedule[]
  paymentAllocations: DealAllocation[]
  settlements: DealSettlement[]
  auditLogs: DealAuditLog[]
}

export interface DealOption {
  id: UUID
  role: string
  name: string
}

export interface InstallmentPlanOption {
  id: UUID
  propertyId: UUID
  propertyTitle: string
  planName: string
  price: Decimal
  termMonths: number
  frequency: DealFrequency
  downPaymentAmount: Decimal
  installmentAmount: Decimal
  status: string
}

export type TaxPolicyKind = "percentage" | "fixed_amount"

export interface TaxPolicy {
  id: UUID
  name: string
  kind: TaxPolicyKind
  value: Decimal
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
  appliesTo: DealType[]
  effectiveStart: string | null
  effectiveEnd: string | null
  authority: string | null
}

export interface DealTaxCandidates {
  byProperty: Record<string, PolicyMeta[]>
  fallback: PolicyMeta[]
}

export type InstallmentPlanStatus = "published" | "archived" | "draft"

export interface InstallmentPlan {
  id: UUID
  name: string
  description: string | null
  frequency: DealFrequency
  termMonths: number
  downPaymentPercent: Decimal
  interestRate: Decimal
  status: InstallmentPlanStatus
  createdBy: UUID | null
  createdAt: DateTime
  updatedAt: DateTime
}

export interface InstallmentAssignment {
  id: UUID
  propertyId: UUID
  propertyTitle: string
  templateId: UUID
  planName: string
  price: Decimal
  downPaymentAmount: Decimal
  installmentAmount: Decimal
  status: InstallmentPlanStatus
  createdAt: DateTime
  updatedAt: DateTime
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
  | "transactions"
  | "leases"
  | "maintenance"
  | "documents"

export interface ActivityItem {
  id: UUID
  action: ActivityAction
  details?: string | null
  entityType: ActivityEntityType
  entityId: UUID
  doneBy?: UUID | null
  doneByName?: string | null
  entityLabel?: string | null
  createdAt?: DateTime
}

export type PurchaseRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"

export interface PublishedPlanAssignment {
  id: UUID
  propertyId: UUID
  propertyTitle: string
  planName: string
  price: Decimal
  downPaymentAmount: Decimal
  installmentAmount: Decimal
  frequency: DealFrequency
  termMonths: number
  downPaymentPercent: Decimal
  interestRate: Decimal
}

export interface PurchaseRequest {
  id: UUID
  propertyId: UUID
  propertyTitle: string
  planName: string
  price: Decimal
  downPaymentAmount: Decimal
  installmentAmount: Decimal
  buyerName: string
  status: PurchaseRequestStatus
  note?: string | null
  rejectionReason?: string | null
  reviewedByName?: string | null
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
  city: string
  area: string
  lat: number
  lng: number
  count: number
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
  lat: number
  lng: number
}

export interface MapPayload {
  cities: MapCity[]
  areas: MapArea[]
  properties: MapProperty[]
}
