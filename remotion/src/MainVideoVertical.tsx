import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { COLORS } from "./constants";
import { Scene1HookVertical } from "./scenes/Scene1HookVertical";
import { Scene2ProblemVertical } from "./scenes/Scene2ProblemVertical";
import { Scene3FeaturesVertical } from "./scenes/Scene3FeaturesVertical";
import { Scene4SocialVertical } from "./scenes/Scene4SocialVertical";
import { Scene5CTAVertical } from "./scenes/Scene5CTAVertical";

const T = 25;

export const MainVideoVertical = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${COLORS.primary}10 0%, transparent 70%)`,
      }} />

      {Array.from({ length: 6 }).map((_, i) => {
        const x = (i * 180) % 1080;
        const baseY = (i * 320) % 1920;
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
          <Scene1HookVertical />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={140}>
          <Scene2ProblemVertical />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={170}>
          <Scene3FeaturesVertical />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene4SocialVertical />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: T })} />
        <TransitionSeries.Sequence durationInFrames={150}>
          <Scene5CTAVertical />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
