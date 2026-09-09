import { Card, Heading, Stack, Text } from "@astryxdesign/core";
import { requireUser } from "@/lib/auth";

export async function Placeholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  await requireUser()
  return (
    <Stack gap={3}>
      <Heading level={1}>{title}</Heading>
      <Text type="body">{description}</Text>
      <Card>
        <Text color="secondary">This section is under active development.</Text>
      </Card>
    </Stack>
  )
}
