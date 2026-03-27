import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { COLORS } from "./constants";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2Problem } from "./scenes/Scene2Problem";
import { Scene3Features } from "./scenes/Scene3Features";
import { Scene4Social } from "./scenes/Scene4Social";
import { Scene5CTA } from "./scenes/Scene5CTA";

const T = 25;

export const MainVideo = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* Subtle ambient glow */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 80% 60% at 20% 30%, ${COLORS.primary}10 0%, transparent 70%),
                     radial-gradient(ellipse 60% 50% at 80% 70%, ${COLORS.accent}08 0%, transparent 70%)`,
      }} />

      {/* Floating particles */}
      {Array.from({ length: 8 }).map((_, i) => {
        const x = (i * 240) % 1920;
        const baseY = (i * 135) % 1080;
        const y = baseY + Math.sin((frame * 0.4 + i * 50) * 0.03) * 30;
        const opacity = interpolate(Math.sin((frame + i * 40) * 0.02), [-1, 1], [0.03, 0.12]);
        return (
          <div key={i} style={{
            position: "absolute", left: x, top: y, width: 3, height: 3,
            borderRadius: "50%",
            backgroundColor: i % 2 === 0 ? COLORS.primary : COLORS.accent,
            opacity,
          }} />
        );
      })}

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={140}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={140}>
          <Scene2Problem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={170}>
          <Scene3Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene4Social />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene5CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
