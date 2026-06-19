"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { signOut } from "@/lib/auth-client"
import { toast } from "sonner"
import { Plus, Workflow, Trash2, LogOut, Zap } from "lucide-react"

interface WorkflowRow {
  id: string
  name: string
  description: string | null
  updatedAt: Date | null
}

interface User {
  name: string
  email: string
}

export default function WorkflowsClient({
  initialWorkflows,
  user,
}: {
  initialWorkflows: WorkflowRow[]
  user: User
}) {
  const router = useRouter()
  const [workflows, setWorkflows] = useState(initialWorkflows)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error("Failed to create")
      const created = await res.json()
      setCreateOpen(false)
      setNewName("")
      router.push(`/workflows/${created.id}`)
    } catch {
      toast.error("Failed to create workflow")
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeletingId(id)
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      toast.success("Workflow deleted")
    } catch {
      toast.error("Failed to delete workflow")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push("/sign-in")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">AgentOps</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user.name}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Workflows</h1>
            <p className="text-slate-500 mt-1">Build and run AI-powered automations</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            New workflow
          </Button>
        </div>

        {workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <Workflow className="w-7 h-7 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-700 mb-1">No workflows yet</h2>
            <p className="text-slate-400 mb-6">Create your first workflow to get started</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="w-4 h-4" />
              Create workflow
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workflows.map((wf) => (
              <Card
                key={wf.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 group"
                onClick={() => router.push(`/workflows/${wf.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center mb-2">
                      <Workflow className="w-4 h-4 text-slate-600" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-slate-400 hover:text-red-500"
                      onClick={(e) => handleDelete(wf.id, e)}
                      disabled={deletingId === wf.id}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <CardTitle className="text-base">{wf.name}</CardTitle>
                  {wf.description && (
                    <CardDescription className="line-clamp-2">{wf.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-400">
                    {wf.updatedAt
                      ? `Updated ${new Date(wf.updatedAt).toLocaleDateString()}`
                      : "Just created"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New workflow</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 mt-2">
            <Input
              placeholder="Workflow name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newName.trim()}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
