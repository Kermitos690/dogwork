import { useState, useMemo, useRef, useEffect } from "react";
import { DOG_BREEDS } from "@/data/dogBreeds";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BreedComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function BreedCombobox({ value, onChange, placeholder = "Rechercher une race…" }: BreedComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return DOG_BREEDS.slice();
    const q = search.toLowerCase();
    return DOG_BREEDS.filter(b => b.toLowerCase().includes(q));
  }, [search]);

  const handleSelect = (breed: string) => {
    onChange(breed);
    setSearch("");
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="rounded-full p-0.5 hover:bg-muted"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl shadow-black/30"
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-52 overflow-y-auto scrollbar-hide p-1">
              {filtered.length === 0 && (
                <p className="py-3 text-center text-sm text-muted-foreground">Aucune race trouvée</p>
              )}
              {filtered.map((breed) => (
                <button
                  key={breed}
                  type="button"
                  onClick={() => handleSelect(breed)}
                  className={`flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors ${
                    breed === value
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {breed}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
