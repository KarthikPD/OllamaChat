import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface OllamaConfigProps {
  onConnectionChange: (isConnected: boolean) => void;
}

export function OllamaConfig({ onConnectionChange }: OllamaConfigProps) {
  const [hostUrl, setHostUrl] = useState("http://localhost:11434");
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved host URL from localStorage
    const savedHost = localStorage.getItem("ollamaHost");
    if (savedHost) {
      setHostUrl(savedHost);
      checkConnection(savedHost);
    }
  }, []);

  const checkConnection = async (url: string) => {
    setIsChecking(true);
    try {
      await apiRequest("POST", "/api/ollama/check-connection", { hostUrl: url });
      setIsConnected(true);
      onConnectionChange(true);
      toast({
        description: "Successfully connected to Ollama",
      });
    } catch (error) {
      setIsConnected(false);
      onConnectionChange(false);
      toast({
        variant: "destructive",
        description: "Failed to connect to Ollama",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem("ollamaHost", hostUrl);
    checkConnection(hostUrl);
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <Input
            value={hostUrl}
            onChange={(e) => setHostUrl(e.target.value)}
            placeholder="Ollama Host URL"
            className="flex-1"
          />
          <Button onClick={handleSave} disabled={isChecking}>
            Save & Connect
          </Button>
          {isConnected ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
