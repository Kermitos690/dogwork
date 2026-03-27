import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../MainVideo";

export const Scene4Social: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const imgOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const imgScale = spring({ frame, fps, config: { damping: 12, stiffness: 60 } });

  const textOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(
    spring({ frame: frame - 20, fps, config: { damping: 20 } }),
    [0, 1], [50, 0]
  );

  const quoteOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {/* Warm glow */}
      <div style={{
        position: "absolute",
        width: 800,
        height: 800,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${COLORS.amber}15, transparent 70%)`,
        right: -100,
        bottom: -200,
      }} />

      {/* Adoption image - left */}
      <div style={{
        position: "absolute",
        left: 80,
        top: 120,
        width: 700,
        height: 480,
        borderRadius: 30,
        overflow: "hidden",
        opacity: imgOpacity,
        transform: `scale(${imgScale})`,
        boxShadow: `0 30px 80px ${COLORS.bg}80`,
      }}>
        <Img src={staticFile("images/adoption-scene.jpg")} style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${1 + frame * 0.001})`, // Ken Burns
        }} />
        <div style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to right, transparent 50%, ${COLORS.bg}90 100%)`,
        }} />
      </div>

      {/* Text right */}
      <div style={{
        position: "absolute",
        right: 100,
        top: 180,
        maxWidth: 550,
        opacity: textOpacity,
        transform: `translateY(${textY}px)`,
      }}>
        <div style={{
          fontFamily: FONTS.outfit,
          fontSize: 48,
          fontWeight: 900,
          color: COLORS.text,
          lineHeight: 1.2,
          marginBottom: 20,
        }}>
          Pour chaque<br />
          <span style={{ color: COLORS.amber }}>compagnon</span>.
        </div>
        <div style={{
          fontFamily: FONTS.inter,
          fontSize: 22,
          color: COLORS.textMuted,
          lineHeight: 1.7,
        }}>
          Particuliers, éducateurs canins, refuges — DogWork s'adapte à chaque besoin.
        </div>
      </div>

      {/* Testimonial quote */}
      <div style={{
        position: "absolute",
        right: 100,
        bottom: 140,
        maxWidth: 500,
        opacity: quoteOpacity,
        padding: 30,
        borderRadius: 20,
        background: `${COLORS.bgLight}D0`,
        borderLeft: `4px solid ${COLORS.amber}`,
      }}>
        <div style={{
          fontFamily: FONTS.inter,
          fontSize: 20,
          fontStyle: "italic",
          color: COLORS.textMuted,
          lineHeight: 1.6,
        }}>
          "Mon chien a progressé en 2 semaines ce qui prenait 2 mois avant."
        </div>
        <div style={{
          fontFamily: FONTS.inter,
          fontSize: 16,
          color: COLORS.primary,
          marginTop: 12,
        }}>
          — Marie, propriétaire de Rex
        </div>
      </div>
    </AbsoluteFill>
  );
};
