import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { ModelSelect } from "@/components/chat/model-select";
import { ProviderSelect } from "@/components/chat/provider-select";
import { ParameterControls } from "@/components/chat/parameter-controls";
import { generateCompletion } from "@/lib/api-client";
import { apiRequest } from "@/lib/queryClient";
import { Message, messageRoleSchema, Provider } from "@shared/schema";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Settings2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OllamaConfig } from "@/components/chat/ollama-config";

export default function Chat() {
  const [provider, setProvider] = useState<Provider>("mistral");
  const [selectedModel, setSelectedModel] = useState("mistral-small");
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  const addMessage = useMutation({
    mutationFn: async (message: { role: "user" | "assistant"; content: string }) => {
      const parsedRole = messageRoleSchema.parse(message.role);
      return apiRequest("POST", "/api/messages", {
        ...message,
        role: parsedRole,
        modelId: selectedModel,
        provider
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const clearMessages = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/messages/clear");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({
        description: "Chat history cleared",
      });
    },
  });

  const handleSubmit = async (content: string) => {
    if (isGenerating) return;
    if (provider === "ollama" && !isOllamaConnected) {
      toast({
        variant: "destructive",
        description: "Please configure your Ollama connection first"
      });
      return;
    }

    try {
      // Add user message
      await addMessage.mutateAsync({ role: "user", content });

      setIsGenerating(true);
      let assistantMessage = "";

      // Prepare messages array including system prompt if present
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content });

      await generateCompletion(
        provider,
        {
          model: selectedModel,
          messages,
          temperature,
          stream: true,
        },
        (chunk) => {
          assistantMessage += chunk.content;
          // Update the message in real-time
          queryClient.setQueryData(["/api/messages"], (old: Message[] = []) => {
            const updated = [...old];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              last.content = assistantMessage;
            } else {
              updated.push({
                id: Date.now(),
                role: "assistant",
                content: assistantMessage,
                modelId: selectedModel,
                provider,
                timestamp: new Date(),
              });
            }
            return updated;
          });
        }
      );

      // Save the final assistant message
      await addMessage.mutateAsync({
        role: "assistant",
        content: assistantMessage,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: provider === "ollama"
          ? "Failed to generate response. Make sure Ollama is running locally."
          : `Failed to generate response from ${provider}. Please check your API key.`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const showOllamaConfig = provider === "ollama";
  const isProviderReady = provider !== "ollama" || isOllamaConnected;

  return (
    <div className="container mx-auto max-w-4xl p-4 flex flex-col h-screen">
      {showOllamaConfig && (
        <OllamaConfig onConnectionChange={setIsOllamaConnected} />
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <ProviderSelect value={provider} onChange={setProvider} />
          <ModelSelect 
            provider={provider}
            value={selectedModel}
            onChange={setSelectedModel}
          />
          {provider === "ollama" && isOllamaConnected && (
            <p className="text-sm text-muted-foreground">
              Connected to Ollama
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <ParameterControls
                temperature={temperature}
                onTemperatureChange={setTemperature}
                systemPrompt={systemPrompt}
                onSystemPromptChange={setSystemPrompt}
              />
            </SheetContent>
          </Sheet>
          <Button
            variant="outline"
            size="icon"
            onClick={() => clearMessages.mutate()}
            disabled={messages.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground pt-8">
            <p>Start a conversation with your AI model.</p>
            {!isProviderReady && (
              <p className="text-sm mt-2">
                {provider === "ollama" 
                  ? "Please configure your Ollama connection above."
                  : "Please ensure your API key is configured correctly."}
              </p>
            )}
          </div>
        )}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={messageRoleSchema.parse(message.role)}
            content={message.content}
          />
        ))}
        {isGenerating && (
          <ChatMessage
            role="assistant"
            content="▋"
            isLoading
          />
        )}
      </div>

      <ChatInput onSubmit={handleSubmit} disabled={isGenerating || !isProviderReady} />
    </div>
  );
}