import { Volume2, VolumeX, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { cn } from "@/lib/utils";

interface ReadAloudButtonProps {
  getText: () => string;
  className?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "secondary";
  label?: string;
}

export function ReadAloudButton({
  getText,
  className,
  size = "sm",
  variant = "outline",
  label = "Lire à haute voix",
}: ReadAloudButtonProps) {
  const { speak, stop, togglePause, isSpeaking, isPaused, isSupported } = useTextToSpeech();

  if (!isSupported) return null;

  const handleClick = () => {
    if (isSpeaking && !isPaused) {
      togglePause();
    } else if (isPaused) {
      togglePause();
    } else {
      speak(getText());
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={cn(
          "gap-1.5 rounded-xl transition-all",
          isSpeaking && "border-primary text-primary"
        )}
      >
        {isSpeaking && !isPaused ? (
          <Pause className="h-3.5 w-3.5" />
        ) : isPaused ? (
          <Play className="h-3.5 w-3.5" />
        ) : (
          <Volume2 className="h-3.5 w-3.5" />
        )}
        {size !== "icon" && (
          <span className="text-xs">
            {isSpeaking && !isPaused ? "Pause" : isPaused ? "Reprendre" : label}
          </span>
        )}
      </Button>
      {isSpeaking && (
        <Button variant="ghost" size="icon" onClick={stop} className="h-8 w-8 rounded-xl">
          <VolumeX className="h-3.5 w-3.5 text-destructive" />
        </Button>
      )}
    </div>
  );
}
