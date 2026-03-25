import { ShelterNav } from "@/components/ShelterNav";
import { FloatingReadAloud } from "@/components/FloatingReadAloud";

export function ShelterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 theme-shelter">
      <FloatingReadAloud />
      <div className="mx-auto max-w-lg px-4">
        {children}
      </div>
      <ShelterNav />
    </div>
  );
}
