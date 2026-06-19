import { redirect, notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { db } from "@/lib/db"
import { workflow } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { WorkflowCanvas } from "@/components/WorkflowCanvas"
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow-types"

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/sign-in")

  const { id } = await params

  const wf = await db
    .select()
    .from(workflow)
    .where(and(eq(workflow.id, id), eq(workflow.userId, session.user.id)))
    .get()

  if (!wf) notFound()

  const nodes: WorkflowNode[] = JSON.parse(wf.nodes)
  const edges: WorkflowEdge[] = JSON.parse(wf.edges)

  return (
    <WorkflowCanvas
      workflowId={wf.id}
      workflowName={wf.name}
      initialNodes={nodes}
      initialEdges={edges}
    />
  )
}
