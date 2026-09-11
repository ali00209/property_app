# Property Management Platform

A full-featured property management system for managing real estate portfolios, deals, leases, installments, and maintenance workflows.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** JWT sessions (cookie-based) with bcrypt password hashing
- **UI:** Astryx Design System + Tailwind CSS + Lucide icons
- **Maps:** Leaflet with Leaflet DistortableImage
- **Validation:** Zod + React Hook Form

## Features

- **Property Management** — CRUD for properties with addresses, features, images, and ownership tracking
- **Deal Lifecycle** — Cash sales, fixed leases, periodic rent, and installment purchases with tax policy support
- **Installment Plans** — Template-based installment plans with scheduled payments and allocation tracking
- **Maintenance** — Request tracking with priority, status, cost estimation, and staff assignment
- **Transactions** — Payment recording with principal/tax split, reversals, and ledger history
- **Tax Policies** — Percentage or fixed-amount tax rules with effective date ranges and deal-type applicability
- **Activity Log** — Audit trail for all entity changes
- **Role-Based Access** — Admin, Property Manager, Accountant, Owner, Tenant, Client, Maintenance Staff
- **Map View** — Leaflet-based property visualization with area/sector management
- **File Uploads** — Document and image upload support

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd property_app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets
```

### Database Setup

```bash
# Generate and run migrations
npx drizzle-kit generate
npx drizzle-kit migrate

# (Optional) Seed the database with sample data
npx tsx scripts/seed.ts
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret for signing session tokens | `dev-only-change-me` |
| `JWT_EXPIRE_IN` | Token expiry (e.g., `1d`, `7d`, `24h`) | `1d` |
| `UPLOAD_DIR` | Directory for file uploads | `uploads` |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx drizzle-kit generate` | Generate SQL migrations from schema |
| `npx drizzle-kit migrate` | Apply migrations to database |
| `npx drizzle-kit studio` | Open Drizzle Studio (database GUI) |
| `npx tsx scripts/seed.ts` | Seed database with sample data |

## Project Structure

```
property_app/
├── app/
│   ├── (auth)/              # Login and registration pages
│   ├── api/uploads/         # File upload endpoints
│   ├── dashboard/           # Protected dashboard pages
│   │   ├── properties/      # Property listing and detail
│   │   ├── deals/           # Deal management
│   │   ├── transactions/    # Transaction history
│   │   ├── installments/    # Installment plan management
│   │   ├── maintenance/     # Maintenance requests
│   │   ├── documents/       # Document management
│   │   ├── areas/           # Map areas/sectors
│   │   ├── tax-policies/    # Tax policy configuration
│   │   ├── users/           # User management
│   │   ├── history/         # Activity log
│   │   └── settings/        # User settings
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── src/
│   ├── db/
│   │   ├── index.ts         # Drizzle client
│   │   └── schema.ts        # Database schema
│   ├── features/            # Feature modules
│   │   ├── auth/            # Authentication
│   │   ├── property/        # Property features
│   │   ├── deal/            # Deal management
│   │   ├── transaction/     # Transactions
│   │   ├── maintenance/     # Maintenance
│   │   ├── document/        # Documents
│   │   ├── tax-policy/      # Tax policies
│   │   ├── settings/        # Settings
│   │   └── map/             # Map components
│   ├── lib/                 # Shared utilities
│   │   ├── auth.ts          # Session management
│   │   ├── password.ts      # Password hashing
│   │   ├── upload.ts        # File upload logic
│   │   ├── activity.ts      # Activity logging
│   │   ├── maps.ts          # Map utilities
│   │   └── utils.ts         # General utilities
│   ├── components/          # Shared UI components
│   ├── types/               # TypeScript type definitions
│   └── ...
├── drizzle/                 # Database migrations
├── scripts/                 # Utility scripts
└── ...
```

## Authentication & Roles

The app uses JWT-based session authentication stored in HTTP-only cookies.

| Role | Access |
|------|--------|
| `admin` | Full access to all modules |
| `property_manager` | Properties, deals, history |
| `accountant` | Properties, deals, transactions, tax policies, history |
| `owner` | Properties, deals |
| `tenant` | Properties, deals |
| `client` | Properties, deals, installments |
| `maintenance_staff` | Properties, maintenance |

## Database Schema Overview

The schema covers:

- **Core:** `roles`, `users`, `addresses`, `localities`
- **Properties:** `properties`, `propertyFeatures`, `propertyImages`, `propertyOwner`
- **Deals:** `deals`, `dealSaleDetails`, `dealLeaseDetails`, `dealInstallmentDetails`, `dealPayments`, `dealPaymentSchedules`, `dealPaymentAllocations`, `dealDocuments`, `dealAcceptances`, `dealSettlements`, `dealTaxSnapshots`, `dealAuditLogs`
- **Legacy/Compatibility:** `transactions`, `leases`, `purchaseRequests`, `purchaseContracts`, `scheduledInstallments`, `paymentLedger`, `installmentPlanTemplates`, `propertyInstallmentPlans`
- **Tax:** `taxPolicies`, `propertyTaxAssignments`
- **Other:** `maintenance`, `documents`, `activity`, `userBankAccounts`

See `src/db/schema.ts` for full details.

## License

Private — All rights reserved.
