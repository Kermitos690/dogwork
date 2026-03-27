import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../constants";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance
  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 80 } });
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Title entrance
  const titleY = interpolate(
    spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 120 } }),
    [0, 1], [60, 0]
  );
  const titleOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });

  // Subtitle entrance
  const subOpacity = interpolate(frame, [45, 65], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(
    spring({ frame: frame - 45, fps, config: { damping: 20 } }),
    [0, 1], [30, 0]
  );

  // Dog image
  const dogScale = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 60 } });
  const dogOpacity = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: "clamp" });

  // Glow pulse
  const glowOpacity = interpolate(Math.sin(frame * 0.06), [-1, 1], [0.3, 0.7]);

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {/* Hero glow */}
      <div style={{
        position: "absolute",
        width: 800,
        height: 800,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${COLORS.primary}30, transparent 70%)`,
        left: 960 - 400,
        top: 540 - 400,
        opacity: glowOpacity,
      }} />

      {/* Dog photo - right side */}
      <div style={{
        position: "absolute",
        right: 80,
        top: 140,
        width: 500,
        height: 500,
        borderRadius: 40,
        overflow: "hidden",
        transform: `scale(${dogScale})`,
        opacity: dogOpacity,
        boxShadow: `0 40px 100px ${COLORS.primary}40`,
      }}>
        <Img src={staticFile("images/hero-dog.jpg")} style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }} />
        {/* Overlay gradient */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${COLORS.primary}20, transparent 60%)`,
        }} />
      </div>

      {/* Logo */}
      <div style={{
        position: "absolute",
        left: 120,
        top: 160,
        display: "flex",
        alignItems: "center",
        gap: 16,
        transform: `scale(${logoScale})`,
        opacity: logoOpacity,
      }}>
        <Img src={staticFile("images/logo-icon.png")} style={{ width: 64, height: 64, borderRadius: 12 }} />
      </div>

      {/* Title */}
      <div style={{
        position: "absolute",
        left: 120,
        top: 280,
        transform: `translateY(${titleY}px)`,
        opacity: titleOpacity,
      }}>
        <div style={{
          fontFamily: FONTS.outfit,
          fontSize: 90,
          fontWeight: 900,
          color: COLORS.text,
          lineHeight: 1.05,
          letterSpacing: -3,
        }}>
          <span>Dog</span>
          <span style={{ color: COLORS.primary }}>Work</span>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{
        position: "absolute",
        left: 120,
        top: 400,
        transform: `translateY(${subY}px)`,
        opacity: subOpacity,
        maxWidth: 650,
      }}>
        <div style={{
          fontFamily: FONTS.inter,
          fontSize: 32,
          fontWeight: 500,
          color: COLORS.textMuted,
          lineHeight: 1.5,
        }}>
          L'éducation canine intelligente.
        </div>
        <div style={{
          fontFamily: FONTS.inter,
          fontSize: 26,
          fontWeight: 400,
          color: COLORS.textMuted,
          lineHeight: 1.5,
          marginTop: 12,
          opacity: 0.7,
        }}>
          Plans personnalisés · Suivi comportemental · Gestion refuge
        </div>
      </div>

      {/* Animated line accent */}
      <div style={{
        position: "absolute",
        left: 120,
        top: 260,
        width: interpolate(frame, [15, 50], [0, 300], { extrapolateRight: "clamp" }),
        height: 3,
        background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`,
        borderRadius: 2,
      }} />
    </AbsoluteFill>
  );
};
