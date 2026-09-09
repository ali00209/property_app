import { requireUser } from "@/lib/auth";
import { SettingsForm } from "@/features/settings/settings-form";

export default async function SettingsPage() {
  await requireUser()
  return <SettingsForm />
}