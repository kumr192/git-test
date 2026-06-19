import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { workflow } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { nanoid } from "@/lib/nanoid"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workflows = await db
    .select()
    .from(workflow)
    .where(eq(workflow.userId, session.user.id))
    .orderBy(workflow.updatedAt)

  return NextResponse.json(workflows)
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const id = nanoid()

  await db.insert(workflow).values({
    id,
    userId: session.user.id,
    name: body.name ?? "Untitled Workflow",
    description: body.description ?? "",
    nodes: JSON.stringify(body.nodes ?? []),
    edges: JSON.stringify(body.edges ?? []),
  })

  const created = await db.select().from(workflow).where(eq(workflow.id, id)).get()
  return NextResponse.json(created, { status: 201 })
}
