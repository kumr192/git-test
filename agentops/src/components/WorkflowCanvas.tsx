"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { TriggerNode } from "@/components/nodes/TriggerNode"
import { AINode } from "@/components/nodes/AINode"
import { BranchNode } from "@/components/nodes/BranchNode"
import { HttpNode } from "@/components/nodes/HttpNode"
import { LogNode } from "@/components/nodes/LogNode"
import { NodeConfigPanel } from "@/components/NodeConfigPanel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { WorkflowNode, WorkflowEdge, ExecutionEvent, NodeType, WorkflowNodeData } from "@/lib/workflow-types"
import { toast } from "sonner"
import { nanoid } from "@/lib/nanoid"
import {
  Play, Save, ArrowLeft, Zap, Plus,
  Bot, GitBranch, Globe, FileText,
} from "lucide-react"
import Link from "next/link"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = {
  trigger: TriggerNode,
  ai: AINode,
  branch: BranchNode,
  http: HttpNode,
  log: LogNode,
}

const NODE_DEFAULTS: Record<NodeType, Partial<WorkflowNodeData>> = {
  trigger: { label: "Trigger", config: { type: "trigger" } },
  ai: { label: "AI", config: { type: "ai", model: "openai/gpt-4o-mini", systemPrompt: "", userPrompt: "" } },
  branch: { label: "Branch", config: { type: "branch", field: "output", operator: "contains", value: "" } },
  http: { label: "HTTP Request", config: { type: "http", method: "GET", url: "", body: "" } },
  log: { label: "Log", config: { type: "log", message: "" } },
}

function toReactFlowNode(wn: WorkflowNode): Node {
  return { ...wn, type: wn.type } as unknown as Node
}

function fromReactFlowNode(n: Node): WorkflowNode {
  return n as unknown as WorkflowNode
}

interface CanvasProps {
  workflowId: string
  workflowName: string
  initialNodes: WorkflowNode[]
  initialEdges: WorkflowEdge[]
}

