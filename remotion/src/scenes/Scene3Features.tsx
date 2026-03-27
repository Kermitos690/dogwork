import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { FONTS, COLORS } from "../MainVideo";

const FEATURES = [
  { title: "Plans IA personnalisés", desc: "28 jours adaptés au profil de votre chien", color: COLORS.primary },
  { title: "Suivi comportemental", desc: "Journal, évaluation, statistiques en temps réel", color: COLORS.accent },
  { title: "Gestion de refuge", desc: "Animaux, employés, espaces, adoptions", color: COLORS.amber },
  { title: "Espace éducateur", desc: "Clients, cours, calendrier, paiements", color: "#10B981" },
];

export const Scene3Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleScale = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {/* Title */}
      <div style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 60,
        textAlign: "center",
        opacity: titleOpacity,
        transform: `scale(${titleScale})`,
      }}>
        <div style={{
          fontFamily: FONTS.outfit,
          fontSize: 56,
          fontWeight: 900,
          color: COLORS.text,
        }}>
          La solution<span style={{ color: COLORS.primary }}>.</span>
        </div>
      </div>

      {/* Training photo background */}
      <div style={{
        position: "absolute",
        right: 0,
        top: 0,
        width: "100%",
        height: "100%",
        opacity: interpolate(frame, [10, 40], [0, 0.12], { extrapolateRight: "clamp" }),
      }}>
        <Img src={staticFile("images/training-scene.jpg")} style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }} />
      </div>

      {/* Feature cards grid */}
      <div style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: 180,
        display: "flex",
        flexWrap: "wrap",
        gap: 30,
        justifyContent: "center",
      }}>
        {FEATURES.map((feat, i) => {
          const delay = 20 + i * 20;
          const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 80 } });
          const y = interpolate(s, [0, 1], [80, 0]);
          const opacity = interpolate(frame, [delay, delay + 20], [0, 1], { extrapolateRight: "clamp" });
          const cardFloat = Math.sin((frame + i * 20) * 0.04) * 3;

          return (
            <div key={i} style={{
              width: 400,
              padding: 40,
              borderRadius: 24,
              background: `linear-gradient(145deg, ${COLORS.bgLight}F0, ${COLORS.bg}E0)`,
              border: `1px solid ${feat.color}30`,
              opacity,
              transform: `translateY(${y + cardFloat}px)`,
              boxShadow: `0 20px 60px ${feat.color}15`,
            }}>
              {/* Accent dot */}
              <div style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: feat.color,
                marginBottom: 20,
                boxShadow: `0 0 20px ${feat.color}60`,
              }} />
              <div style={{
                fontFamily: FONTS.outfit,
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.text,
                marginBottom: 10,
              }}>
                {feat.title}
              </div>
              <div style={{
                fontFamily: FONTS.inter,
                fontSize: 20,
                fontWeight: 400,
                color: COLORS.textMuted,
                lineHeight: 1.5,
              }}>
                {feat.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom stat bar */}
      <div style={{
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        gap: 80,
        opacity: interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        {[
          { num: "200+", label: "exercices" },
          { num: "28", label: "jours de plan" },
          { num: "4", label: "rôles métier" },
        ].map((stat, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: FONTS.outfit,
              fontSize: 42,
              fontWeight: 900,
              color: COLORS.primary,
            }}>{stat.num}</div>
            <div style={{
              fontFamily: FONTS.inter,
              fontSize: 18,
              color: COLORS.textMuted,
            }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
