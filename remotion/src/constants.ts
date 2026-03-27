import { loadFont } from "@remotion/google-fonts/Outfit";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: outfit } = loadFont("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

export const FONTS = { outfit, inter };
export const COLORS = {
  bg: "#0A0E1A",
  bgLight: "#121830",
  primary: "#3B82F6",
  accent: "#8B5CF6",
  amber: "#F59E0B",
  emerald: "#10B981",
  rose: "#F43F5E",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
};
