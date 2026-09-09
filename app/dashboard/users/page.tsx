import { requireRole } from "@/lib/auth";
import { listUsers } from "@/features/user/db-queries";
import { UserList } from "@/features/user/user-list";

export default async function UsersPage() {
  await requireRole("admin")
  const users = await listUsers()

  return <UserList users={users} />
}