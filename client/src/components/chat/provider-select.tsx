import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Provider, providerSchema } from "@shared/schema";

interface ProviderSelectProps {
  value: Provider;
  onChange: (value: Provider) => void;
}

export function ProviderSelect({ value, onChange }: ProviderSelectProps) {
  const handleChange = (newValue: string) => {
    const provider = providerSchema.parse(newValue);
    onChange(provider);
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Select provider" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ollama">Ollama (Local)</SelectItem>
        <SelectItem value="mistral">Mistral AI</SelectItem>
        <SelectItem value="openrouter">OpenRouter</SelectItem>
      </SelectContent>
    </Select>
  );
}
