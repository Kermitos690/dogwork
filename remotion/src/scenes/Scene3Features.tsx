import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../constants";

export const Scene3Features = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: "🧠", title: "Plans IA personnalisés", desc: "Éducation adaptée à chaque profil", color: COLORS.primary, delay: 15 },
    { icon: "🏥", title: "Gestion de refuge", desc: "Suivi complet de chaque animal", color: COLORS.emerald, delay: 30 },
    { icon: "📊", title: "Évaluations comportementales", desc: "Analyses pro pour les éducateurs", color: COLORS.accent, delay: 45 },
    { icon: "💬", title: "Messagerie intégrée", desc: "Refuge ↔ Éducateur ↔ Adoptant", color: COLORS.amber, delay: 60 },
  ];

  const titleSp = spring({ frame: frame - 5, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(160deg, ${COLORS.bg} 0%, ${COLORS.bgLight} 50%, ${COLORS.bg} 100%)`,
    }}>
      {/* Background app screenshot */}
      <div style={{
        position: "absolute", right: -40, top: "50%", transform: "translateY(-50%)",
        width: 700, height: 500, borderRadius: 20, overflow: "hidden",
        opacity: interpolate(frame, [20, 50], [0, 0.2], { extrapolateRight: "clamp" }),
      }}>
        <Img src={staticFile("images/app-dashboard.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
        }} />
      </div>

      {/* Floating grid dots */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: 80 + (i % 5) * 380,
          top: 80 + Math.floor(i / 5) * 250,
          width: 3, height: 3, borderRadius: "50%",
          backgroundColor: COLORS.primary,
          opacity: interpolate(Math.sin((frame + i * 20) * 0.04), [-1, 1], [0.05, 0.15]),
        }} />
      ))}

      {/* Content */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "0 120px",
      }}>
        {/* Label */}
        <div style={{
          fontFamily: FONTS.inter, fontWeight: 600, fontSize: 14,
          color: COLORS.primary, letterSpacing: 4, textTransform: "uppercase",
          opacity: titleSp, marginBottom: 16,
        }}>
          La solution
        </div>

        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 52,
          color: COLORS.text, lineHeight: 1.15, marginBottom: 56,
          opacity: titleSp,
          transform: `translateY(${interpolate(titleSp, [0, 1], [40, 0])}px)`,
        }}>
          Une plateforme,
          <br />
          <span style={{
            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            tous les acteurs
          </span>
        </div>

        {/* Feature cards grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24,
          maxWidth: 900,
        }}>
          {features.map((f, i) => {
            const sp = spring({ frame: frame - f.delay, fps, config: { damping: 14, stiffness: 100 } });
            const hover = Math.sin((frame + i * 30) * 0.05) * 3;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 18,
                padding: "28px 32px",
                borderRadius: 16,
                background: `${COLORS.text}08`,
                border: `1px solid ${f.color}25`,
                opacity: sp,
                transform: `translateY(${interpolate(sp, [0, 1], [50, hover])}px) scale(${interpolate(sp, [0, 1], [0.9, 1])})`,
              }}>
                <div style={{
                  fontSize: 36, width: 50, height: 50,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 12,
                  background: `${f.color}15`,
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{
                    fontFamily: FONTS.outfit, fontWeight: 700, fontSize: 22,
                    color: COLORS.text, marginBottom: 6,
                  }}>{f.title}</div>
                  <div style={{
                    fontFamily: FONTS.inter, fontWeight: 400, fontSize: 16,
                    color: COLORS.textMuted,
                  }}>{f.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
