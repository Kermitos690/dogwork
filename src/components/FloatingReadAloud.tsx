import { useState } from "react";
import { Volume2, VolumeX, Pause, Play } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { motion, AnimatePresence } from "framer-motion";
import { usePreferences } from "@/hooks/usePreferences";

export function FloatingReadAloud() {
  const { preferences } = usePreferences();
  const { speak, stop, togglePause, isSpeaking, isPaused, isSupported } = useTextToSpeech();
  const [expanded, setExpanded] = useState(false);

  if (!isSupported || preferences.hide_read_aloud) return null;



  const handleRead = () => {
    const mainContent = document.querySelector(".mx-auto.max-w-lg");
    if (!mainContent) return;
    const text = mainContent.textContent || "";
    // Clean up excessive whitespace
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (cleaned) speak(cleaned);
  };

  const handleClick = () => {
    if (isSpeaking && !isPaused) {
      togglePause();
    } else if (isPaused) {
      togglePause();
    } else {
      handleRead();
    }
  };

  return (
    <div className="fixed bottom-24 left-4 z-40 flex items-center gap-2">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (!isSpeaking) setExpanded(!expanded);
          handleClick();
        }}
        className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isSpeaking
            ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)]"
            : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
        }`}
        title="Lire la page à haute voix"
      >
        {isSpeaking && !isPaused ? (
          <Pause className="h-4.5 w-4.5" />
        ) : isPaused ? (
          <Play className="h-4.5 w-4.5" />
        ) : (
          <Volume2 className="h-4.5 w-4.5" />
        )}
      </motion.button>

      <AnimatePresence>
        {isSpeaking && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: -8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -8 }}
            whileTap={{ scale: 0.9 }}
            onClick={stop}
            className="w-9 h-9 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center"
            title="Arrêter la lecture"
          >
            <VolumeX className="h-4 w-4 text-destructive" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
