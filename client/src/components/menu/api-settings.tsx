import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface APISettingsProps {
  onSave?: () => void;
}

export function APISettings({ onSave }: APISettingsProps) {
  const [mistralKey, setMistralKey] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [ollamaHost, setOllamaHost] = useState("http://localhost:11434");
  const [lmStudioHost, setLmStudioHost] = useState("http://localhost:1234");
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);
  const [isCheckingLMStudio, setIsCheckingLMStudio] = useState(false);
  const [isOllamaConnected, setIsOllamaConnected] = useState(false);
  const [isLMStudioConnected, setIsLMStudioConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved values from localStorage
    const savedMistralKey = localStorage.getItem("MISTRAL_API_KEY");
    const savedOpenRouterKey = localStorage.getItem("OPENROUTER_API_KEY");
    const savedOllamaHost = localStorage.getItem("OLLAMA_HOST");
    const savedLMStudioHost = localStorage.getItem("LM_STUDIO_HOST");

    if (savedMistralKey) setMistralKey(savedMistralKey);
    if (savedOpenRouterKey) setOpenRouterKey(savedOpenRouterKey);
    if (savedOllamaHost) setOllamaHost(savedOllamaHost);
    if (savedLMStudioHost) setLmStudioHost(savedLMStudioHost);
  }, []);

  const checkOllamaConnection = async () => {
    setIsCheckingOllama(true);
    try {
      await apiRequest("POST", "/api/ollama/check-connection", { hostUrl: ollamaHost });
      setIsOllamaConnected(true);
      toast({ description: "Successfully connected to Ollama" });
    } catch (error) {
      setIsOllamaConnected(false);
      toast({
        variant: "destructive",
        description: "Failed to connect to Ollama"
      });
    } finally {
      setIsCheckingOllama(false);
    }
  };

  const checkLMStudioConnection = async () => {
    setIsCheckingLMStudio(true);
    try {
      await apiRequest("POST", "/api/lmstudio/check-connection", { hostUrl: lmStudioHost });
      setIsLMStudioConnected(true);
      toast({ description: "Successfully connected to LM Studio" });
    } catch (error) {
      setIsLMStudioConnected(false);
      toast({
        variant: "destructive",
        description: "Failed to connect to LM Studio"
      });
    } finally {
      setIsCheckingLMStudio(false);
    }
  };

  const handleSave = () => {
    // Save all settings to localStorage
    if (mistralKey) localStorage.setItem("MISTRAL_API_KEY", mistralKey);
    if (openRouterKey) localStorage.setItem("OPENROUTER_API_KEY", openRouterKey);
    if (ollamaHost) localStorage.setItem("OLLAMA_HOST", ollamaHost);
    if (lmStudioHost) localStorage.setItem("LM_STUDIO_HOST", lmStudioHost);

    toast({
      description: "API settings saved successfully",
    });

    if (onSave) onSave();
  };

  return (
    <Tabs defaultValue="cloud" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="cloud">Cloud APIs</TabsTrigger>
        <TabsTrigger value="local">Local Models</TabsTrigger>
      </TabsList>

      <TabsContent value="cloud" className="space-y-4">
        <div className="space-y-2">
          <Label>Mistral API Key</Label>
          <Input
            type="password"
            value={mistralKey}
            onChange={(e) => setMistralKey(e.target.value)}
            placeholder="Enter your Mistral API key"
          />
          <p className="text-xs text-muted-foreground">
            Get your API key from{" "}
            <a
              href="https://mistral.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Mistral AI
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <Label>OpenRouter API Key</Label>
          <Input
            type="password"
            value={openRouterKey}
            onChange={(e) => setOpenRouterKey(e.target.value)}
            placeholder="Enter your OpenRouter API key"
          />
          <p className="text-xs text-muted-foreground">
            Get your API key from{" "}
            <a
              href="https://openrouter.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              OpenRouter
            </a>
          </p>
        </div>
      </TabsContent>

      <TabsContent value="local" className="space-y-4">
        <div className="space-y-2">
          <Label>Ollama Host</Label>
          <div className="flex gap-2">
            <Input
              value={ollamaHost}
              onChange={(e) => setOllamaHost(e.target.value)}
              placeholder="Enter Ollama host URL"
            />
            <Button 
              onClick={checkOllamaConnection} 
              disabled={isCheckingOllama}
              variant="secondary"
            >
              Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Download and run{" "}
            <a
              href="https://ollama.ai/download"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Ollama
            </a>
            {" "}locally
          </p>
        </div>

        <div className="space-y-2">
          <Label>LM Studio Host</Label>
          <div className="flex gap-2">
            <Input
              value={lmStudioHost}
              onChange={(e) => setLmStudioHost(e.target.value)}
              placeholder="Enter LM Studio host URL"
            />
            <Button 
              onClick={checkLMStudioConnection} 
              disabled={isCheckingLMStudio}
              variant="secondary"
            >
              Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Download and run{" "}
            <a
              href="https://lmstudio.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              LM Studio
            </a>
            {" "}locally
          </p>
        </div>
      </TabsContent>

      <Button onClick={handleSave} className="w-full mt-6">
        Save Settings
      </Button>
    </Tabs>
  );
}