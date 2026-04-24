import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

export interface Space3D {
  id: string;
  name: string;
  space_type: string;
  capacity?: number | null;
  position_x: number;
  position_y: number;
  animal_name?: string | null;
  animal_species?: string | null;
}

interface Props {
  spaces: Space3D[];
  editing: boolean;
  onSelect: (space: Space3D) => void;
  onMove: (id: string, x: number, y: number) => void;
}

const TYPE_COLOR: Record<string, string> = {
  box: "#3b82f6",
  enclos: "#10b981",
  infirmerie: "#ef4444",
  quarantaine: "#f59e0b",
  isolement: "#f97316",
  promenade: "#22c55e",
  accueil: "#a855f7",
};

const CELL = 1.4;
const GRID_SIZE = 12; // 12x12 grid

function GridFloor() {
  return (
    <group>
      {/* Sol */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[GRID_SIZE * CELL, GRID_SIZE * CELL]} />
        <meshStandardMaterial color="#1a1f2e" roughness={0.9} />
      </mesh>
      {/* Lignes */}
      <gridHelper
        args={[GRID_SIZE * CELL, GRID_SIZE, "#334155", "#1f2937"]}
        position={[0, 0.01, 0]}
      />
    </group>
  );
}

function gridToWorld(x: number, y: number): [number, number] {
  // Centre la grille autour de (0,0)
  const offset = ((GRID_SIZE - 1) * CELL) / 2;
  return [x * CELL - offset, y * CELL - offset];
}

function worldToGrid(wx: number, wz: number): [number, number] {
  const offset = ((GRID_SIZE - 1) * CELL) / 2;
  const gx = Math.round((wx + offset) / CELL);
  const gz = Math.round((wz + offset) / CELL);
  return [
    Math.max(0, Math.min(GRID_SIZE - 1, gx)),
    Math.max(0, Math.min(GRID_SIZE - 1, gz)),
  ];
}

function SpaceBox({
  space,
  editing,
  onSelect,
  onMove,
}: {
  space: Space3D;
  editing: boolean;
  onSelect: (s: Space3D) => void;
  onMove: (id: string, x: number, y: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tempPos, setTempPos] = useState<[number, number] | null>(null);
  const { gl, camera } = useThree();

  const occupied = !!space.animal_name;
  const baseColor = TYPE_COLOR[space.space_type] || "#64748b";
  const color = occupied ? baseColor : new THREE.Color(baseColor).multiplyScalar(0.5).getStyle();
  const height = occupied ? 0.7 : 0.45;

  const [gx, gy] = tempPos ?? [space.position_x, space.position_y];
  const [wx, wz] = gridToWorld(gx, gy);

  // Drag plane
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!editing) return;
    e.stopPropagation();
    setDragging(true);
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging) return;
    e.stopPropagation();
    const intersection = new THREE.Vector3();
    e.ray.intersectPlane(plane, intersection);
    const [nx, ny] = worldToGrid(intersection.x, intersection.z);
    setTempPos([nx, ny]);
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

  return (
    <group position={[wx, 0, wz]}>
      <RoundedBox
        args={[CELL * 0.85, height, CELL * 0.85]}
        radius={0.08}
        smoothness={4}
        position={[0, height / 2, 0]}
        castShadow
        receiveShadow
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
        <meshStandardMaterial
          color={color}
          emissive={hovered ? color : "#000"}
          emissiveIntensity={hovered ? 0.35 : 0}
          roughness={0.4}
          metalness={0.2}
        />
      </RoundedBox>

      {/* Étiquette nom */}
      <Text
        position={[0, height + 0.15, 0]}
        fontSize={0.18}
        color="#f1f5f9"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000"
      >
        {space.name}
      </Text>

      {/* Animal occupant */}
      {occupied && (
        <Html position={[0, height + 0.42, 0]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
          <div className="bg-background/95 border border-primary/40 rounded-md px-2 py-0.5 text-[10px] font-medium text-primary whitespace-nowrap shadow-lg">
            🐾 {space.animal_name}
          </div>
        </Html>
      )}
    </group>
  );
}

export function Spaces3DView({ spaces, editing, onSelect, onMove }: Props) {
  return (
    <div className="relative w-full h-[480px] rounded-2xl overflow-hidden border border-border bg-gradient-to-b from-slate-900 to-slate-950">
      <Canvas
        shadows
        camera={{ position: [12, 12, 12], fov: 35 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#0b1220"]} />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[8, 12, 6]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <Suspense fallback={null}>
          <GridFloor />
          {spaces.map((s) => (
            <SpaceBox
              key={s.id}
              space={s}
              editing={editing}
              onSelect={onSelect}
              onMove={onMove}
            />
          ))}
        </Suspense>
        <OrbitControls
          enablePan
          enableRotate
          enableZoom
          maxPolarAngle={Math.PI / 2.2}
          minDistance={6}
          maxDistance={30}
          target={[0, 0, 0]}
        />
      </Canvas>

      {editing && (
        <div className="absolute top-3 left-3 right-3 pointer-events-none">
          <div className="bg-primary/90 text-primary-foreground text-xs px-3 py-1.5 rounded-lg text-center shadow-lg backdrop-blur">
            ✋ Mode édition · Glissez les espaces sur la grille pour repositionner
          </div>
        </div>
      )}
    </div>
  );
}
