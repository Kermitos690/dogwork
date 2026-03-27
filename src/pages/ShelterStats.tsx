import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShelterLayout } from "@/components/ShelterLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { BarChart3, Heart, Clock, PawPrint, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

interface ShelterAnimalStats {
  status: string;
  species: string;
  arrival_date: string | null;
  departure_date: string | null;
}

export default function ShelterStats() {
  const { user } = useAuth();

  const { data: animals = [] } = useQuery({
    queryKey: ["shelter-animals-stats", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("shelter_animals")
        .select("status, species, arrival_date, departure_date")
        .eq("user_id", user!.id);
      return (data ?? []) as ShelterAnimalStats[];
    },
    enabled: !!user,
  });

  // Active animals
  const active = animals.filter((a) => !["adopté", "décédé", "transféré"].includes(a.status));
  const adopted = animals.filter((a) => a.status === "adopté");

  // Adoptions par mois (12 derniers mois)
  const adoptionsByMonth = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = 0;
    }
    adopted.forEach((a) => {
      if (a.departure_date) {
        const key = a.departure_date.substring(0, 7);
        if (months[key] !== undefined) months[key]++;
      }
    });
    return Object.entries(months).map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short" }),
      adoptions: count,
    }));
  })();

  // Durée moyenne de séjour (animaux partis)
  const stayDurations = animals
    .filter((a) => a.departure_date && a.arrival_date)
    .map((a) => {
      const arr = new Date(a.arrival_date!).getTime();
      const dep = new Date(a.departure_date!).getTime();
      return Math.max(1, Math.round((dep - arr) / (1000 * 60 * 60 * 24)));
    });
  const avgStay = stayDurations.length > 0 ? Math.round(stayDurations.reduce((a, b) => a + b, 0) / stayDurations.length) : 0;

  // Répartition par espèce
  const speciesData = (() => {
    const counts: Record<string, number> = {};
    active.forEach((a) => { counts[a.species] = (counts[a.species] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // Répartition par statut
  const statusData = (() => {
    const counts: Record<string, number> = {};
    active.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  // Arrivées par mois
  const arrivalsByMonth = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = 0;
    }
    animals.forEach((a) => {
      if (a.arrival_date) {
        const key = a.arrival_date.substring(0, 7);
        if (months[key] !== undefined) months[key]++;
      }
    });
    return Object.entries(months).map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("fr-FR", { month: "short" }),
      arrivées: count,
    }));
  })();

  return (
    <ShelterLayout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-8 space-y-4">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Statistiques
        </h1>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: PawPrint, label: "Hébergés", value: active.length, color: "text-primary" },
            { icon: Heart, label: "Adoptés", value: adopted.length, color: "text-emerald-400" },
            { icon: Clock, label: "Séjour moyen", value: `${avgStay}j`, color: "text-amber-400" },
            { icon: TrendingUp, label: "Total enregistrés", value: animals.length, color: "text-blue-400" },
          ].map((kpi, i) => (
            <Card key={i}>
              <CardContent className="p-3 text-center">
                <kpi.icon className={`h-5 w-5 mx-auto mb-1 ${kpi.color}`} />
                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                <p className="text-[9px] text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Adoptions par mois */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Adoptions par mois</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={adoptionsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="adoptions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Arrivées par mois */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Arrivées par mois</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={arrivalsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="arrivées" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par espèce */}
        {speciesData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Par espèce</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={speciesData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {speciesData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Répartition par statut */}
        {statusData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statusData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-foreground flex-1">{s.name}</span>
                    <span className="text-xs font-bold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </ShelterLayout>
  );
}
