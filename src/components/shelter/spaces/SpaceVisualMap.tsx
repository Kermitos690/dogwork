import { useMemo, useRef, useEffect, useState } from "react";
import { SpaceMapNode } from "./SpaceMapNode";
import type { ShelterSpace } from "@/types/shelterSpaces";

const GRID_COLS = 14;
const GRID_ROWS = 10;

interface Props {
  spaces: Array<ShelterSpace & { animal_name?: string | null; current_occupancy?: number | null }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
}

/**
 * Premium pseudo-3D map view of shelter spaces.
 * Uses position_x / position_y / width / height when available,
 * auto-grid fallback for spaces without coordinates.
 */
export function SpaceVisualMap({ spaces, selectedId, onSelect, onOpen }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Auto-layout: assign grid cells to spaces lacking valid positions
  const positioned = useMemo(() => {
    const used = new Set<string>();
    const fixed: typeof spaces = [];
    const needs: typeof spaces = [];

    for (const s of spaces) {
      const hasPos = typeof s.position_x === "number" && typeof s.position_y === "number" &&
                     (s.position_x !== 0 || s.position_y !== 0);
      if (hasPos) {
        used.add(`${s.position_x}-${s.position_y}`);
        fixed.push(s);
      } else {
        needs.push(s);
      }
    }
    let cursor = 0;
    const placed = needs.map((s) => {
      while (cursor < GRID_COLS * GRID_ROWS) {
        const x = cursor % GRID_COLS;
        const y = Math.floor(cursor / GRID_COLS);
        cursor++;
        if (!used.has(`${x}-${y}`)) {
          used.add(`${x}-${y}`);
          return { ...s, position_x: x, position_y: y };
        }
      }
      return s;
    });
    return [...fixed, ...placed];
  }, [spaces]);

  const cellSize = size.w > 0 ? Math.max(80, Math.min(160, size.w / GRID_COLS)) : 110;
  const canvasH = cellSize * GRID_ROWS;

  return (
    <div className="relative rounded-xl border border-border/60 bg-gradient-to-br from-background via-card to-background overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none opacity-60"
           style={{ background: "radial-gradient(circle at 30% 20%, hsl(var(--primary)/0.10), transparent 55%), radial-gradient(circle at 80% 80%, hsl(var(--primary)/0.06), transparent 60%)" }} />
      <div
        ref={containerRef}
        className="relative w-full overflow-auto"
        style={{ maxHeight: "70vh" }}
      >
        <div
          className="relative"
          style={{
            width: cellSize * GRID_COLS,
            height: canvasH,
            backgroundImage:
              "linear-gradient(to right, hsl(var(--border)/0.25) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)/0.25) 1px, transparent 1px)",
            backgroundSize: `${cellSize}px ${cellSize}px`,
            transform: "perspective(1400px) rotateX(1.5deg)",
            transformOrigin: "center top",
          }}
        >
          {positioned.map((s) => {
            const x = Math.min(GRID_COLS - 1, Math.max(0, s.position_x ?? 0));
            const y = Math.min(GRID_ROWS - 1, Math.max(0, s.position_y ?? 0));
            const w = Math.max(1, Math.min(GRID_COLS - x, s.width ?? 1));
            const h = Math.max(1, Math.min(GRID_ROWS - y, s.height ?? 1));
            return (
              <SpaceMapNode
                key={s.id}
                space={s}
                x={x} y={y} w={w} h={h}
                cellSize={cellSize}
                selected={selectedId === s.id}
                onSelect={() => onSelect(s.id)}
                onOpen={() => onOpen(s.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
