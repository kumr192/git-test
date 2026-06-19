"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { NodeShell, type NodeStatus } from "./NodeShell"
import type { WorkflowNodeData, BranchConfig } from "@/lib/workflow-types"

export function BranchNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData
  const config = nodeData.config as BranchConfig

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <NodeShell
        nodeType="branch"
        status={(nodeData.status ?? "idle") as NodeStatus}
        selected={selected}
        icon="🔀"
        label={nodeData.label || "Branch"}
        output={nodeData.output as string | undefined}
        error={nodeData.error as string | undefined}
      >
        {config?.field && (
          <p className="text-xs text-slate-500 truncate">
            {config.field} {config.operator} &quot;{config.value}&quot;
          </p>
        )}
      </NodeShell>
      {/* True path */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: "30%" }}
      />
      {/* False path */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: "70%" }}
      />
      {/* Labels */}
      <div className="absolute -bottom-5 left-0 right-0 flex justify-around text-[10px] text-slate-400 pointer-events-none">
        <span style={{ marginLeft: "-10px" }}>true</span>
        <span style={{ marginRight: "-10px" }}>false</span>
      </div>
    </div>
  )
}
