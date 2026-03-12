import { CoachNav } from "@/components/CoachNav";
import { SlideMenu } from "@/components/SlideMenu";
import { FloatingReadAloud } from "@/components/FloatingReadAloud";

export function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 theme-coach">
      <SlideMenu />
      <FloatingReadAloud />
      <div className="mx-auto max-w-lg px-4">
        {children}
      </div>
      <CoachNav />
    </div>
  );
}
