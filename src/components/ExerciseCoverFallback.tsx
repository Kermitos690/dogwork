import { Dog } from "lucide-react";

const GRADIENTS = [
  "from-primary/20 to-accent/10",
  "from-blue-500/15 to-cyan-500/10",
  "from-emerald-500/15 to-teal-500/10",
  "from-amber-500/15 to-orange-500/10",
  "from-rose-500/15 to-pink-500/10",
  "from-violet-500/15 to-purple-500/10",
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  name: string;
  categoryIcon?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Premium fallback for exercises without a cover_image.
 * Deterministic gradient based on exercise name for visual consistency.
 */
export function ExerciseCoverFallback({ name, categoryIcon, size = "md", className = "" }: Props) {
  const gradient = GRADIENTS[hashCode(name) % GRADIENTS.length];

  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-full h-40",
    lg: "w-full h-52",
  };

  const iconSize = {
    sm: "h-5 w-5",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br ${gradient} rounded-2xl flex flex-col items-center justify-center border border-border/50 ${className}`}>
      {categoryIcon ? (
        <span className={size === "sm" ? "text-lg" : "text-3xl"}>{categoryIcon}</span>
      ) : (
        <Dog className={`${iconSize[size]} text-muted-foreground/60`} />
      )}
      {size !== "sm" && (
        <span className="text-[10px] text-muted-foreground/80 mt-1.5 px-4 text-center line-clamp-1">
          {name}
        </span>
      )}
    </div>
  );
}
