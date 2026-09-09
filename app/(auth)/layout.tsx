import { Center, Stack } from "@astryxdesign/core";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Center minHeight="100vh" width="100%">
      <Stack width="100%" maxWidth="440px" gap={4} align="stretch">
        {children}
      </Stack>
    </Center>
  )
}