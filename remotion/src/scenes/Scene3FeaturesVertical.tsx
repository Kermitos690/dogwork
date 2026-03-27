import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { FONTS, COLORS } from "../constants";

export const Scene3FeaturesVertical = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: "🧠", title: "Plans IA", desc: "Éducation adaptée", color: COLORS.primary, delay: 15 },
    { icon: "🏥", title: "Gestion refuge", desc: "Suivi de chaque animal", color: COLORS.emerald, delay: 30 },
    { icon: "📊", title: "Évaluations pro", desc: "Analyses comportementales", color: COLORS.accent, delay: 45 },
    { icon: "💬", title: "Messagerie", desc: "Refuge ↔ Éducateur ↔ Adoptant", color: COLORS.amber, delay: 60 },
  ];

  const titleSp = spring({ frame: frame - 5, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, ${COLORS.bg} 0%, ${COLORS.bgLight} 50%, ${COLORS.bg} 100%)`,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0 50px", textAlign: "center",
      }}>
        <div style={{
          fontFamily: FONTS.inter, fontWeight: 600, fontSize: 14,
          color: COLORS.primary, letterSpacing: 4, textTransform: "uppercase",
          opacity: titleSp, marginBottom: 20,
        }}>La solution</div>

        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 44,
          color: COLORS.text, lineHeight: 1.15, marginBottom: 56,
          opacity: titleSp,
          transform: `translateY(${interpolate(titleSp, [0, 1], [40, 0])}px)`,
        }}>
          Une plateforme,<br />
          <span style={{
            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>tous les acteurs</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
          {features.map((f, i) => {
            const sp = spring({ frame: frame - f.delay, fps, config: { damping: 14, stiffness: 100 } });
            const hover = Math.sin((frame + i * 30) * 0.05) * 3;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 18,
                padding: "24px 28px", borderRadius: 16,
                background: `${COLORS.text}08`,
                border: `1px solid ${f.color}25`,
                opacity: sp,
                transform: `translateY(${interpolate(sp, [0, 1], [50, hover])}px) scale(${interpolate(sp, [0, 1], [0.9, 1])})`,
              }}>
                <div style={{
                  fontSize: 32, width: 48, height: 48,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 12, background: `${f.color}15`, flexShrink: 0,
                }}>{f.icon}</div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontFamily: FONTS.outfit, fontWeight: 700, fontSize: 20, color: COLORS.text }}>{f.title}</div>
                  <div style={{ fontFamily: FONTS.inter, fontWeight: 400, fontSize: 15, color: COLORS.textMuted }}>{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
