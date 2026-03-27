import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { FONTS, COLORS } from "../MainVideo";

const PROBLEMS = [
  { icon: "😰", text: "Programmes génériques qui ne marchent pas" },
  { icon: "📋", text: "Suivi papier impossible à maintenir" },
  { icon: "🏠", text: "Refuges submergés sans outils adaptés" },
  { icon: "💸", text: "Éducateurs sans plateforme professionnelle" },
];

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleX = interpolate(
    spring({ frame, fps, config: { damping: 20, stiffness: 120 } }),
    [0, 1], [-80, 0]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "transparent" }}>
      {/* Red-tinted glow for problem scene */}
      <div style={{
        position: "absolute",
        width: 600,
        height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, #EF444420, transparent 70%)",
        left: -100,
        top: -100,
      }} />

      {/* Title */}
      <div style={{
        position: "absolute",
        left: 120,
        top: 120,
        opacity: titleOpacity,
        transform: `translateX(${titleX}px)`,
      }}>
        <div style={{
          fontFamily: FONTS.outfit,
          fontSize: 56,
          fontWeight: 900,
          color: COLORS.text,
          lineHeight: 1.2,
        }}>
          Le problème<span style={{ color: "#EF4444" }}>.</span>
        </div>
      </div>

      {/* Problem cards */}
      {PROBLEMS.map((problem, i) => {
        const delay = 20 + i * 18;
        const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 100 } });
        const x = interpolate(s, [0, 1], [100, 0]);
        const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });

        return (
          <div key={i} style={{
            position: "absolute",
            left: 120,
            top: 230 + i * 130,
            opacity,
            transform: `translateX(${x}px)`,
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}>
            <div style={{
              width: 70,
              height: 70,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${COLORS.bgLight}, #1E293B)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              border: "1px solid #ffffff10",
            }}>
              {problem.icon}
            </div>
            <div style={{
              fontFamily: FONTS.inter,
              fontSize: 28,
              fontWeight: 500,
              color: COLORS.textMuted,
              maxWidth: 600,
            }}>
              {problem.text}
            </div>
          </div>
        );
      })}

      {/* Right side big question mark */}
      <div style={{
        position: "absolute",
        right: 120,
        top: 200,
        fontFamily: FONTS.outfit,
        fontSize: 400,
        fontWeight: 900,
        color: `${COLORS.primary}08`,
        lineHeight: 1,
        transform: `rotate(${interpolate(frame, [0, 120], [-5, 5])}deg)`,
      }}>
        ?
      </div>
    </AbsoluteFill>
  );
};
