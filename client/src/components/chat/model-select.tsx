import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { listModels } from "@/lib/api-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Provider } from "@shared/schema";

interface ModelSelectProps {
  provider: Provider;
  value: string;
  onChange: (value: string) => void;
}

export function ModelSelect({ provider, value, onChange }: ModelSelectProps) {
  const { data: models, isLoading, error } = useQuery({
    queryKey: ["/api/models", provider],
    queryFn: () => listModels(provider)
  });

  if (error) {
    return (
      <Alert variant="destructive" className="w-[450px]">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {provider === "ollama" ? (
            <>
              Could not connect to Ollama. Make sure Ollama is installed and running locally:
              <a 
                href="https://ollama.ai/download" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline ml-1"
              >
                Download Ollama
              </a>
            </>
          ) : (
            `Failed to load ${provider} models. Please check your API key and try again.`
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Select disabled={isLoading} value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {models?.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}