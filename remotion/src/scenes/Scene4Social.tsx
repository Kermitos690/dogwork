import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../constants";

export const Scene4Social = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgScale = interpolate(frame, [0, 150], [1, 1.1], { extrapolateRight: "clamp" });

  // Animated counter
  const counterProgress = interpolate(frame, [20, 80], [0, 1], { extrapolateRight: "clamp" });
  const adoptionCount = Math.round(counterProgress * 2847);

  const cards = [
    { name: "Luna", breed: "Staffie blue", status: "Adoptée ✅", days: "45 jours en refuge", delay: 25 },
    { name: "Rocky", breed: "Staffie bringé", status: "En éducation 🎓", days: "Jour 12/30", delay: 40 },
    { name: "Maya", breed: "Croisée staffie", status: "Évaluée 📋", days: "Prête à l'adoption", delay: 55 },
  ];

  return (
    <AbsoluteFill>
      {/* Background adoption photo */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img src={staticFile("images/staffie-adoption.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${imgScale})`,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(to right, ${COLORS.bg}f0 0%, ${COLORS.bg}d0 55%, ${COLORS.bg}60 100%)`,
        }} />
      </div>

      {/* Content */}
      <div style={{
        position: "absolute", left: 120, top: 0, bottom: 0,
        display: "flex", flexDirection: "column", justifyContent: "center",
        width: 800,
      }}>
        <div style={{
          fontFamily: FONTS.inter, fontWeight: 600, fontSize: 14,
          color: COLORS.emerald, letterSpacing: 4, textTransform: "uppercase",
          opacity: spring({ frame: frame - 5, fps, config: { damping: 20 } }),
          marginBottom: 16,
        }}>
          Impact réel
        </div>

        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 48,
          color: COLORS.text, lineHeight: 1.15, marginBottom: 16,
          opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(frame, [5, 25], [40, 0], { extrapolateRight: "clamp" })}px)`,
        }}>
          Du refuge à la <span style={{ color: COLORS.emerald }}>famille</span>
        </div>

        {/* Counter */}
        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 72,
          background: `linear-gradient(90deg, ${COLORS.amber}, ${COLORS.emerald})`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 40,
          opacity: interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          {adoptionCount.toLocaleString()} adoptions
        </div>

        {/* Animal tracking cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {cards.map((c, i) => {
            const sp = spring({ frame: frame - c.delay, fps, config: { damping: 14 } });
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "18px 28px",
                borderRadius: 14,
                background: `${COLORS.text}0a`,
                border: `1px solid ${COLORS.text}15`,
                opacity: sp,
                transform: `translateX(${interpolate(sp, [0, 1], [-80, 0])}px)`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `linear-gradient(135deg, ${COLORS.primary}30, ${COLORS.accent}30)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 18,
                    color: COLORS.primary,
                  }}>
                    {c.name[0]}
                  </div>
                  <div>
                    <div style={{
                      fontFamily: FONTS.outfit, fontWeight: 700, fontSize: 20,
                      color: COLORS.text,
                    }}>{c.name} <span style={{ color: COLORS.textMuted, fontWeight: 400, fontSize: 16 }}>— {c.breed}</span></div>
                    <div style={{
                      fontFamily: FONTS.inter, fontWeight: 500, fontSize: 14,
                      color: COLORS.textMuted,
                    }}>{c.days}</div>
                  </div>
                </div>
                <div style={{
                  fontFamily: FONTS.inter, fontWeight: 600, fontSize: 15,
                  color: COLORS.emerald,
                  padding: "6px 16px", borderRadius: 8,
                  background: `${COLORS.emerald}15`,
                }}>
                  {c.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
