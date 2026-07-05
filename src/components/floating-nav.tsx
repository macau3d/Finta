import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Home, TrendingUp, Sparkles, ClipboardList, Menu, BrainCircuit } from "lucide-react";
import { useTodayStats } from "@/hooks/use-today-stats";
import { PredictionDrawer } from "./prediction-drawer";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/",            label: "Home",     icon: Home,           badge: "LIVE", badgeCls: "bg-emerald-500 text-white shadow-md shadow-emerald-500/50", pulse: true,  statKey: null },
  { href: "/result",      label: "Result",   icon: ClipboardList,  badge: "NEW",  badgeCls: "bg-blue-500 text-white shadow-md shadow-blue-500/50",    pulse: false, statKey: null },
];

export function FloatingNav() {
  const [location] = useLocation();
  const todayStats = useTodayStats();
  const [isPredictionDrawerOpen, setPredictionDrawerOpen] = useState(false);

  useEffect(() => {
    const handleOpenPrediksi = () => setPredictionDrawerOpen(true);
    document.addEventListener("open-prediction-drawer", handleOpenPrediksi);
    return () => {
      document.removeEventListener("open-prediction-drawer", handleOpenPrediksi);
    };
  }, []);

  const handleOpenMenu = () => {
    document.dispatchEvent(new CustomEvent("open-mobile-menu"));
  };
  
  const handleOpenPrediksi = () => {
    setPredictionDrawerOpen(true);
  };

  const isPrediksiActive = location.startsWith("/prediksi");

  return (
    <>
      <nav className="fixed bottom-3 left-3 right-3 z-50 md:hidden">
        <div className="rounded-3xl glass-nav p-1.5 pb-2">
          <div className="grid grid-cols-5 gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} asChild>
<a
                    className={cn(
                      "relative flex w-full flex-col items-center justify-center gap-1.5 px-1 py-3.5 sm:py-4 transition-all duration-300 rounded-[1.25rem]",
                      isActive 
                        ? "bg-primary/10 dark:bg-primary/15 text-primary shadow-inner border border-primary/20" 
                        : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <span className="relative">
                      <Icon
                        className={cn(
                          "h-[22px] w-[22px] sm:h-6 sm:w-6 transition-all duration-300",
                          isActive 
                            ? "text-primary scale-110 drop-shadow-[0_0_10px_rgba(var(--primary),0.8)]" 
                            : "text-muted-foreground/80"
                        )}
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                      {(item.statKey || item.badge) && (
                        <span
                          className={cn(
                            "absolute -right-3 -top-2.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-[5px] py-[3px] text-[9px] font-black leading-none",
                            item.badgeCls,
                            item.pulse && "animate-pulse"
                          )}
                        >
                          {item.statKey && todayStats
                            ? todayStats[item.statKey]
                            : item.badge}
                        </span>
                      )}
                    </span>
                    
                    <span className={cn(
                      "text-[10px] font-bold leading-none tracking-wide transition-colors whitespace-nowrap mt-0.5",
                      isActive ? "text-primary drop-shadow-[0_0_5px_rgba(var(--primary),0.5)]" : "text-muted-foreground/70"
                    )}>
                      {item.label}
                    </span>
                  </a>
</Link>
              );
            })}
            
            {/* Prediksi Button */}
            <button
              onClick={handleOpenPrediksi}
              className={cn(
                "relative flex w-full flex-col items-center justify-center gap-1.5 px-1 py-3.5 sm:py-4 transition-all duration-300 rounded-[1.25rem]",
                isPrediksiActive 
                  ? "bg-primary/10 dark:bg-primary/15 text-primary shadow-inner border border-primary/20" 
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
              )}
            >
              <span className="relative">
                <BrainCircuit
                  className={cn(
                    "h-[22px] w-[22px] sm:h-6 sm:w-6 transition-all duration-300",
                    isPrediksiActive 
                      ? "text-primary scale-110 drop-shadow-[0_0_10px_rgba(var(--primary),0.8)]" 
                      : "text-muted-foreground/80"
                  )}
                  strokeWidth={isPrediksiActive ? 2.5 : 2}
                />
                <span className="absolute -right-3 -top-2.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-[5px] py-[3px] text-[9px] font-black leading-none bg-purple-500 text-white shadow-md shadow-purple-500/50 animate-pulse">
                  AI
                </span>
              </span>
              <span className={cn(
                "text-[10px] font-bold leading-none tracking-wide transition-colors whitespace-nowrap mt-0.5",
                isPrediksiActive ? "text-primary drop-shadow-[0_0_5px_rgba(var(--primary),0.5)]" : "text-muted-foreground/70"
              )}>
                Prediksi
              </span>
            </button>

            {/* Stats Button */}
            <Link href="/analisa-harian" asChild>
<a
                className={cn(
                  "relative flex w-full flex-col items-center justify-center gap-1.5 px-1 py-3.5 sm:py-4 transition-all duration-300 rounded-[1.25rem]",
                  location === "/analisa-harian" 
                    ? "bg-primary/10 dark:bg-primary/15 text-primary shadow-inner border border-primary/20" 
                    : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
                )}
              >
                <span className="relative">
                  <TrendingUp
                    className={cn(
                      "h-[22px] w-[22px] sm:h-6 sm:w-6 transition-all duration-300",
                      location === "/analisa-harian" 
                        ? "text-primary scale-110 drop-shadow-[0_0_10px_rgba(var(--primary),0.8)]" 
                        : "text-muted-foreground/80"
                    )}
                    strokeWidth={location === "/analisa-harian" ? 2.5 : 2}
                  />
                </span>
                <span className={cn(
                  "text-[10px] font-bold leading-none tracking-wide transition-colors whitespace-nowrap mt-0.5",
                  location === "/analisa-harian" ? "text-primary drop-shadow-[0_0_5px_rgba(var(--primary),0.5)]" : "text-muted-foreground/70"
                )}>
                  Stats
                </span>
              </a>
</Link>

            {/* Lainnya Button */}
            <button
              onClick={handleOpenMenu}
              className="relative flex w-full flex-col items-center justify-center gap-1.5 px-1 py-3.5 sm:py-4 transition-all duration-300 rounded-[1.25rem] text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent"
            >
              <span className="relative">
                <Menu className="h-[22px] w-[22px] sm:h-6 sm:w-6 transition-all duration-300 text-muted-foreground/80" strokeWidth={2} />
              </span>
              <span className="text-[10px] font-bold leading-none tracking-wide transition-colors whitespace-nowrap text-muted-foreground/70 mt-0.5">
                Lainnya
              </span>
            </button>
          </div>
        </div>
      </nav>

      <PredictionDrawer 
        open={isPredictionDrawerOpen} 
        onClose={() => setPredictionDrawerOpen(false)} 
      />
    </>
  );
}
