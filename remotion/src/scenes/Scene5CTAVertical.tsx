import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../constants";

export const Scene5CTAVertical = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgOpacity = interpolate(frame, [0, 30], [0, 0.25], { extrapolateRight: "clamp" });
  const logoSp = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 80 } });
  const titleSp = spring({ frame: frame - 25, fps, config: { damping: 15, stiffness: 90 } });
  const tagSp = spring({ frame: frame - 45, fps, config: { damping: 18 } });
  const urlSp = spring({ frame: frame - 60, fps, config: { damping: 20 } });
  const breathe = Math.sin(frame * 0.06) * 4;
  const glowSize = 50 + Math.sin(frame * 0.08) * 15;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse ${glowSize}% ${glowSize}% at 50% 50%, ${COLORS.primary}20 0%, ${COLORS.bg} 70%)`,
    }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img src={staticFile("images/staffie-training.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover", opacity: imgOpacity,
        }} />
      </div>

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "0 50px",
      }}>
        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 24,
          color: COLORS.primary, letterSpacing: 8,
          opacity: logoSp, transform: `scale(${logoSp})`, marginBottom: 36,
        }}>DOGWORK</div>

        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 58,
          color: COLORS.text, lineHeight: 1.1,
          opacity: titleSp,
          transform: `translateY(${interpolate(titleSp, [0, 1], [60, breathe])}px)`,
          marginBottom: 28,
        }}>
          Rejoignez le<br />
          <span style={{
            background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent}, ${COLORS.emerald})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>mouvement</span>
        </div>

        <div style={{
          display: "flex", flexDirection: "column", gap: 10, marginBottom: 40,
          opacity: tagSp, transform: `translateY(${interpolate(tagSp, [0, 1], [30, 0])}px)`,
        }}>
          {["Éducation IA", "Gestion refuge", "Suivi adoption"].map((t, i) => (
            <div key={t} style={{
              fontFamily: FONTS.inter, fontWeight: 600, fontSize: 16,
              color: COLORS.text, padding: "10px 28px", borderRadius: 100,
              background: `${COLORS.text}10`, border: `1px solid ${COLORS.text}20`,
              transform: `scale(${spring({ frame: frame - 45 - i * 6, fps, config: { damping: 10 } })})`,
            }}>{t}</div>
          ))}
        </div>

        <div style={{
          fontFamily: FONTS.inter, fontWeight: 600, fontSize: 22,
          color: COLORS.primary, opacity: urlSp,
          transform: `translateY(${interpolate(urlSp, [0, 1], [20, 0])}px)`,
          padding: "14px 36px", borderRadius: 14,
          background: `${COLORS.primary}12`, border: `1px solid ${COLORS.primary}30`,
        }}>dogwork.lovable.app</div>

        <div style={{
          fontFamily: FONTS.inter, fontWeight: 500, fontSize: 14,
          color: COLORS.textMuted, marginTop: 20,
          opacity: interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" }),
        }}>Gratuit pour les propriétaires</div>
      </div>
    </AbsoluteFill>
  );
};
