"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { NodeShell, type NodeStatus } from "./NodeShell"
import type { WorkflowNodeData, HttpConfig } from "@/lib/workflow-types"

export function HttpNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData
  const config = nodeData.config as HttpConfig

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <NodeShell
        nodeType="http"
        status={(nodeData.status ?? "idle") as NodeStatus}
        selected={selected}
        icon="🌐"
        label={nodeData.label || "HTTP Request"}
        output={nodeData.output as string | undefined}
        error={nodeData.error as string | undefined}
      >
        {config?.url ? (
          <p className="text-xs text-slate-500 truncate">
            <span className="font-medium text-blue-600">{config.method ?? "GET"}</span>{" "}
            {config.url}
          </p>
        ) : (
          <p className="text-xs text-slate-400">No URL configured</p>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
