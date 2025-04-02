import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { MainLayout } from "@/components/main-layout"
import { UserProfile } from "@/components/user-profile"
import { getUserProfile } from "@/lib/api"

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const {username} = await params;
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")

  if (!token) {
    redirect("/login")
  }

  const userData = await getUserProfile(username, token.value)

  return (
    <MainLayout>
      <UserProfile user={userData} />
    </MainLayout>
  )
}

