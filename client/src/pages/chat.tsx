import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { ModelSelect } from "@/components/chat/model-select";
import { ProviderSelect } from "@/components/chat/provider-select";
import { ParameterControls } from "@/components/chat/parameter-controls";
import { APISettings } from "@/components/menu/api-settings";
import { generateCompletion } from "@/lib/api-client";
import { apiRequest } from "@/lib/queryClient";
import { Message, messageRoleSchema, Provider } from "@shared/schema";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Settings2, Menu, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OllamaConfig } from "@/components/chat/ollama-config";
import { useChatHistory } from "@/hooks/use-chat-history";

export default function Chat() {
  const [provider, setProvider] = useState<Provider>("mistral");
  const [selectedModel, setSelectedModel] = useState("mistral-small");
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [showAPISettings, setShowAPISettings] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  // Initialize chat history from localStorage
  useChatHistory(messages, (loadedMessages) => {
    queryClient.setQueryData(["/api/messages"], loadedMessages);
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
      localStorage.removeItem("chat_history"); // Clear local storage as well
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
      await addMessage.mutateAsync({ role: "user", content });

      setIsGenerating(true);
      let assistantMessage = "";

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content });

      // Create a temporary message for streaming
      const tempMessage: Message = {
        id: Date.now(),
        role: "assistant",
        content: "",
        modelId: selectedModel,
        provider,
        timestamp: new Date(),
      };
      setStreamingMessage(tempMessage);

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
          setStreamingMessage(prev => prev ? { ...prev, content: assistantMessage } : null);
        }
      );

      setStreamingMessage(null);
      await addMessage.mutateAsync({
        role: "assistant",
        content: assistantMessage,
      });
    } catch (error) {
      setStreamingMessage(null);
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

  // Combine permanent messages with streaming message
  const displayMessages = [...messages];
  if (streamingMessage) {
    displayMessages.push(streamingMessage);
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 flex flex-col h-screen">
      {showOllamaConfig && (
        <OllamaConfig onConnectionChange={setIsOllamaConnected} />
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <h3 className="text-lg font-semibold mb-4">API Configuration</h3>
              <APISettings onSave={() => setShowAPISettings(false)} />
            </SheetContent>
          </Sheet>
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
        {displayMessages.length === 0 && (
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
        {displayMessages.map((message) => (
          <ChatMessage
            key={message.id}
            role={messageRoleSchema.parse(message.role)}
            content={message.content}
            isLoading={streamingMessage?.id === message.id}
          />
        ))}
      </div>

      <ChatInput onSubmit={handleSubmit} disabled={isGenerating || !isProviderReady} />
    </div>
  );
}