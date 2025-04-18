import { apiRequest } from "./queryClient";
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

async function getMistralKey(): Promise<string> {
  const key = localStorage.getItem("MISTRAL_API_KEY");
  if (!key) throw new Error("Mistral API key not found. Please configure it in the menu.");
  return key;
}

async function getOpenRouterKey(): Promise<string> {
  const key = localStorage.getItem("OPENROUTER_API_KEY");
  if (!key) throw new Error("OpenRouter API key not found. Please configure it in the menu.");
  return key;
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
      const openRouterKey = await getOpenRouterKey();
      const response = await fetch(`${OPENROUTER_API_URL}/models`, {
        headers: {
          "Authorization": `Bearer ${openRouterKey}`
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

    case "lmstudio":
      const lmStudioRes = await fetch("/api/lmstudio/models");
      if (!lmStudioRes.ok) {
        throw new Error("Failed to fetch LM Studio models");
      }
      const lmStudioData = await lmStudioRes.json();
      return lmStudioData.models.map((model: any) => ({
        id: model.id,
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
          "Authorization": `Bearer ${await getMistralKey()}`
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
          "Authorization": `Bearer ${await getOpenRouterKey()}`
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

async function streamMistralResponse(response: Response, onChunk: (chunk: ChatCompletionResponse) => void) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let accumulatedContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (accumulatedContent) {
          onChunk({ content: accumulatedContent, done: true });
        }
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices[0]?.delta?.content || "";
            if (content) {
              accumulatedContent += content;
              onChunk({
                content,
                done: data.choices[0]?.finish_reason === "stop"
              });
            }
          } catch (e) {
            console.warn("Failed to parse chunk:", e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Stream processing error:", error);
    throw error;
  }
}

async function streamOpenRouterResponse(response: Response, onChunk: (chunk: ChatCompletionResponse) => void) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let accumulatedContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (accumulatedContent) {
          onChunk({ content: accumulatedContent, done: true });
        }
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(Boolean);

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices[0]?.delta?.content || "";
            if (content) {
              accumulatedContent += content;
              onChunk({
                content,
                done: data.choices[0]?.finish_reason === "stop"
              });
            }
          } catch (e) {
            console.warn("Failed to parse chunk:", e);
          }
        }
      }
    }
  } catch (error) {
    console.error("Stream processing error:", error);
    throw error;
  }
}