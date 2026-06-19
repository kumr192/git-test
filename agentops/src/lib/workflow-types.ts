export type NodeType = "trigger" | "ai" | "branch" | "http" | "log"

export interface TriggerConfig {
  type: "trigger"
}

export interface AIConfig {
  type: "ai"
  model: string
  systemPrompt: string
  userPrompt: string
}

export interface BranchConfig {
  type: "branch"
  field: string
  operator: "eq" | "contains" | "gt" | "lt" | "neq"
  value: string
}

export interface HttpConfig {
  type: "http"
  method: "GET" | "POST" | "PUT" | "DELETE"
  url: string
  body: string
}

export interface LogConfig {
  type: "log"
  message: string
}

export type NodeConfig = TriggerConfig | AIConfig | BranchConfig | HttpConfig | LogConfig

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string
  config: NodeConfig
  // Runtime state — not persisted
  status?: "idle" | "running" | "complete" | "error"
  output?: string
  error?: string
}

export interface WorkflowNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: WorkflowNodeData
}

export interface WorkflowEdge {
  id: string
  source: string
  sourceHandle?: string | null
  target: string
  targetHandle?: string | null
}

export interface ExecutionEvent {
  type: "node_start" | "node_complete" | "node_error" | "flow_complete" | "flow_error"
  nodeId?: string
  nodeType?: NodeType
  output?: string
  error?: string
}

export const AI_MODELS = [
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "anthropic/claude-3-haiku", label: "Claude 3 Haiku" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "mistralai/mistral-7b-instruct", label: "Mistral 7B" },
  { value: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (Free)" },
]
