import { apiRequest } from "./queryClient";

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export interface GenerateParams {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: string;
  options?: {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    num_ctx?: number;
    num_predict?: number;
    stop?: string[];
  };
}

export async function listModels(): Promise<OllamaModel[]> {
  const res = await apiRequest("POST", "/api/ollama/list");
  const data = await res.json();
  return data.models;
}

export async function generateCompletion(params: GenerateParams, onChunk?: (chunk: OllamaResponse) => void) {
  const res = await apiRequest("POST", "/api/ollama/generate", params);

  if (params.stream && onChunk) {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(Boolean);
      
      for (const line of lines) {
        try {
          const response = JSON.parse(line) as OllamaResponse;
          onChunk(response);
        } catch (e) {
          console.error("Failed to parse chunk:", e);
        }
      }
    }
  } else {
    return await res.json() as OllamaResponse;
  }
}
