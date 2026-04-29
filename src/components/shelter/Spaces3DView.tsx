import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html, RoundedBox, Text, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

export interface Space3D {
  id: string;
  name: string;
  space_type: string;
  capacity?: number | null;
  position_x: number;
  position_y: number;
  width?: number | null;
  height?: number | null;
  animal_name?: string | null;
  animal_species?: string | null;
}

interface Props {
  spaces: Space3D[];
  editing: boolean;
  onSelect: (space: Space3D) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize?: (id: string, width: number, height: number) => void;
}

const TYPE_PALETTE: Record<string, { base: string; emissive: string; label: string }> = {
  box:           { base: "#3b82f6", emissive: "#1d4ed8", label: "Box" },
  enclos:        { base: "#10b981", emissive: "#047857", label: "Enclos" },
  infirmerie:    { base: "#ef4444", emissive: "#991b1b", label: "Infirmerie" },
  quarantaine:   { base: "#f59e0b", emissive: "#92400e", label: "Quarantaine" },
  isolement:     { base: "#f97316", emissive: "#9a3412", label: "Isolement" },
  promenade:     { base: "#22c55e", emissive: "#15803d", label: "Promenade" },
  accueil:       { base: "#a855f7", emissive: "#6b21a8", label: "Accueil" },
};

const CELL = 1.6;
const GRID_SIZE = 14;

function GridFloor() {
  return (
    <group>
      {/* Sol principal — texture béton/bois sombre */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[GRID_SIZE * CELL + 4, GRID_SIZE * CELL + 4]} />
        <meshStandardMaterial color="#2a2f38" roughness={0.95} metalness={0.05} />
      </mesh>
      {/* Surface utile (zone refuge) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.005, 0]}>
        <planeGeometry args={[GRID_SIZE * CELL, GRID_SIZE * CELL]} />
        <meshStandardMaterial color="#1f2530" roughness={0.85} />
      </mesh>
      {/* Lignes de grille subtiles */}
      <gridHelper
        args={[GRID_SIZE * CELL, GRID_SIZE, "#3f4a5c", "#283041"]}
        position={[0, 0.012, 0]}
      />
      {/* Bordure / mur extérieur léger */}
      <mesh position={[0, 0.05, GRID_SIZE * CELL / 2]} receiveShadow>
        <boxGeometry args={[GRID_SIZE * CELL + 0.2, 0.1, 0.08]} />
        <meshStandardMaterial color="#4b5563" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.05, -GRID_SIZE * CELL / 2]} receiveShadow>
        <boxGeometry args={[GRID_SIZE * CELL + 0.2, 0.1, 0.08]} />
        <meshStandardMaterial color="#4b5563" roughness={0.7} />
      </mesh>
      <mesh position={[GRID_SIZE * CELL / 2, 0.05, 0]} receiveShadow>
        <boxGeometry args={[0.08, 0.1, GRID_SIZE * CELL + 0.2]} />
        <meshStandardMaterial color="#4b5563" roughness={0.7} />
      </mesh>
      <mesh position={[-GRID_SIZE * CELL / 2, 0.05, 0]} receiveShadow>
        <boxGeometry args={[0.08, 0.1, GRID_SIZE * CELL + 0.2]} />
        <meshStandardMaterial color="#4b5563" roughness={0.7} />
      </mesh>
    </group>
  );
}

function clampGrid(v: number) {
  return Math.max(0, Math.min(GRID_SIZE - 1, v));
}

function cellsToWorld(cellX: number, cellZ: number, w: number, h: number): [number, number] {
  // top-left cell (cellX,cellZ) and box covering w×h → returns center pos
  const offset = ((GRID_SIZE - 1) * CELL) / 2;
  const cx = (cellX + (w - 1) / 2) * CELL - offset;
  const cz = (cellZ + (h - 1) / 2) * CELL - offset;
  return [cx, cz];
}

function worldToCell(wx: number, wz: number): [number, number] {
  const offset = ((GRID_SIZE - 1) * CELL) / 2;
  return [Math.round((wx + offset) / CELL), Math.round((wz + offset) / CELL)];
}

