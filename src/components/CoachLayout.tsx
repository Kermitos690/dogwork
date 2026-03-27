import { CoachNav } from "@/components/CoachNav";
import { SlideMenu } from "@/components/SlideMenu";
import { FloatingReadAloud } from "@/components/FloatingReadAloud";

export function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 theme-coach">
      <SlideMenu />
      <FloatingReadAloud />
      <div className="mx-auto max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 pt-16">
        {children}
      </div>
      <CoachNav />
    </div>
  );
}
