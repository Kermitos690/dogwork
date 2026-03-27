import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../constants";

export const Scene4SocialVertical = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgScale = interpolate(frame, [0, 150], [1, 1.1], { extrapolateRight: "clamp" });
  const counterProgress = interpolate(frame, [20, 80], [0, 1], { extrapolateRight: "clamp" });
  const adoptionCount = Math.round(counterProgress * 2847);

  const cards = [
    { name: "Luna", breed: "Staffie blue", status: "Adoptée ✅", delay: 25 },
    { name: "Rocky", breed: "Staffie bringé", status: "En éducation 🎓", delay: 40 },
    { name: "Maya", breed: "Croisée staffie", status: "Évaluée 📋", delay: 55 },
  ];

  return (
    <AbsoluteFill>
      {/* Top: adoption photo */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "40%", overflow: "hidden" }}>
        <Img src={staticFile("images/staffie-adoption.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${imgScale})`,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(to bottom, transparent 20%, ${COLORS.bg} 100%)`,
        }} />
      </div>

      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, top: "32%",
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "0 40px",
      }}>
        <div style={{
          fontFamily: FONTS.inter, fontWeight: 600, fontSize: 14,
          color: COLORS.emerald, letterSpacing: 4, textTransform: "uppercase",
          opacity: spring({ frame: frame - 5, fps, config: { damping: 20 } }),
          marginBottom: 12,
        }}>Impact réel</div>

        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 40,
          color: COLORS.text, lineHeight: 1.15, marginBottom: 12,
          opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          Du refuge à la <span style={{ color: COLORS.emerald }}>famille</span>
        </div>

        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 56,
          background: `linear-gradient(90deg, ${COLORS.amber}, ${COLORS.emerald})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 36,
          opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          {adoptionCount.toLocaleString()} adoptions
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
          {cards.map((c, i) => {
            const sp = spring({ frame: frame - c.delay, fps, config: { damping: 14 } });
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 22px", borderRadius: 14,
                background: `${COLORS.text}0a`, border: `1px solid ${COLORS.text}15`,
                opacity: sp,
                transform: `translateX(${interpolate(sp, [0, 1], [-60, 0])}px)`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: `linear-gradient(135deg, ${COLORS.primary}30, ${COLORS.accent}30)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 16, color: COLORS.primary,
                  }}>{c.name[0]}</div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontFamily: FONTS.outfit, fontWeight: 700, fontSize: 17, color: COLORS.text }}>{c.name}</div>
                    <div style={{ fontFamily: FONTS.inter, fontWeight: 400, fontSize: 13, color: COLORS.textMuted }}>{c.breed}</div>
                  </div>
                </div>
                <div style={{
                  fontFamily: FONTS.inter, fontWeight: 600, fontSize: 13, color: COLORS.emerald,
                  padding: "5px 12px", borderRadius: 8, background: `${COLORS.emerald}15`,
                }}>{c.status}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
