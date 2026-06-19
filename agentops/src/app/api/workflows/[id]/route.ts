import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { workflow } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { headers } from "next/headers"

async function getWorkflowForUser(id: string, userId: string) {
  return db
    .select()
    .from(workflow)
    .where(and(eq(workflow.id, id), eq(workflow.userId, userId)))
    .get()
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const wf = await getWorkflowForUser(id, session.user.id)
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(wf)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const wf = await getWorkflowForUser(id, session.user.id)
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()

  await db
    .update(workflow)
    .set({
      name: body.name ?? wf.name,
      description: body.description ?? wf.description,
      nodes: body.nodes !== undefined ? JSON.stringify(body.nodes) : wf.nodes,
      edges: body.edges !== undefined ? JSON.stringify(body.edges) : wf.edges,
      updatedAt: new Date(),
    })
    .where(eq(workflow.id, id))

  const updated = await db.select().from(workflow).where(eq(workflow.id, id)).get()
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const wf = await getWorkflowForUser(id, session.user.id)
  if (!wf) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.delete(workflow).where(eq(workflow.id, id))
  return NextResponse.json({ success: true })
}
