/* WebMCP API — https://webmachinelearning.github.io/webmcp/ */

interface ModelContextClient {
  requestUserInteraction(callback: () => Promise<unknown>): Promise<unknown>
}

interface ToolAnnotations {
  readOnlyHint?: boolean
}

interface ModelContextTool {
  name: string
  title?: string
  description: string
  inputSchema?: Record<string, unknown>
  execute: (input: Record<string, unknown>, client: ModelContextClient) => Promise<unknown>
  annotations?: ToolAnnotations
}

interface ModelContextRegisterToolOptions {
  signal?: AbortSignal
}

interface ModelContext {
  registerTool(tool: ModelContextTool, options?: ModelContextRegisterToolOptions): void
}

interface Navigator {
  readonly modelContext?: ModelContext
}
