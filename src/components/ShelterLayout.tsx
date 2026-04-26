import { ShelterNav } from "@/components/ShelterNav";
import { SlideMenu } from "@/components/SlideMenu";
import { FloatingReadAloud } from "@/components/FloatingReadAloud";
import { AdminRoleSwitcher } from "@/components/AdminRoleSwitcher";

export function ShelterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24 theme-shelter">
      <SlideMenu />
      <FloatingReadAloud />
      <div className="fixed top-3 right-3 z-40">
        <AdminRoleSwitcher />
      </div>
      <div className="mx-auto max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl px-4 pt-16">
        {children}
      </div>
      <ShelterNav />
    </div>
  );
}