function SpaceBox({
  space,
  editing,
  onSelect,
  onMove,
  onResize,
}: {
  space: Space3D;
  editing: boolean;
  onSelect: (s: Space3D) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize?: (id: string, w: number, h: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [tempPos, setTempPos] = useState<[number, number] | null>(null);
  const [tempSize, setTempSize] = useState<[number, number] | null>(null);
  const { gl } = useThree();

  const occupied = !!space.animal_name;
  const palette = TYPE_PALETTE[space.space_type] || { base: "#64748b", emissive: "#334155", label: "Espace" };
  const baseColor = palette.base;
  const emissiveColor = palette.emissive;

  const w = tempSize?.[0] ?? Math.max(1, space.width ?? 1);
  const h = tempSize?.[1] ?? Math.max(1, space.height ?? 1);
  const gx = tempPos?.[0] ?? space.position_x;
  const gy = tempPos?.[1] ?? space.position_y;
  const [wx, wz] = cellsToWorld(gx, gy, w, h);

  const wallH = occupied ? 0.85 : 0.55;
  const innerColor = occupied ? baseColor : new THREE.Color(baseColor).multiplyScalar(0.55).getStyle();

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!editing || resizing) return;
    e.stopPropagation();
    setDragging(true);
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    e.stopPropagation();
    const intersection = new THREE.Vector3();
    e.ray.intersectPlane(plane, intersection);
    const [nx, ny] = worldToCell(intersection.x, intersection.z);
    const cx = clampGrid(nx - Math.floor(w / 2));
    const cy = clampGrid(ny - Math.floor(h / 2));
    setTempPos([Math.min(cx, GRID_SIZE - w), Math.min(cy, GRID_SIZE - h)]);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    e.stopPropagation();
    setDragging(false);
    if (tempPos && (tempPos[0] !== space.position_x || tempPos[1] !== space.position_y)) {
      onMove(space.id, tempPos[0], tempPos[1]);
    }
    setTempPos(null);
  };

  // Resize via 2D button overlay
  const adjustSize = (dw: number, dh: number) => {
    const newW = Math.max(1, Math.min(GRID_SIZE - gx, w + dw));
    const newH = Math.max(1, Math.min(GRID_SIZE - gy, h + dh));
    if (newW === w && newH === h) return;
    setResizing(true);
    setTempSize([newW, newH]);
    onResize?.(space.id, newW, newH);
    setTimeout(() => { setResizing(false); setTempSize(null); }, 250);
  };

  const boxW = CELL * w * 0.94;
  const boxD = CELL * h * 0.94;

  return (
    <group position={[wx, 0, wz]}>
      {/* Sol du compartiment (litière / béton clair) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[boxW, boxD]} />
        <meshStandardMaterial color="#dccfb3" roughness={0.95} />
      </mesh>

      {/* Murs bas (4 cloisons) */}
      {[
        { pos: [0, wallH / 2, boxD / 2], size: [boxW, wallH, 0.08] },
        { pos: [0, wallH / 2, -boxD / 2], size: [boxW, wallH, 0.08] },
        { pos: [boxW / 2, wallH / 2, 0], size: [0.08, wallH, boxD] },
        { pos: [-boxW / 2, wallH / 2, 0], size: [0.08, wallH, boxD] },
      ].map((wall, i) => (
        <mesh key={i} position={wall.pos as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={wall.size as [number, number, number]} />
          <meshStandardMaterial
            color={innerColor}
            emissive={hovered ? emissiveColor : "#000"}
            emissiveIntensity={hovered ? 0.4 : 0}
            roughness={0.55}
            metalness={0.15}
          />
        </mesh>
      ))}

      {/* Couvercle invisible cliquable pour drag */}
      <mesh
        position={[0, wallH / 2, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          gl.domElement.style.cursor = editing ? "grab" : "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          gl.domElement.style.cursor = "auto";
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => {
          if (dragging) return;
          e.stopPropagation();
          if (!editing) onSelect(space);
        }}
      >
        <boxGeometry args={[boxW, wallH * 1.05, boxD]} />
        <meshStandardMaterial transparent opacity={hovered && editing ? 0.08 : 0} color={baseColor} />
      </mesh>

      {/* Capacité indicateur (petits cubes représentant places) */}
      {space.capacity && space.capacity > 1 && Array.from({ length: Math.min(space.capacity, 4) }).map((_, i) => {
        const angle = (i / Math.min(space.capacity!, 4)) * Math.PI * 2;
        const r = Math.min(boxW, boxD) * 0.25;
        return (
          <mesh key={i} position={[Math.cos(angle) * r, 0.12, Math.sin(angle) * r]} castShadow>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color={occupied ? "#fbbf24" : "#475569"} />
          </mesh>
        );
      })}

      {/* Étiquette nom + type */}
      <Html position={[0, wallH + 0.25, 0]} center distanceFactor={9} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center gap-0.5">
          <div className="bg-background/95 backdrop-blur border border-border rounded-md px-2 py-0.5 shadow-lg whitespace-nowrap">
            <div className="text-[11px] font-semibold text-foreground leading-tight">{space.name}</div>
            <div className="text-[9px] text-muted-foreground leading-tight">
              {palette.label} · {w}×{h}
            </div>
          </div>
          {occupied && (
            <div className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap shadow">
              🐾 {space.animal_name}
            </div>
          )}
        </div>
      </Html>

      {/* Boutons resize en mode édition */}
      {editing && onResize && (
        <Html position={[0, wallH + 0.05, 0]} center distanceFactor={7} style={{ pointerEvents: "auto" }}>
          <div className="flex items-center gap-1 bg-background/95 backdrop-blur border border-primary/40 rounded-lg shadow-xl p-1">
            <button
              onClick={(e) => { e.stopPropagation(); adjustSize(-1, 0); }}
              className="w-6 h-6 rounded bg-muted hover:bg-primary/20 text-foreground text-xs font-bold disabled:opacity-30"
              disabled={w <= 1}
              title="Réduire largeur"
            >−W</button>
            <button
              onClick={(e) => { e.stopPropagation(); adjustSize(1, 0); }}
              className="w-6 h-6 rounded bg-muted hover:bg-primary/20 text-foreground text-xs font-bold disabled:opacity-30"
              disabled={gx + w >= GRID_SIZE}
              title="Agrandir largeur"
            >+W</button>
            <span className="w-px h-4 bg-border" />
            <button
              onClick={(e) => { e.stopPropagation(); adjustSize(0, -1); }}
              className="w-6 h-6 rounded bg-muted hover:bg-primary/20 text-foreground text-xs font-bold disabled:opacity-30"
              disabled={h <= 1}
              title="Réduire profondeur"
            >−H</button>
            <button
              onClick={(e) => { e.stopPropagation(); adjustSize(0, 1); }}
              className="w-6 h-6 rounded bg-muted hover:bg-primary/20 text-foreground text-xs font-bold disabled:opacity-30"
              disabled={gy + h >= GRID_SIZE}
              title="Agrandir profondeur"
            >+H</button>
          </div>
        </Html>
      )}
    </group>
  );
}

export function Spaces3DView({ spaces, editing, onSelect, onMove, onResize }: Props) {
  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-border bg-gradient-to-b from-slate-900 via-slate-950 to-black shadow-inner">
      <Canvas
        shadows
        camera={{ position: [16, 14, 16], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#0a0f1a"]} />
        <fog attach="fog" args={["#0a0f1a", 28, 55]} />

        {/* Éclairage réaliste : lune + ambient + rim */}
        <ambientLight intensity={0.45} color="#b8c5d6" />
        <directionalLight
          position={[12, 18, 8]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          color="#fff8e8"
        />
        <directionalLight position={[-8, 6, -6]} intensity={0.35} color="#6ea8ff" />
        <pointLight position={[0, 8, 0]} intensity={0.3} color="#fbbf24" />

        <Suspense fallback={null}>
          <GridFloor />
          {spaces.map((s) => (
            <SpaceBox
              key={s.id}
              space={s}
              editing={editing}
              onSelect={onSelect}
              onMove={onMove}
              onResize={onResize}
            />
          ))}
          <ContactShadows
            position={[0, 0.02, 0]}
            opacity={0.45}
            scale={GRID_SIZE * CELL + 4}
            blur={2.4}
            far={4}
          />
        </Suspense>

        <OrbitControls
          enablePan
          enableRotate
          enableZoom
          maxPolarAngle={Math.PI / 2.15}
          minDistance={6}
          maxDistance={40}
          target={[0, 0, 0]}
        />
      </Canvas>

      {editing && (
        <div className="absolute top-3 left-3 right-3 pointer-events-none">
          <div className="bg-primary/95 text-primary-foreground text-xs px-3 py-2 rounded-lg text-center shadow-lg backdrop-blur">
            ✋ Mode édition · <span className="font-semibold">Glissez</span> pour déplacer · <span className="font-semibold">±W / ±H</span> pour redimensionner chaque compartiment
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="absolute bottom-3 left-3 bg-background/85 backdrop-blur border border-border rounded-lg p-2 shadow-lg">
        <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Types</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
          {Object.entries(TYPE_PALETTE).slice(0, 6).map(([key, p]) => (
            <div key={key} className="flex items-center gap-1.5 text-[10px]">
              <span className="w-2 h-2 rounded-sm" style={{ background: p.base }} />
              <span className="text-foreground/80">{p.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
