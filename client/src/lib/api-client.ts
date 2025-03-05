import { Provider } from "@shared/schema";

export interface ModelInfo {
  id: string;
  name: string;
  provider: Provider;
}

export interface ChatCompletionResponse {
  content: string;
  done: boolean;
}

export interface ChatCompletionOptions {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

const MISTRAL_API_URL = "https://api.mistral.ai/v1";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1";

// Maps provider model IDs to display names
const MODEL_NAMES: Record<string, string> = {
  // Mistral models
  "mistral-tiny": "Mistral Tiny",
  "mistral-small": "Mistral Small",
  "mistral-medium": "Mistral Medium",
  // OpenRouter models (add more as needed)
  "openai/gpt-3.5-turbo": "GPT-3.5 Turbo",
  "anthropic/claude-2": "Claude 2",
  "google/palm-2-chat-bison": "PaLM 2 Bison",
};

async function streamMistralResponse(response: Response, onChunk: (chunk: ChatCompletionResponse) => void) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(Boolean);

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        onChunk({
          content: data.choices[0]?.delta?.content || "",
          done: data.choices[0]?.finish_reason === "stop"
        });
      }
    }
  }
}

async function streamOpenRouterResponse(response: Response, onChunk: (chunk: ChatCompletionResponse) => void) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(Boolean);

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        onChunk({
          content: data.choices[0]?.delta?.content || "",
          done: data.choices[0]?.finish_reason === "stop"
        });
      }
    }
  }
}

export async function listModels(provider: Provider): Promise<ModelInfo[]> {
  switch (provider) {
    case "mistral":
      // Mistral models are fixed for now
      return [
        { id: "mistral-tiny", name: "Mistral Tiny", provider },
        { id: "mistral-small", name: "Mistral Small", provider },
        { id: "mistral-medium", name: "Mistral Medium", provider },
      ];
    
    case "openrouter":
      const response = await fetch(`${OPENROUTER_API_URL}/models`, {
        headers: {
          "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch OpenRouter models");
      }
      
      const data = await response.json();
      return data.data.map((model: any) => ({
        id: model.id,
        name: MODEL_NAMES[model.id] || model.name,
        provider
      }));
    
    case "ollama":
      // Keep existing Ollama implementation
      const ollamaRes = await fetch("/api/ollama/models");
      if (!ollamaRes.ok) {
        throw new Error("Failed to fetch Ollama models");
      }
      const ollamaData = await ollamaRes.json();
      return ollamaData.models.map((model: any) => ({
        id: model.name,
        name: model.name,
        provider
      }));
    
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export async function generateCompletion(
  provider: Provider,
  options: ChatCompletionOptions,
  onChunk?: (chunk: ChatCompletionResponse) => void
) {
  let response: Response;
  
  switch (provider) {
    case "mistral":
      response = await fetch(`${MISTRAL_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          stream: options.stream
        })
      });
      break;

    case "openrouter":
      response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: options.model,
          messages: options.messages,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
          stream: options.stream
        })
      });
      break;

    case "ollama":
      return fetch("/api/ollama/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: options.model,
          prompt: options.messages[options.messages.length - 1].content,
          system: options.messages.find(m => m.role === "system")?.content,
          options: {
            temperature: options.temperature
          },
          stream: options.stream
        })
      });

    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  if (options.stream && onChunk) {
    if (provider === "mistral") {
      await streamMistralResponse(response, onChunk);
    } else if (provider === "openrouter") {
      await streamOpenRouterResponse(response, onChunk);
    }
  } else {
    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || "",
      done: true
    };
  }
}
