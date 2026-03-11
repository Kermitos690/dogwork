import { CoachNav } from "@/components/CoachNav";

export function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-lg px-4">
        {children}
      </div>
      <CoachNav />
    </div>
  );
}
