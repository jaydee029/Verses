import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { MainLayout } from "@/components/main-layout"
import TimelinePage from "./timeline/page"

export default async function Home() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")

  if (!token) {
    redirect("/login")
  }

  return (
    <MainLayout>
      <TimelinePage />
    </MainLayout>
  )
}

