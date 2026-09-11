import { Badge, Card, Heading, Stack, Text } from "@astryxdesign/core";
import type { BadgeVariant } from "@astryxdesign/core";
import {
  ArrowLeftRight,
  Building2,
  Clock,
  DollarSign,
  FileText,
  TrendingUp,
} from "lucide-react";
import { count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { listProperties } from "@/features/property/db-queries";
import { formatCurrency } from "@/lib/utils";
import type { Property } from "@/types";

const statusVariant: Record<Property["status"], BadgeVariant> = {
  available: "green",
  off_market: "blue",
  archived: "neutral",
  maintenance: "teal",
  occupied: "orange",
  vacant: "blue",
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <Card width="40%">
      <Stack direction="horizontal" gap={2}>
        <Stack direction="vertical">
          <Heading level={4}>{label}</Heading>
          <Text type="large">{value}</Text>
          {sub && <Text type="body">{sub}</Text>}
        </Stack>
        <Icon />
      </Stack>
    </Card>
  )
}

export default async function DashboardPage() {
  const user = await requireUser()
  const properties = await listProperties(user)

  const visible = properties.filter((p) => p.status !== "archived")
  const totalProperties = visible.length
  const availableProperties = visible.filter(
    (p) => p.status === "available",
  ).length
  const portfolioValue = visible.reduce(
    (sum, p) => sum + Number(p.price),
    0,
  )

  const [[paymentsCountRow], [pendingDealsRow], [reversedRow]] =
    await Promise.all([
      db.select({ total: count() }).from(schema.dealPayments),
      db
        .select({ total: count() })
        .from(schema.deals)
        .where(eq(schema.deals.status, "pending_acceptance")),
      db
        .select({ total: count() })
        .from(schema.dealPayments)
        .where(eq(schema.dealPayments.status, "reversed")),
    ])
  const totalTransactions = paymentsCountRow?.total ?? 0
  const pendingTransactions = pendingDealsRow?.total ?? 0
  const reversedTransactions = reversedRow?.total ?? 0

  const totalDocuments = properties.reduce(
    (sum, p) => sum + p.documents.length,
    0,
  )

  const statusCounts = visible.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})
  const typeCounts = visible.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1
    return acc
  }, {})

  return (
    <Stack gap={3}>
      <Stack>
        <Heading level={1}>Dashboard</Heading>
        <Text type="body">Overview of your property portfolio</Text>
      </Stack>

      <Stack direction="horizontal" hAlign="evenly" gap={3}>
        <StatCard
          icon={Building2}
          label="Total Properties"
          value={totalProperties}
          sub={`${availableProperties} available`}
        />
        <StatCard
          icon={DollarSign}
          label="Portfolio Value"
          value={formatCurrency(portfolioValue)}
        />
        <StatCard
          icon={ArrowLeftRight}
          label="Transactions"
          value={totalTransactions}
          sub={`${reversedTransactions} reversed`}
        />
        <StatCard icon={FileText} label="Documents" value={totalDocuments} />
        <StatCard
          icon={TrendingUp}
          label="Available"
          value={availableProperties}
          sub="Properties for deal"
        />
        <StatCard
          icon={Clock}
          label="Pending Deals"
          value={pendingTransactions}
          sub="Awaiting action"
        />
      </Stack>

      <Stack direction="horizontal" gap={3}>
        <Card width="100%">
          <Heading level={3}>Property Status</Heading>
          {visible.length > 0 ? (
            <Stack gap={2}>
              {visible.map((p) => (
                <Text type="body" key={p.id}>
                  {p.title}:{" "}
                  <Badge
                    label={p.status.replace("_", " ")}
                    variant={statusVariant[p.status]}
                  />
                </Text>
              ))}
            </Stack>
          ) : (
            <Stack gap={2}>
              {Object.entries(statusCounts).map(([status, count]) => (
                <Text type="body" key={status}>
                  <span>{status.replace("_", " ")}</span>: {count}
                </Text>
              ))}
            </Stack>
          )}
        </Card>

        <Card width="100%">
          <Heading level={3}>Property Types</Heading>
          {visible.length > 0 ? (
            <Stack gap={2}>
              {visible.map((p) => (
                <Text type="body" key={p.id}>
                  {p.title}: {p.type.replace("_", " ")}
                </Text>
              ))}
            </Stack>
          ) : (
            <Stack gap={2}>
              {Object.entries(typeCounts).map(([type, count]) => (
                <Text type="body" key={type}>
                  <span>{type.replace("_", " ")}</span>: {count}
                </Text>
              ))}
            </Stack>
          )}
        </Card>
      </Stack>
    </Stack>
  )
}