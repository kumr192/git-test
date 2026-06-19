"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { NodeShell, type NodeStatus } from "./NodeShell"
import type { WorkflowNodeData } from "@/lib/workflow-types"

export function TriggerNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData
  return (
    <div>
      <NodeShell
        nodeType="trigger"
        status={(nodeData.status ?? "idle") as NodeStatus}
        selected={selected}
        icon="⚡"
        label={nodeData.label || "Trigger"}
        output={nodeData.output as string | undefined}
        error={nodeData.error as string | undefined}
      >
        <p className="text-xs text-slate-500">Flow starts here</p>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
