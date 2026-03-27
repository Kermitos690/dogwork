import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../constants";

export const Scene1HookVertical = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgScale = interpolate(frame, [0, 130], [1, 1.15], { extrapolateRight: "clamp" });
  const imgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const overlayOpacity = interpolate(frame, [0, 40], [0.3, 0.7], { extrapolateRight: "clamp" });

  const logoScale = spring({ frame: frame - 15, fps, config: { damping: 15, stiffness: 120 } });
  const titleSpring = spring({ frame: frame - 30, fps, config: { damping: 18, stiffness: 100 } });
  const subSpring = spring({ frame: frame - 50, fps, config: { damping: 20, stiffness: 90 } });
  const tagSpring = spring({ frame: frame - 70, fps, config: { damping: 12, stiffness: 80 } });
  const pulse = Math.sin(frame * 0.08) * 3;

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img src={staticFile("images/staffie-hero.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${imgScale})`, opacity: imgOpacity,
        }} />
      </div>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(to top, ${COLORS.bg}f5 0%, ${COLORS.bg}${Math.round(overlayOpacity * 255).toString(16).padStart(2, "0")} 40%, transparent 70%)`,
      }} />

      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 120,
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "0 60px",
      }}>
        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 24,
          color: COLORS.primary, letterSpacing: 6,
          transform: `scale(${logoScale})`, opacity: logoScale, marginBottom: 24,
        }}>DOGWORK</div>

        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 64,
          color: COLORS.text, lineHeight: 1.1,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(titleSpring, [0, 1], [60, 0])}px)`,
          marginBottom: 20,
        }}>
          Chaque chien<br />mérite un<br /><span style={{ color: COLORS.primary }}>avenir</span>
        </div>

        <div style={{
          fontFamily: FONTS.inter, fontWeight: 500, fontSize: 22,
          color: COLORS.textMuted, maxWidth: 500,
          opacity: interpolate(subSpring, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(subSpring, [0, 1], [30, 0])}px)`,
          lineHeight: 1.5, marginBottom: 28,
        }}>
          Éducation canine intelligente<br />& gestion de refuge
        </div>

        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
          opacity: tagSpring,
          transform: `translateY(${interpolate(tagSpring, [0, 1], [30, pulse])}px)`,
        }}>
          {["Propriétaires", "Éducateurs", "Refuges"].map((t, i) => (
            <div key={t} style={{
              fontFamily: FONTS.inter, fontWeight: 600, fontSize: 15,
              color: COLORS.text, padding: "10px 22px", borderRadius: 100,
              background: i === 2 ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.primary})` : `${COLORS.text}15`,
              border: i === 2 ? "none" : `1px solid ${COLORS.text}20`,
              transform: `scale(${spring({ frame: frame - 70 - i * 8, fps, config: { damping: 10 } })})`,
            }}>{t}</div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
