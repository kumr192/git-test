import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { workflow } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { headers } from "next/headers"
import { executeWorkflow } from "@/lib/executor"
import type { WorkflowNode, WorkflowEdge } from "@/lib/workflow-types"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  }

  const { id } = await params
  const wf = await db
    .select()
    .from(workflow)
    .where(and(eq(workflow.id, id), eq(workflow.userId, session.user.id)))
    .get()

  if (!wf) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
  }

  const nodes: WorkflowNode[] = JSON.parse(wf.nodes)
  const edges: WorkflowEdge[] = JSON.parse(wf.edges)
  const apiKey = process.env.OPENROUTER_API_KEY ?? ""

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        for await (const event of executeWorkflow(nodes, edges, apiKey)) {
          send(event)
        }
      } catch (err) {
        send({ type: "flow_error", error: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
