import { AppShell, Layout, LayoutContent } from "@astryxdesign/core";
import { SideBar } from "@/components/sidebar";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <AppShell sideNav={<SideBar user={user} />}>
      <Layout
        padding={10}
        content={<LayoutContent>{children}</LayoutContent>}
      />
    </AppShell>
  )
}