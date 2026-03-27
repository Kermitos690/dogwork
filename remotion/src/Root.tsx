import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 5 scenes: 140+140+170+150+150 = 750 frames, minus 4 transitions * 25 = 100 overlap = 650
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={650}
    fps={30}
    width={1920}
    height={1080}
  />
);
