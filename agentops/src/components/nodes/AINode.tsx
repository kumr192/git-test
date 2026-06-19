"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { NodeShell, type NodeStatus } from "./NodeShell"
import type { WorkflowNodeData, AIConfig } from "@/lib/workflow-types"

export function AINode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData
  const config = nodeData.config as AIConfig
  const model = config?.model?.split("/").pop() ?? "gpt-4o-mini"

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <NodeShell
        nodeType="ai"
        status={(nodeData.status ?? "idle") as NodeStatus}
        selected={selected}
        icon="🤖"
        label={nodeData.label || "AI"}
        output={nodeData.output as string | undefined}
        error={nodeData.error as string | undefined}
      >
        <p className="text-xs text-slate-500 truncate">{model}</p>
        {config?.userPrompt && (
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {config.userPrompt.slice(0, 60)}{config.userPrompt.length > 60 ? "…" : ""}
          </p>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
