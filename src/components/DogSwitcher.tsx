import { useDogs, useSetActiveDog, useActiveDog } from "@/hooks/useDogs";
import { Dog, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

export function DogSwitcher() {
  const { data: dogs } = useDogs();
  const activeDog = useActiveDog();
  const setActive = useSetActiveDog();

  if (!dogs || dogs.length <= 1) {
    // Single dog → simple pill, no dropdown
    return (
      <div className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-card border border-border shadow-sm">
        {activeDog?.photo_url ? (
          <img src={activeDog.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Dog className="h-3.5 w-3.5 text-primary" />
          </div>
        )}
        <span className="text-xs font-semibold text-foreground">{activeDog?.name || "Mon chien"}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-full bg-card border border-border shadow-sm outline-none"
        >
          {activeDog?.photo_url ? (
            <img src={activeDog.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Dog className="h-3.5 w-3.5 text-primary" />
            </div>
          )}
          <span className="text-xs font-semibold text-foreground max-w-[80px] truncate">{activeDog?.name}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {dogs.map((dog) => (
          <DropdownMenuItem
            key={dog.id}
            onClick={() => { if (dog.id !== activeDog?.id) setActive.mutate(dog.id); }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            {dog.photo_url ? (
              <img src={dog.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Dog className="h-3 w-3 text-primary" />
              </div>
            )}
            <span className="text-sm flex-1 truncate">{dog.name}</span>
            {dog.id === activeDog?.id && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
