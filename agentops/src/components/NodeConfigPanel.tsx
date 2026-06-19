"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { X } from "lucide-react"
import type { WorkflowNode, AIConfig, BranchConfig, HttpConfig, LogConfig } from "@/lib/workflow-types"
import { AI_MODELS } from "@/lib/workflow-types"

interface ConfigPanelProps {
  node: WorkflowNode
  onClose: () => void
  onUpdate: (nodeId: string, data: Partial<WorkflowNode["data"]>) => void
}

export function NodeConfigPanel({ node, onClose, onUpdate }: ConfigPanelProps) {
  const { data } = node

  function updateConfig(patch: object) {
    onUpdate(node.id, { config: { ...data.config, ...patch } as WorkflowNode["data"]["config"] })
  }

  return (
    <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-base">
            {node.type === "trigger" ? "⚡" :
              node.type === "ai" ? "🤖" :
              node.type === "branch" ? "🔀" :
              node.type === "http" ? "🌐" : "📋"}
          </span>
          <h3 className="font-semibold text-sm text-slate-800 capitalize">{node.type} Node</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Label */}
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input
            value={data.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
            placeholder="Node label"
          />
        </div>

        <Separator />

        {/* Type-specific config */}
        {node.type === "trigger" && (
          <p className="text-sm text-slate-500">
            This node starts the workflow. Click <strong>Run</strong> to execute.
          </p>
        )}

        {node.type === "ai" && (
          <AIConfigForm config={data.config as AIConfig} onChange={updateConfig} />
        )}

        {node.type === "branch" && (
          <BranchConfigForm config={data.config as BranchConfig} onChange={updateConfig} />
        )}

        {node.type === "http" && (
          <HttpConfigForm config={data.config as HttpConfig} onChange={updateConfig} />
        )}

        {node.type === "log" && (
          <LogConfigForm config={data.config as LogConfig} onChange={updateConfig} />
        )}
      </div>

      {/* Template hint */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-[11px] text-slate-400">
          Use <code className="font-mono bg-slate-200 px-1 rounded">{"{{nodeId.output}}"}</code> to reference other nodes.
        </p>
      </div>
    </div>
  )
}

function AIConfigForm({ config, onChange }: { config: AIConfig; onChange: (p: object) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Model</Label>
        <Select value={config?.model ?? "openai/gpt-4o-mini"} onValueChange={(v) => onChange({ model: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AI_MODELS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>System prompt</Label>
        <Textarea
          value={config?.systemPrompt ?? ""}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          placeholder="You are a helpful assistant…"
          className="min-h-[80px] text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label>User prompt</Label>
        <Textarea
          value={config?.userPrompt ?? ""}
          onChange={(e) => onChange({ userPrompt: e.target.value })}
          placeholder="Summarize: {{trigger.output}}"
          className="min-h-[80px] text-sm"
        />
      </div>
    </div>
  )
}

function BranchConfigForm({ config, onChange }: { config: BranchConfig; onChange: (p: object) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Field</Label>
        <Input
          value={config?.field ?? ""}
          onChange={(e) => onChange({ field: e.target.value })}
          placeholder="nodeId.output or output"
        />
        <p className="text-[11px] text-slate-400">e.g. <code>ai_1.output</code></p>
      </div>
      <div className="space-y-1.5">
        <Label>Operator</Label>
        <Select
          value={config?.operator ?? "contains"}
          onValueChange={(v) => onChange({ operator: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eq">equals</SelectItem>
            <SelectItem value="neq">not equals</SelectItem>
            <SelectItem value="contains">contains</SelectItem>
            <SelectItem value="gt">greater than</SelectItem>
            <SelectItem value="lt">less than</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Value</Label>
        <Input
          value={config?.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="expected value"
        />
      </div>
      <p className="text-[11px] text-slate-400">
        Connect the left handle to the <strong>true</strong> path and the right handle to the <strong>false</strong> path.
      </p>
    </div>
  )
}

function HttpConfigForm({ config, onChange }: { config: HttpConfig; onChange: (p: object) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Method</Label>
        <Select
          value={config?.method ?? "GET"}
          onValueChange={(v) => onChange({ method: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>URL</Label>
        <Input
          value={config?.url ?? ""}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://api.example.com/data"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Body (JSON)</Label>
        <Textarea
          value={config?.body ?? ""}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder='{"key": "{{nodeId.output}}"}'
          className="min-h-[80px] text-sm font-mono"
        />
      </div>
    </div>
  )
}

function LogConfigForm({ config, onChange }: { config: LogConfig; onChange: (p: object) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Message</Label>
        <Textarea
          value={config?.message ?? ""}
          onChange={(e) => onChange({ message: e.target.value })}
          placeholder="Result: {{nodeId.output}}"
          className="min-h-[80px] text-sm"
        />
      </div>
    </div>
  )
}
