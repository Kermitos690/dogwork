import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../MainVideo";

export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const titleOpacity = interpolate(frame, [15, 40], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(
    spring({ frame: frame - 15, fps, config: { damping: 20 } }),
    [0, 1], [40, 0]
  );

  const ctaOpacity = interpolate(frame, [45, 65], [0, 1], { extrapolateRight: "clamp" });
  const ctaScale = spring({ frame: frame - 45, fps, config: { damping: 12 } });

  const urlOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" });

  // Pulsing glow on CTA
  const ctaGlow = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.4, 1]);

  // Big gradient orbs
  const orb1Y = Math.sin(frame * 0.03) * 30;
  const orb2Y = Math.cos(frame * 0.025) * 25;

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {/* Dramatic gradient orbs */}
      <div style={{
        position: "absolute",
        width: 900,
        height: 900,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${COLORS.primary}20, transparent 60%)`,
        left: 510,
        top: 90 + orb1Y,
      }} />
      <div style={{
        position: "absolute",
        width: 600,
        height: 600,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${COLORS.accent}15, transparent 60%)`,
        left: 200,
        top: 300 + orb2Y,
      }} />

      {/* Logo centered */}
      <div style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 200,
        display: "flex",
        justifyContent: "center",
        opacity: logoOpacity,
        transform: `scale(${logoScale})`,
      }}>
        <Img src={staticFile("images/logo-icon.png")} style={{
          width: 100,
          height: 100,
          borderRadius: 24,
        }} />
      </div>

      {/* Brand title */}
      <div style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 330,
        textAlign: "center",
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
      }}>
        <div style={{
          fontFamily: FONTS.outfit,
          fontSize: 100,
          fontWeight: 900,
          letterSpacing: -4,
          color: COLORS.text,
        }}>
          Dog<span style={{ color: COLORS.primary }}>Work</span>
        </div>
      </div>

      {/* CTA pill */}
      <div style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 490,
        display: "flex",
        justifyContent: "center",
        opacity: ctaOpacity,
        transform: `scale(${ctaScale})`,
      }}>
        <div style={{
          padding: "18px 60px",
          borderRadius: 100,
          background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
          fontFamily: FONTS.outfit,
          fontSize: 28,
          fontWeight: 700,
          color: "#fff",
          boxShadow: `0 0 ${40 * ctaGlow}px ${COLORS.primary}60`,
        }}>
          Commencez gratuitement
        </div>
      </div>

      {/* URL */}
      <div style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 580,
        textAlign: "center",
        opacity: urlOpacity,
      }}>
        <div style={{
          fontFamily: FONTS.inter,
          fontSize: 24,
          fontWeight: 500,
          color: COLORS.textMuted,
          letterSpacing: 1,
        }}>
          dogwork.lovable.app
        </div>
      </div>

      {/* Tagline */}
      <div style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 120,
        textAlign: "center",
        opacity: interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{
          fontFamily: FONTS.inter,
          fontSize: 20,
          color: `${COLORS.textMuted}80`,
          letterSpacing: 3,
          textTransform: "uppercase",
        }}>
          Éducation canine intelligente
        </div>
      </div>
    </AbsoluteFill>
  );
};
