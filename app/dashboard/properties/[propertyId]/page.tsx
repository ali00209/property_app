import { Badge, Card, Heading, Stack, Text } from "@astryxdesign/core";
import type { BadgeVariant } from "@astryxdesign/core";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getScopedPropertyDetail } from "@/features/property/db-queries";
import { listDealsByProperty } from "@/features/deal/db-queries";
import { formatMoney } from "@/lib/utils";
import type { DealStatus, Property } from "@/types";

const statusVariant: Record<Property["status"], BadgeVariant> = {
  available: "green",
  off_market: "blue",
  archived: "neutral",
  maintenance: "teal",
  occupied: "orange",
  vacant: "blue",
}

const dealStatusVariant: Record<DealStatus, BadgeVariant> = {
  pending_acceptance: "yellow",
  active: "blue",
  completed: "green",
  cancelled: "neutral",
  terminated: "red",
  defaulted: "red",
}

const dealTypeLabels: Record<string, string> = {
  cash_sale: "Cash sale",
  fixed_lease: "Fixed lease",
  periodic_rent: "Periodic rent",
  installment_purchase: "Installment",
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const user = await requireRole(
    "admin",
    "client",
    "accountant",
    "maintenance_staff",
    "owner",
    "property_manager",
    "tenant",
  )
  const property = await getScopedPropertyDetail(user, propertyId)
  if (!property) notFound()

  const deals = await listDealsByProperty(user, propertyId)

  const primaryImage = property.images.find((img) => img.isPrimary)

  return (
    <Stack gap={5}>
      <Stack>
        <Heading level={1}>{property.title}</Heading>
        <Badge
          label={property.status.replace("_", " ")}
          variant={statusVariant[property.status]}
        />
      </Stack>

      {primaryImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={primaryImage.url}
          alt={property.title}
          style={{ width: "100%", maxHeight: 320, objectFit: "cover", borderRadius: 12 }}
        />
      ) : null}

      <Card>
        <Stack gap={3}>
          <Heading level={3}>Overview</Heading>
          <Text type="body">{property.description || "No description."}</Text>
          <Text type="large">
            Price: ${formatMoney(property.price)}
          </Text>
          {property.monthlyRent ? (
            <Text type="large">
              Monthly rent: ${formatMoney(property.monthlyRent)}
            </Text>
          ) : null}
          <Text type="body">Type: {property.type.replace("_", " ")}</Text>
          <Text type="body">
            Listed for: {property.listingPurpose === "sale" ? "Sale" : "Rent"}
          </Text>
          <Text type="body">
            Area: {property.areaValue} {property.areaUnit}
            {property.areaSqft ? ` (${Number(property.areaSqft).toLocaleString()} sq ft)` : ""}
          </Text>
          {property.bedrooms != null ? (
            <Text type="body">Bedrooms: {property.bedrooms}</Text>
          ) : null}
          {property.bathrooms != null ? (
            <Text type="body">Bathrooms: {property.bathrooms}</Text>
          ) : null}
          {property.yearBuilt != null ? (
            <Text type="body">Year built: {property.yearBuilt}</Text>
          ) : null}
        </Stack>
      </Card>

      {property.address ? (
        <Card>
          <Stack gap={2}>
            <Heading level={3}>Location</Heading>
            <Text type="body">
              {[property.address.street, property.address.city, property.address.state, property.address.country]
                .filter(Boolean)
                .join(", ")}
            </Text>
            {property.address.zipCode ? (
              <Text type="body">ZIP: {property.address.zipCode}</Text>
            ) : null}
          </Stack>
        </Card>
      ) : null}

      {property.owners.length > 0 ? (
        <Card>
          <Stack gap={2}>
            <Heading level={3}>Owners</Heading>
            {property.owners.map((owner) => (
              <Stack key={owner.id} gap={1}>
                <Text type="body">{owner.user?.name ?? "Owner"}</Text>
                <Text type="body" color="secondary">
                  {owner.user?.email ?? "—"}
                </Text>
                <Text type="body" color="secondary">
                  {owner.ownershipPercentage ?? 0}% ownership
                </Text>
              </Stack>
            ))}
          </Stack>
        </Card>
      ) : null}

      {property.documents.length > 0 ? (
        <Card>
          <Stack gap={2}>
            <Heading level={3}>Documents</Heading>
            {property.documents.map((doc) => (
              <Text type="body" key={doc.id}>
                <a href={doc.fileUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                  {doc.name}
                </a>{" "}
                ({formatMoney(doc.fileSize ?? 0)} bytes)
              </Text>
            ))}
          </Stack>
        </Card>
      ) : null}

      <Card>
        <Stack gap={3}>
          <Heading level={3}>Related deals</Heading>
{deals.length === 0 ? (
              <Text type="body" color="secondary">
                No deals for this property.
              </Text>
            ) : (
              <Stack gap={2}>
                {deals.map((deal) => (
                  <Stack
                    key={deal.id}
                    direction="horizontal"
                    gap={2}
                    vAlign="center"
                  >
                    <Link href={`/dashboard/deals/${deal.id}`}>
                      <Text type="body">
                        {dealTypeLabels[deal.type] ?? deal.type}
                      </Text>
                    </Link>
                    <Badge
                      label={deal.status.replace("_", " ")}
                      variant={dealStatusVariant[deal.status]}
                    />
                    <Text type="body">
                      {formatMoney(Number(deal.totalAmount))}
                    </Text>
                    {deal.counterpartyName ? (
                      <Text type="body" color="secondary">
                        {deal.counterpartyName}
                      </Text>
                    ) : null}
                  </Stack>
                ))}
              </Stack>
            )}
          </Stack>
        </Card>

    </Stack>
  )
}
