export function formatMoney(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value
  if (!Number.isFinite(num)) return "—"
  return num.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })
}

export function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? Number(value) : value
  if (!Number.isFinite(num)) return "—"
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toLocaleString()}`
}

export function moneyString(value: number | string): string {
  return Number(value).toFixed(2)
}

export function currency(
  value: string | number | null | undefined,
  currencyCode = "PKR",
): string {
  if (value === null || value === undefined || value === "") return "—"
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(Number(value))
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error("DATABASE_URL is required")
    process.exit(1);
  }

return url
}
