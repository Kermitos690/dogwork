import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/google-fonts/Outfit";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Problem } from "./scenes/Scene2Problem";
import { Scene3Features } from "./scenes/Scene3Features";
import { Scene4Social } from "./scenes/Scene4Social";
import { Scene5CTA } from "./scenes/Scene5CTA";

const { fontFamily: outfit } = loadFont("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

export const FONTS = { outfit, inter };
export const COLORS = {
  bg: "#0B0F1A",
  bgLight: "#131829",
  primary: "#3B82F6",
  accent: "#8B5CF6",
  amber: "#F59E0B",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
};

const TRANSITION_DURATION = 20;

export const MainVideo = () => {
  const frame = useCurrentFrame();
  // Persistent floating particles
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Persistent subtle gradient overlay */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 80% 60% at 20% 30%, ${COLORS.primary}15 0%, transparent 70%),
                     radial-gradient(ellipse 60% 50% at 80% 70%, ${COLORS.accent}10 0%, transparent 70%)`,
      }} />

      {/* Floating particles */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = (i * 173) % 1920;
        const baseY = (i * 97) % 1080;
        const speed = 0.3 + (i % 4) * 0.15;
        const size = 2 + (i % 3) * 2;
        const y = baseY + Math.sin((frame * speed + i * 40) * 0.03) * 40;
        const opacity = interpolate(
          Math.sin((frame + i * 30) * 0.02),
          [-1, 1],
          [0.05, 0.2]
        );
        return (
          <div key={i} style={{
            position: "absolute",
            left: x,
            top: y,
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: i % 2 === 0 ? COLORS.primary : COLORS.accent,
            opacity,
          }} />
        );
      })}

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={130}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene2Problem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />
        <TransitionSeries.Sequence durationInFrames={160}>
          <Scene3Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-bottom" })}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />
        <TransitionSeries.Sequence durationInFrames={120}>
          <Scene4Social />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_DURATION })}
        />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
