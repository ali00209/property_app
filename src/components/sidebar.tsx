"use client";

import {
  Avatar,
  Button,
  Card,
  IconButton,
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
  Stack,
  Text,
} from "@astryxdesign/core";
import {
  ArrowLeftRight,
  Building2,
  ClipboardList,
  FileText,
  Handshake,
  History,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Receipt,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/features/auth/actions";
import type { SessionUser, UserRole } from "@/types";

const navItems: Array<{
  href: string
  label: string
  role: UserRole[]
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    href: "/dashboard",
    label: "Dashboard",
    role: ["admin"],
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/properties",
    label: "Properties",
    role: [
      "admin",
      "client",
      "accountant",
      "maintenance_staff",
      "owner",
      "property_manager",
      "tenant",
    ],
    icon: Building2,
  },
  {
    href: "/dashboard/deals",
    label: "Deals",
    role: ["admin", "client", "accountant", "owner", "property_manager", "tenant"],
    icon: Handshake,
  },
  {
    href: "/dashboard/transactions",
    label: "Transactions",
    role: ["admin", "accountant"],
    icon: ArrowLeftRight,
  },
  {
    href: "/dashboard/tax-policies",
    label: "Tax policies",
    role: ["admin", "accountant"],
    icon: Receipt,
  },
  {
    href: "/dashboard/installments",
    label: "Installments",
    role: ["admin", "client"],
    icon: ClipboardList,
  },
  {
    href: "/dashboard/documents",
    label: "Documents",
    role: ["admin"],
    icon: FileText,
  },
  {
    href: "/dashboard/history",
    label: "Activities",
    role: ["admin", "accountant", "property_manager"],
    icon: History,
  },
  {
    href: "/dashboard/users",
    label: "Users",
    role: ["admin"],
    icon: Users,
  },
  {
    href: "/dashboard/maintenance",
    label: "Maintenances",
    role: ["admin", "maintenance_staff"],
    icon: Wrench,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    role: [
      "admin",
      "client",
      "accountant",
      "maintenance_staff",
      "owner",
      "property_manager",
      "tenant",
    ],
    icon: Settings,
  },
]

export function SideBar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = async () => {
    await logoutAction()
  }

  return (
    <SideNav
      header={
        !isCollapsed ? (
          <SideNavHeading
            heading="Property"
            role="Company"
            icon={<Building2 />}
            headingHref="/dashboard"
          />
        ) : (
          <Building2 size={32} href="/dashboard" />
        )
      }
      collapsible={{ hasButton: false, isCollapsed }}
      footer={
        <>
          {!isCollapsed ? (
            <>
              <Card>
                <Stack direction="horizontal" gap={3}>
                  <Avatar name={user.name} alt="User" size="md" />
                  <Stack>
                    <Text type="label" color="primary">
                      {user.name}
                    </Text>
                    <Text type="supporting" color="secondary">
                      {user.role}
                    </Text>
                  </Stack>
                </Stack>
              </Card>
              <Button
                icon={<LogOut />}
                label="Sign Out"
                tooltip="Sign Out"
                onClick={handleLogout}
                variant="ghost"
              />
            </>
          ) : (
            <>
              <Avatar name={user.name} alt="User" size="md" />
              <IconButton
                icon={<LogOut />}
                label=""
                tooltip="Sign Out"
                onClick={handleLogout}
                variant="ghost"
              />
            </>
          )}
        </>
      }
    >
      <SideNavSection title="Main" isHeaderHidden>
        {navItems
          .filter((item) => item.role.includes(user.role))
          .map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)
            return (
              <SideNavItem
                key={item.href}
                label={item.label}
                icon={item.icon}
                href={item.href}
                isSelected={isActive}
              />
            )
          })}
      </SideNavSection>
    </SideNav>
  )
}