function CanvasInner({ workflowId, workflowName, initialNodes, initialEdges }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes.map(toReactFlowNode))
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges as Edge[])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "complete" | "error">("idle")
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
    ? fromReactFlowNode(nodes.find((n) => n.id === selectedNodeId)!)
    : null

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "#94a3b8", strokeWidth: 2 },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  function addNode(type: NodeType) {
    const id = `${type}_${nanoid(8)}`
    const defaults = NODE_DEFAULTS[type]
    const newNode: Node = {
      id,
      type,
      position: { x: 200 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: { ...defaults, status: "idle" },
    }
    setNodes((nds) => [...nds, newNode])
  }

  function updateNodeData(nodeId: string, patch: Partial<WorkflowNodeData>) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
      )
    )
  }

  function clearRunState() {
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, status: "idle", output: undefined, error: undefined } }))
    )
  }

  async function save() {
    setSaving(true)
    try {
      const wfNodes = nodes.map(fromReactFlowNode)
      // Strip runtime state before saving
      const cleanNodes = wfNodes.map((n) => ({
        ...n,
        data: { ...n.data, status: undefined, output: undefined, error: undefined },
      }))
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: cleanNodes, edges }),
      })
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  // Auto-save after changes settle
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(save, 1500)
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges])

  async function runWorkflow() {
    clearRunState()
    setRunning(true)
    setRunStatus("running")

    // Save first so the server gets latest state
    const wfNodes = nodes.map(fromReactFlowNode)
    const cleanNodes = wfNodes.map((n) => ({
      ...n,
      data: { ...n.data, status: undefined, output: undefined, error: undefined },
    }))
    await fetch(`/api/workflows/${workflowId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes: cleanNodes, edges }),
    })

    const res = await fetch(`/api/workflows/${workflowId}/run`, { method: "POST" })
    if (!res.ok || !res.body) {
      toast.error("Failed to start workflow")
      setRunning(false)
      setRunStatus("error")
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        try {
          const event: ExecutionEvent = JSON.parse(line.slice(6))
          handleExecutionEvent(event)
        } catch {
          // ignore parse errors
        }
      }
    }

    setRunning(false)
  }

  function handleExecutionEvent(event: ExecutionEvent) {
    if (event.type === "node_start" && event.nodeId) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === event.nodeId
            ? { ...n, data: { ...n.data, status: "running", output: undefined, error: undefined } }
            : n
        )
      )
    } else if (event.type === "node_complete" && event.nodeId) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === event.nodeId
            ? { ...n, data: { ...n.data, status: "complete", output: event.output } }
            : n
        )
      )
    } else if (event.type === "node_error" && event.nodeId) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === event.nodeId
            ? { ...n, data: { ...n.data, status: "error", error: event.error } }
            : n
        )
      )
      toast.error(`Error in node: ${event.error}`)
      setRunStatus("error")
    } else if (event.type === "flow_complete") {
      setRunStatus("complete")
      toast.success("Workflow completed")
    } else if (event.type === "flow_error") {
      setRunStatus("error")
      toast.error(`Workflow error: ${event.error}`)
    }
  }

  const nodeLibrary: { type: NodeType; label: string; icon: React.ReactNode; color: string }[] = [
    { type: "trigger", label: "Trigger", icon: <Zap className="w-3.5 h-3.5" />, color: "text-emerald-600" },
    { type: "ai", label: "AI", icon: <Bot className="w-3.5 h-3.5" />, color: "text-purple-600" },
    { type: "branch", label: "Branch", icon: <GitBranch className="w-3.5 h-3.5" />, color: "text-amber-600" },
    { type: "http", label: "HTTP", icon: <Globe className="w-3.5 h-3.5" />, color: "text-blue-600" },
    { type: "log", label: "Log", icon: <FileText className="w-3.5 h-3.5" />, color: "text-slate-600" },
  ]

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-slate-200 z-10 shrink-0">
        <Link href="/workflows">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 bg-slate-900 rounded flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold text-sm text-slate-800">{workflowName}</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Node add buttons */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1 bg-slate-50">
            <span className="text-xs text-slate-400 mr-1">Add:</span>
            {nodeLibrary.map(({ type, label, icon, color }) => (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-xs gap-1.5 ${color}`}
                onClick={() => addNode(type)}
              >
                {icon}
                {label}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={save}
            disabled={saving}
            className="h-8"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save"}
          </Button>

          <Button
            size="sm"
            onClick={runWorkflow}
            disabled={running}
            className={`h-8 ${runStatus === "complete" ? "bg-emerald-600 hover:bg-emerald-700" : runStatus === "error" ? "bg-red-600 hover:bg-red-700" : ""}`}
          >
            <Play className="w-3.5 h-3.5" />
            {running ? "Running…" : "Run"}
          </Button>

          {runStatus !== "idle" && !running && (
            <Badge
              variant={runStatus === "complete" ? "success" : "destructive"}
              className="text-xs"
            >
              {runStatus}
            </Badge>
          )}
        </div>
      </header>

      {/* Canvas + panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: "#94a3b8", strokeWidth: 2 },
            }}
            className="bg-slate-50"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
            <Controls className="!bg-white !border-slate-200 !shadow-sm" />
            <MiniMap
              className="!bg-white !border !border-slate-200"
              nodeColor={(n) => {
                const colors: Record<string, string> = {
                  trigger: "#10b981",
                  ai: "#a855f7",
                  branch: "#f59e0b",
                  http: "#3b82f6",
                  log: "#64748b",
                }
                return colors[n.type ?? ""] ?? "#94a3b8"
              }}
            />
          </ReactFlow>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-2">Canvas is empty</p>
                <p className="text-slate-300 text-xs">Add nodes from the toolbar above</p>
              </div>
            </div>
          )}
        </div>

        {/* Config panel */}
        {selectedNode && (
          <NodeConfigPanel
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onUpdate={updateNodeData}
          />
        )}
      </div>
    </div>
  )
}

export function WorkflowCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}
