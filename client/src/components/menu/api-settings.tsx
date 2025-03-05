import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface APISettingsProps {
  onSave?: () => void;
}

export function APISettings({ onSave }: APISettingsProps) {
  const [mistralKey, setMistralKey] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    // Load saved API keys from localStorage
    const savedMistralKey = localStorage.getItem("MISTRAL_API_KEY");
    const savedOpenRouterKey = localStorage.getItem("OPENROUTER_API_KEY");
    if (savedMistralKey) setMistralKey(savedMistralKey);
    if (savedOpenRouterKey) setOpenRouterKey(savedOpenRouterKey);
  }, []);

  const handleSave = () => {
    // Save API keys to localStorage
    if (mistralKey) localStorage.setItem("MISTRAL_API_KEY", mistralKey);
    if (openRouterKey) localStorage.setItem("OPENROUTER_API_KEY", openRouterKey);
    
    toast({
      description: "API settings saved successfully",
    });

    if (onSave) onSave();
  };

  return (
    <div className="space-y-4">
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

      <Button onClick={handleSave} className="w-full">
        Save Settings
      </Button>
    </div>
  );
}
