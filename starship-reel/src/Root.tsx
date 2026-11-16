import { Composition } from "remotion";
import { FPS, Reel, TOTAL_FRAMES } from "./Reel";

export const RemotionRoot: React.FC = () => {
  return <Composition id="StarshipReel" component={Reel} durationInFrames={TOTAL_FRAMES} fps={FPS} width={1080} height={1920} />;
};
