import { BottomNav } from "@/components/BottomNav";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-lg px-4">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
