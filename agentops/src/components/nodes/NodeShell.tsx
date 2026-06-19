"use client"

import { cn } from "@/lib/utils"
import type { NodeType } from "@/lib/workflow-types"
import { CheckCircle2, XCircle, Loader2, Circle } from "lucide-react"

export type NodeStatus = "idle" | "running" | "complete" | "error"

const NODE_COLORS: Record<NodeType, string> = {
  trigger: "bg-emerald-50 border-emerald-300",
  ai: "bg-purple-50 border-purple-300",
  branch: "bg-amber-50 border-amber-300",
  http: "bg-blue-50 border-blue-300",
  log: "bg-slate-50 border-slate-300",
}

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "",
  running: "ring-2 ring-blue-400 ring-offset-1",
  complete: "ring-2 ring-emerald-400 ring-offset-1",
  error: "ring-2 ring-red-400 ring-offset-1",
}

function StatusIcon({ status }: { status: NodeStatus }) {
  if (status === "running") return <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
  if (status === "complete") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
  if (status === "error") return <XCircle className="w-3.5 h-3.5 text-red-500" />
  return <Circle className="w-3.5 h-3.5 text-slate-300" />
}

interface NodeShellProps {
  nodeType: NodeType
  status: NodeStatus
  selected?: boolean
  icon: React.ReactNode
  label: string
  output?: string
  error?: string
  children?: React.ReactNode
}

export function NodeShell({ nodeType, status, selected, icon, label, output, error, children }: NodeShellProps) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 shadow-sm min-w-[200px] max-w-[280px] bg-white transition-all",
        NODE_COLORS[nodeType],
        STATUS_COLORS[status],
        selected && "shadow-md"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-inherit">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-semibold text-slate-800 flex-1 truncate">{label}</span>
        <StatusIcon status={status} />
      </div>

      {/* Body */}
      {children && <div className="px-3 py-2">{children}</div>}

      {/* Output */}
      {(output || error) && (
        <div className="px-3 pb-2.5">
          <div className={cn(
            "text-xs rounded-md px-2 py-1.5 font-mono break-words whitespace-pre-wrap max-h-20 overflow-auto",
            error ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-600"
          )}>
            {error ?? output}
          </div>
        </div>
      )}
    </div>
  )
}
