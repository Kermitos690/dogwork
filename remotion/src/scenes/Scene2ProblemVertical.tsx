import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../constants";

export const Scene2ProblemVertical = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgScale = interpolate(frame, [0, 150], [1.05, 1.2], { extrapolateRight: "clamp" });

  const stats = [
    { value: "100K+", label: "Animaux en refuge", icon: "🏠", delay: 20 },
    { value: "60%", label: "Sont des staffies ou croisés", icon: "🐕", delay: 35 },
    { value: "1/3", label: "Attendent +1 an en box", icon: "⏳", delay: 50 },
  ];

  return (
    <AbsoluteFill>
      {/* Top half: shelter image */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "45%", overflow: "hidden" }}>
        <Img src={staticFile("images/staffie-shelter.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${imgScale})`,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(to bottom, transparent 30%, ${COLORS.bg} 100%)`,
        }} />
      </div>

      {/* Bottom: content */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, top: "38%",
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "0 50px",
      }}>
        <div style={{
          fontFamily: FONTS.inter, fontWeight: 600, fontSize: 14,
          color: COLORS.rose, letterSpacing: 4, textTransform: "uppercase",
          opacity: spring({ frame: frame - 5, fps, config: { damping: 20 } }),
          marginBottom: 20,
        }}>Le constat</div>

        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 44,
          color: COLORS.text, lineHeight: 1.15, marginBottom: 48,
          opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [5, 25], [40, 0], { extrapolateRight: "clamp" })}px)`,
        }}>
          Des milliers d'animaux<br /><span style={{ color: COLORS.rose }}>attendent</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28, width: "100%" }}>
          {stats.map((s, i) => {
            const sp = spring({ frame: frame - s.delay, fps, config: { damping: 15, stiffness: 100 } });
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 20,
                opacity: sp,
                transform: `translateX(${interpolate(sp, [0, 1], [-60, 0])}px)`,
              }}>
                <div style={{ fontSize: 32 }}>{s.icon}</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 32, color: COLORS.amber }}>{s.value}</div>
                  <div style={{ fontFamily: FONTS.inter, fontWeight: 500, fontSize: 16, color: COLORS.textMuted }}>{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
