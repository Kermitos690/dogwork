import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../constants";

export const Scene2Problem = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgX = interpolate(frame, [0, 150], [0, -30], { extrapolateRight: "clamp" });
  const imgScale = interpolate(frame, [0, 150], [1.05, 1.2], { extrapolateRight: "clamp" });

  const stats = [
    { value: "100K+", label: "Animaux en refuge en France", icon: "🏠", delay: 20 },
    { value: "60%", label: "Sont des staffies ou croisés", icon: "🐕", delay: 35 },
    { value: "1/3", label: "Attendent +1 an en box", icon: "⏳", delay: 50 },
  ];

  return (
    <AbsoluteFill>
      {/* Shelter photo - right half */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: "55%",
        overflow: "hidden",
      }}>
        <Img src={staticFile("images/staffie-shelter.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `translateX(${imgX}px) scale(${imgScale})`,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(to right, ${COLORS.bg} 0%, transparent 40%, transparent 100%)`,
        }} />
      </div>

      {/* Dark bg left */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "55%",
        background: `linear-gradient(135deg, ${COLORS.bg} 60%, transparent 100%)`,
      }} />

      {/* Content */}
      <div style={{
        position: "absolute", left: 120, top: 0, bottom: 0,
        display: "flex", flexDirection: "column", justifyContent: "center",
        width: 700,
      }}>
        {/* Section label */}
        <div style={{
          fontFamily: FONTS.inter, fontWeight: 600, fontSize: 14,
          color: COLORS.rose, letterSpacing: 4, textTransform: "uppercase",
          opacity: spring({ frame: frame - 5, fps, config: { damping: 20 } }),
          marginBottom: 20,
        }}>
          Le constat
        </div>

        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 52,
          color: COLORS.text, lineHeight: 1.15, marginBottom: 48,
          opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [5, 25], [40, 0], { extrapolateRight: "clamp" })}px)`,
        }}>
          Des milliers d'animaux
          <br />
          <span style={{ color: COLORS.rose }}>attendent</span> une chance
        </div>

        {/* Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {stats.map((s, i) => {
            const sp = spring({ frame: frame - s.delay, fps, config: { damping: 15, stiffness: 100 } });
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 20,
                opacity: sp,
                transform: `translateX(${interpolate(sp, [0, 1], [-60, 0])}px)`,
              }}>
                <div style={{
                  fontSize: 36, width: 60, textAlign: "center",
                }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{
                    fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 36,
                    color: COLORS.amber,
                  }}>{s.value}</div>
                  <div style={{
                    fontFamily: FONTS.inter, fontWeight: 500, fontSize: 18,
                    color: COLORS.textMuted,
                  }}>{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
