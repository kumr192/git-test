import type { WorkflowNode, WorkflowEdge, ExecutionEvent, AIConfig, BranchConfig, HttpConfig, LogConfig } from "./workflow-types"
import { resolveTemplate } from "./utils"

type Context = Record<string, { output: string }>

function buildAdjacency(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const adj: Record<string, { nodeId: string; handle: string | null | undefined }[]> = {}
  for (const n of nodes) adj[n.id] = []
  for (const e of edges) {
    if (!adj[e.source]) adj[e.source] = []
    adj[e.source].push({ nodeId: e.target, handle: e.sourceHandle })
  }
  return adj
}

async function executeNode(
  node: WorkflowNode,
  context: Context,
  apiKey: string
): Promise<{ output: string; branchResult?: boolean }> {
  const { config } = node.data

  if (config.type === "trigger") {
    return { output: "Flow started" }
  }

  if (config.type === "ai") {
    const cfg = config as AIConfig
    const userPrompt = resolveTemplate(cfg.userPrompt || "", context)
    const systemPrompt = resolveTemplate(cfg.systemPrompt || "", context)

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://agentops.dev",
        "X-Title": "AgentOps",
      },
      body: JSON.stringify({
        model: cfg.model || "openai/gpt-4o-mini",
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: userPrompt || "Hello" },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenRouter error ${res.status}: ${err}`)
    }

    const json = await res.json()
    return { output: json.choices?.[0]?.message?.content ?? "" }
  }

  if (config.type === "branch") {
    const cfg = config as BranchConfig
    const field = cfg.field || "output"
    // Resolve field from context — support "nodeId.output" or just "output" (last node)
    let fieldValue = ""
    if (field.includes(".")) {
      const [nId, prop] = field.split(".")
      fieldValue = prop === "output" ? (context[nId]?.output ?? "") : ""
    } else {
      // Find most recent non-branch node
      const values = Object.values(context)
      fieldValue = values[values.length - 1]?.output ?? ""
    }

    const compareValue = resolveTemplate(cfg.value || "", context)
    let result = false

    switch (cfg.operator) {
      case "eq":
        result = fieldValue === compareValue
        break
      case "neq":
        result = fieldValue !== compareValue
        break
      case "contains":
        result = fieldValue.toLowerCase().includes(compareValue.toLowerCase())
        break
      case "gt":
        result = parseFloat(fieldValue) > parseFloat(compareValue)
        break
      case "lt":
        result = parseFloat(fieldValue) < parseFloat(compareValue)
        break
    }

    return { output: result ? "true" : "false", branchResult: result }
  }

  if (config.type === "http") {
    const cfg = config as HttpConfig
    const url = resolveTemplate(cfg.url || "", context)
    const body = cfg.body ? resolveTemplate(cfg.body, context) : undefined

    const res = await fetch(url, {
      method: cfg.method || "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body || undefined,
    })

    const text = await res.text()
    return { output: text }
  }

  if (config.type === "log") {
    const cfg = config as LogConfig
    const message = resolveTemplate(cfg.message || "", context)
    return { output: message }
  }

  return { output: "" }
}

export async function* executeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  apiKey: string
): AsyncGenerator<ExecutionEvent> {
  const adj = buildAdjacency(nodes, edges)
  const context: Context = {}

  // Find trigger node
  const trigger = nodes.find((n) => n.type === "trigger")
  if (!trigger) {
    yield { type: "flow_error", error: "No trigger node found" }
    return
  }

  // BFS traversal — track branch routing
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]))
  const queue: { nodeId: string; fromBranchResult?: boolean }[] = [{ nodeId: trigger.id }]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const { nodeId, fromBranchResult } = queue.shift()!
    if (visited.has(nodeId)) continue
    visited.add(nodeId)

    const node = nodeMap[nodeId]
    if (!node) continue

    yield { type: "node_start", nodeId, nodeType: node.type }

    try {
      const result = await executeNode(node, context, apiKey)
      context[nodeId] = { output: result.output }
      yield { type: "node_complete", nodeId, nodeType: node.type, output: result.output }

      // Enqueue children
      const children = adj[nodeId] ?? []
      if (node.type === "branch") {
        // Route based on branch result
        for (const child of children) {
          const shouldFollow =
            (result.branchResult && child.handle === "true") ||
            (!result.branchResult && child.handle === "false")
          if (shouldFollow) {
            queue.push({ nodeId: child.nodeId, fromBranchResult: result.branchResult })
          }
        }
      } else {
        for (const child of children) {
          queue.push({ nodeId: child.nodeId })
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      yield { type: "node_error", nodeId, nodeType: node.type, error }
      // Stop on error
      break
    }
  }

  yield { type: "flow_complete" }
}
