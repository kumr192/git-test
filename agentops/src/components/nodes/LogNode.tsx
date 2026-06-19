"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { NodeShell, type NodeStatus } from "./NodeShell"
import type { WorkflowNodeData, LogConfig } from "@/lib/workflow-types"

export function LogNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData
  const config = nodeData.config as LogConfig

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <NodeShell
        nodeType="log"
        status={(nodeData.status ?? "idle") as NodeStatus}
        selected={selected}
        icon="📋"
        label={nodeData.label || "Log"}
        output={nodeData.output as string | undefined}
        error={nodeData.error as string | undefined}
      >
        {config?.message ? (
          <p className="text-xs text-slate-500 truncate">{config.message}</p>
        ) : (
          <p className="text-xs text-slate-400">No message configured</p>
        )}
      </NodeShell>
    </div>
  )
}
