import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { getWeekDays, WEEK_TITLES } from "@/data/program";
import { getAllProgress } from "@/lib/storage";

export default function Program() {
  const navigate = useNavigate();
  const allProgress = getAllProgress();

  return (
    <Layout>
      <div className="animate-fade-in space-y-6 pt-6">
        <div>
          <h1 className="text-2xl font-bold">Programme 28 jours</h1>
          <p className="text-sm text-muted-foreground">4 semaines pour la neutralité et le contrôle</p>
        </div>

        {[1, 2, 3, 4].map((week) => {
          const days = getWeekDays(week);
          const completed = days.filter((d) => allProgress[d.id]?.validated).length;
          return (
            <div key={week} className="space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Semaine {week}</h2>
                  <span className="text-xs text-muted-foreground">{completed}/7</span>
                </div>
                <p className="text-xs text-muted-foreground">{WEEK_TITLES[week - 1]}</p>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(completed / 7) * 100}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                {days.map((day) => {
                  const progress = allProgress[day.id];
                  const status = progress?.validated ? "done" : progress?.status || "todo";
                  return (
                    <button
                      key={day.id}
                      onClick={() => navigate(`/day/${day.id}`)}
                      className="card-press flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left"
                      style={{ animationDelay: `${(day.id % 7) * 50}ms` }}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        status === "done" ? "bg-success text-success-foreground" :
                        status === "in_progress" ? "bg-warning text-warning-foreground" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {day.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{day.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{day.objective}</p>
                        <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                          <span>{day.duration}</span>
                          <span>•</span>
                          <span>{day.difficulty}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={status} />
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
