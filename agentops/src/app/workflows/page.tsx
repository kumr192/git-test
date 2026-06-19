import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { workflow } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import WorkflowsClient from "./WorkflowsClient"

export default async function WorkflowsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const workflows = await db
    .select()
    .from(workflow)
    .where(eq(workflow.userId, session.user.id))
    .orderBy(workflow.updatedAt)

  return <WorkflowsClient initialWorkflows={workflows} user={session.user} />
}
