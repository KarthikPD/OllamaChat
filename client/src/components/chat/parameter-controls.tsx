import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ParameterControlsProps {
  temperature: number;
  onTemperatureChange: (value: number) => void;
  systemPrompt: string;
  onSystemPromptChange: (value: string) => void;
}

export function ParameterControls({
  temperature,
  onTemperatureChange,
  systemPrompt,
  onSystemPromptChange
}: ParameterControlsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Temperature</Label>
        <Slider
          min={0}
          max={2}
          step={0.1}
          value={[temperature]}
          onValueChange={([value]) => onTemperatureChange(value)}
        />
        <div className="text-xs text-muted-foreground">
          {temperature} - Higher values make the output more creative
        </div>
      </div>

      <div className="space-y-2">
        <Label>System Prompt</Label>
        <Textarea
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          placeholder="Enter a system prompt to guide the model's behavior..."
          className="h-20"
        />
      </div>
    </div>
  );
}
