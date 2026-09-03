import type { LangGraphRunnableConfig } from "@langchain/langgraph";

export function liveModelsFromConfig(config?: LangGraphRunnableConfig): boolean {
  return Boolean(config?.configurable && (config.configurable as { liveModels?: boolean }).liveModels);
}
