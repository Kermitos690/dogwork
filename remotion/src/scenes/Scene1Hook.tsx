import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../constants";

export const Scene1Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgScale = interpolate(frame, [0, 130], [1, 1.15], { extrapolateRight: "clamp" });
  const imgOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  
  const overlayOpacity = interpolate(frame, [0, 40], [0.2, 0.65], { extrapolateRight: "clamp" });

  const logoScale = spring({ frame: frame - 15, fps, config: { damping: 15, stiffness: 120 } });
  const logoY = interpolate(logoScale, [0, 1], [60, 0]);

  const titleSpring = spring({ frame: frame - 30, fps, config: { damping: 18, stiffness: 100 } });
  const titleY = interpolate(titleSpring, [0, 1], [80, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  const subSpring = spring({ frame: frame - 50, fps, config: { damping: 20, stiffness: 90 } });
  const subY = interpolate(subSpring, [0, 1], [40, 0]);
  const subOpacity = interpolate(subSpring, [0, 1], [0, 1]);

  const tagSpring = spring({ frame: frame - 70, fps, config: { damping: 12, stiffness: 80 } });

  const pulse = Math.sin(frame * 0.08) * 3;

  return (
    <AbsoluteFill>
      {/* Hero staffie image */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden",
      }}>
        <Img src={staticFile("images/staffie-hero.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${imgScale})`,
          opacity: imgOpacity,
        }} />
      </div>

      {/* Gradient overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(135deg, ${COLORS.bg}ee ${overlayOpacity * 100}%, ${COLORS.primary}40 100%)`,
      }} />

      {/* Accent line */}
      <div style={{
        position: "absolute", left: 120, top: 200, bottom: 200,
        width: 4,
        background: `linear-gradient(to bottom, ${COLORS.primary}, ${COLORS.accent})`,
        opacity: interpolate(frame, [10, 40], [0, 0.8], { extrapolateRight: "clamp" }),
        transform: `scaleY(${interpolate(frame, [10, 50], [0, 1], { extrapolateRight: "clamp" })})`,
        transformOrigin: "top",
      }} />

      {/* Content */}
      <div style={{
        position: "absolute", left: 160, top: 0, bottom: 0,
        display: "flex", flexDirection: "column", justifyContent: "center",
        gap: 24,
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 32,
          color: COLORS.primary, letterSpacing: 6,
          transform: `translateY(${logoY}px) scale(${logoScale})`,
          opacity: logoScale,
        }}>
          DOGWORK
        </div>

        {/* Title */}
        <div style={{
          fontFamily: FONTS.outfit, fontWeight: 900, fontSize: 82,
          color: COLORS.text, lineHeight: 1.05,
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          maxWidth: 800,
        }}>
          Chaque chien
          <br />
          mérite un
          <br />
          <span style={{ color: COLORS.primary }}>avenir</span>
        </div>

        {/* Subtitle */}
        <div style={{
          fontFamily: FONTS.inter, fontWeight: 500, fontSize: 26,
          color: COLORS.textMuted, maxWidth: 600,
          transform: `translateY(${subY}px)`,
          opacity: subOpacity,
          lineHeight: 1.5,
        }}>
          Éducation canine intelligente & gestion de refuge
          <br />
          sur une seule plateforme
        </div>

        {/* Tags */}
        <div style={{
          display: "flex", gap: 16, marginTop: 12,
          opacity: tagSpring,
          transform: `translateY(${interpolate(tagSpring, [0, 1], [30, pulse])}px)`,
        }}>
          {["Propriétaires", "Éducateurs", "Refuges"].map((t, i) => (
            <div key={t} style={{
              fontFamily: FONTS.inter, fontWeight: 600, fontSize: 16,
              color: COLORS.text, padding: "10px 24px",
              borderRadius: 100,
              background: i === 2 ? `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.primary})` : `${COLORS.text}15`,
              border: i === 2 ? "none" : `1px solid ${COLORS.text}20`,
              transform: `scale(${spring({ frame: frame - 70 - i * 8, fps, config: { damping: 10 } })})`,
            }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
