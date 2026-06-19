import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveTemplate(template: string, context: Record<string, { output: string }>): string {
  return template.replace(/\{\{(\w+)\.output\}\}/g, (_, nodeId) => {
    return context[nodeId]?.output ?? `{{${nodeId}.output}}`
  })
}
