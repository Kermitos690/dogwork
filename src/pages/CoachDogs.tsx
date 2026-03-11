import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CoachLayout } from "@/components/CoachLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Dog, ChevronRight, AlertTriangle, Activity, Shield, Filter } from "lucide-react";
import { motion } from "framer-motion";
import { useCoachDogs } from "@/hooks/useCoach";

type FilterType = "all" | "sensitive" | "high-tension" | "active-plan";

export default function CoachDogs() {
  const navigate = useNavigate();
  const { data: dogs = [] } = useCoachDogs();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = dogs
    .filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.clientName.toLowerCase().includes(search.toLowerCase()))
    .filter((d) => {
      if (filter === "sensitive") return d.isSensitive;
      if (filter === "high-tension") return d.avgTension && d.avgTension > 3;
      if (filter === "active-plan") return !!d.activePlan;
      return true;
    });

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: dogs.length },
    { key: "sensitive", label: "Sensibles", count: dogs.filter((d) => d.isSensitive).length },
    { key: "high-tension", label: "Tension ↑", count: dogs.filter((d) => d.avgTension && d.avgTension > 3).length },
    { key: "active-plan", label: "Plan actif", count: dogs.filter((d) => d.activePlan).length },
  ];

  return (
    <CoachLayout>
      <div className="space-y-4 pb-24">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coach")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Chiens suivis</h1>
            <p className="text-xs text-muted-foreground">{dogs.length} chien{dogs.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher chien ou client..." className="pl-10 bg-card/50 border-border/50" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filters.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              className="shrink-0 text-xs h-8 gap-1"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <Badge variant="secondary" className="text-[10px] ml-1 px-1.5 py-0">{f.count}</Badge>
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map((dog, i) => (
            <motion.div key={dog.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="bg-card/70 border-border/40 cursor-pointer hover:bg-card/90 transition-all"
                onClick={() => navigate(`/coach/dog/${dog.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${dog.isSensitive ? "bg-destructive/20" : "bg-emerald-500/20"}`}>
                        {dog.isSensitive ? <Shield className="h-5 w-5 text-destructive" /> : <Dog className="h-5 w-5 text-emerald-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{dog.name}</span>
                          {dog.bite_history && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Morsure</Badge>}
                          {dog.muzzle_required && <Badge className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0 border-0">Muselière</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{dog.clientName}</span>
                          {dog.breed && <><span className="text-xs text-muted-foreground">·</span><span className="text-xs text-muted-foreground">{dog.breed}</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dog.avgTension !== null && (
                        <div className="flex items-center gap-1">
                          <Activity className={`h-3 w-3 ${dog.avgTension > 3 ? "text-amber-400" : "text-emerald-400"}`} />
                          <span className={`text-xs ${dog.avgTension > 3 ? "text-amber-400" : "text-emerald-400"}`}>
                            {dog.avgTension.toFixed(1)}
                          </span>
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  {dog.activePlan && (
                    <div className="mt-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                      <span className="text-xs text-primary">{dog.activePlan.title || "Plan actif"}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <Card className="bg-card/50 border-border/40">
              <CardContent className="p-8 text-center">
                <Dog className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Aucun chien trouvé</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
