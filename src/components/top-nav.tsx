import { useState, useEffect, useRef, startTransition } from "react";
import { Link, useLocation } from "wouter";
import { Menu, ChevronDown, Sun, Moon, Palette, Check, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileMenu } from "./mobile-menu";
import { useTodayStats } from "@/hooks/use-today-stats";
import { useMarketStore, MARKET_NAMES, MarketType } from "@/lib/market-store";
import { useThemeStore, THEMES } from "@/hooks/use-theme";
import { useGetSyncStatus } from "@/lib/api-client";
import { useIsFetching } from "@tanstack/react-query";

const MAIN_NAV_ITEMS = [
  { href: "/", label: "Home", badge: "LIVE", badgeCls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", pulse: true, statKey: null },
  { href: "/paito", label: "Paito", badge: "New", badgeCls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", statKey: null },
  { href: "/analisa-harian", label: "Analisa", badge: "📊", badgeCls: "bg-purple-500/20 text-purple-400 border border-purple-500/30", statKey: null },
  { href: "/prediksi-ai", label: "Prediksi AI", badge: "AI", badgeCls: "bg-blue-500/20 text-blue-400 border border-blue-500/30", statKey: null },
  { href: "/kalkulator-investasi", label: "Kalkulator", badge: "Rp", badgeCls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", statKey: null },
  { href: "/riwayat-prediksi", label: "Riwayat", badge: "📋", badgeCls: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30", statKey: null },
  { href: "/result", label: "Result", badge: "NEW", badgeCls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", statKey: null },
];

const PREDIKSI_NAV_ITEMS = [
  { href: "/prediksi-1d", label: "Prediksi 1D", badge: "7L", badgeCls: "bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30", statKey: null },
  { href: "/prediksi-2d", label: "Prediksi 2D", badge: "70L", badgeCls: "bg-rose-500/20 text-rose-400 border border-rose-500/30", statKey: null },
  { href: "/prediksi-2d-depan", label: "2D Depan", badge: "80L", badgeCls: "bg-primary/20 text-primary border border-primary/30", statKey: null },
  { href: "/prediksi-2d-50line", label: "2D 50 Line", badge: "50L", badgeCls: "bg-green-500/20 text-green-400 border border-green-500/30", statKey: null },
  { href: "/colok-bebas", label: "Colok Bebas", badge: "JITU", badgeCls: "bg-red-500/20 text-red-400 border border-red-500/30", statKey: null },
  { href: "/prediksi-dasar", label: "Prediksi Dasar", badge: "AI", badgeCls: "bg-blue-500/20 text-blue-400 border border-blue-500/30", statKey: null },
  { href: "/prediksi-shio", label: "Prediksi Shio", badge: "SHIO", badgeCls: "bg-amber-500/20 text-amber-400 border border-amber-500/30", statKey: null },
  { href: "/silang-homo", label: "Silang Homo", badge: "NEW", badgeCls: "bg-purple-500/20 text-purple-400 border border-purple-500/30", statKey: null },
];

const STATS_NAV_ITEMS = [
  { href: "/ganjil", label: "Ganjil Depan", badge: null, badgeCls: "bg-amber-500/20 text-amber-400 border border-amber-500/30", statKey: "ganjil" as const },
  { href: "/ganjil-ekor", label: "Ganjil Ekor", badge: null, badgeCls: "bg-amber-500/20 text-amber-400 border border-amber-500/30", statKey: "ganjilEkor" as const },
  { href: "/genap", label: "Genap Depan", badge: null, badgeCls: "bg-sky-500/20 text-sky-400 border border-sky-500/30", statKey: "genap" as const },
  { href: "/genap-ekor", label: "Genap Ekor", badge: null, badgeCls: "bg-sky-500/20 text-sky-400 border border-sky-500/30", statKey: "genapEkor" as const },
  { href: "/besar", label: "Besar Depan", badge: null, badgeCls: "bg-red-500/20 text-red-400 border border-red-500/30", statKey: "besar" as const },
  { href: "/besar-ekor", label: "Besar Ekor", badge: null, badgeCls: "bg-orange-500/20 text-orange-400 border border-orange-500/30", statKey: "besarEkor" as const },
  { href: "/kecil", label: "Kecil Depan", badge: null, badgeCls: "bg-green-500/20 text-green-400 border border-green-500/30", statKey: "kecil" as const },
  { href: "/kecil-ekor", label: "Kecil Ekor", badge: null, badgeCls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", statKey: "kecilEkor" as const },
];

export function TopNav() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const todayStats = useTodayStats();
  const activeMarket = useMarketStore(s => s.activeMarket);
  const setMarket = useMarketStore(s => s.setMarket);
  const { theme, toggleTheme } = useThemeStore();
  const { data: syncStatus } = useGetSyncStatus();
  const isFetching = useIsFetching();

  useEffect(() => {
    const handleOpen = () => setMenuOpen(true);
    document.addEventListener("open-mobile-menu", handleOpen);
    return () => document.removeEventListener("open-mobile-menu", handleOpen);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isStatsActive = STATS_NAV_ITEMS.some(item => location === item.href);

  return (
    <>
      <div ref={navRef} className="sticky top-4 z-40 mx-4 md:mx-auto max-w-6xl">
        <header className="rounded-[2rem] glass-nav transition-all duration-300">
          <div className="flex items-center justify-between px-5 py-3">
            {/* Logo & Market Selector */}
            <div className="flex items-center gap-3 shrink-0 relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                <span className="text-xl leading-none">🎰</span>
              </div>
              <div 
                className="flex flex-col leading-none cursor-pointer py-2 pr-2"
                onClick={() => setActiveDropdown(activeDropdown === 'market' ? null : 'market')}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-display font-bold text-foreground tracking-wide uppercase">{MARKET_NAMES[activeMarket]}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-[10px] text-primary font-bold tracking-[0.2em] mt-1">NEON AI</span>
              </div>
              
              {/* Market Dropdown */}
              <div className={cn("absolute top-full left-0 pt-3 z-50", activeDropdown === 'market' ? "block" : "hidden")}>
                <div className="w-56 rounded-2xl glass-card p-2 shadow-2xl">
                  <div className="grid grid-cols-1 gap-1">
                    {(Object.keys(MARKET_NAMES) as MarketType[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          startTransition(() => setMarket(m));
                          setActiveDropdown(null);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 text-left",
                          activeMarket === m
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        {MARKET_NAMES[m]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-2 lg:flex relative">
              {/* Home */}
              <Link href={MAIN_NAV_ITEMS[0].href} asChild>
<a
                  className={cn(
                    "group relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300",
                    location === MAIN_NAV_ITEMS[0].href
                      ? "bg-black/5 dark:bg-white/10 text-foreground border border-black/10 dark:border-white/10 shadow-sm"
                      : "text-muted-foreground hover:bg-black/5 dark:hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  {MAIN_NAV_ITEMS[0].label}
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black leading-none tracking-widest bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="relative mr-1.5 flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    LIVE
                  </span>
                </a>
</Link>

              {/* Stats Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'stats' ? null : 'stats')}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300",
                    isStatsActive
                      ? "bg-black/5 dark:bg-white/10 text-foreground border border-black/10 dark:border-white/10 shadow-sm"
                      : "text-muted-foreground hover:bg-black/5 dark:hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  Statistik 2D
                  <ChevronDown className={cn("h-4 w-4 transition-transform", activeDropdown === 'stats' && "rotate-180")} />
                </button>
                <div className={cn("absolute top-full left-0 pt-3 z-50", activeDropdown === 'stats' ? "block" : "hidden")}>
                  <div className="w-56 rounded-2xl glass-card p-2 shadow-2xl">
                    <div className="grid grid-cols-1 gap-1">
                      {STATS_NAV_ITEMS.map((item) => {
                        const isActive = location === item.href;
                        return (
                          <Link key={item.href} href={item.href} asChild>
<a
                              onClick={() => setActiveDropdown(null)}
                              className={cn(
                                "w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 text-left",
                                isActive
                                  ? "bg-black/5 dark:bg-white/10 text-foreground"
                                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                              )}
                            >
                              {item.label}
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-1 text-[9px] font-black leading-none tracking-widest",
                                  item.badgeCls
                                )}
                              >
                                {item.statKey && todayStats
                                  ? todayStats[item.statKey]
                                  : item.badge}
                              </span>
                            </a>
</Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prediksi Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'prediksi' ? null : 'prediksi')}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300",
                    PREDIKSI_NAV_ITEMS.some(item => location === item.href)
                      ? "bg-black/5 dark:bg-white/10 text-foreground border border-black/10 dark:border-white/10 shadow-sm"
                      : "text-muted-foreground hover:bg-black/5 dark:hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  Formula Prediksi
                  <ChevronDown className={cn("h-4 w-4 transition-transform", activeDropdown === 'prediksi' && "rotate-180")} />
                </button>
                <div className={cn("absolute top-full left-0 pt-3 z-50", activeDropdown === 'prediksi' ? "block" : "hidden")}>
                  <div className="w-56 rounded-2xl glass-card p-2 shadow-2xl">
                    <div className="grid grid-cols-1 gap-1">
                      {PREDIKSI_NAV_ITEMS.map((item) => {
                        const isActive = location === item.href;
                        return (
                          <Link key={item.href} href={item.href} asChild>
<a
                              onClick={() => setActiveDropdown(null)}
                              className={cn(
                                "w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 text-left",
                                isActive
                                  ? "bg-black/5 dark:bg-white/10 text-foreground"
                                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                              )}
                            >
                              {item.label}
                              {item.badge && (
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-1 text-[9px] font-black leading-none tracking-widest",
                                    item.badgeCls
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </a>
</Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Items */}
              {MAIN_NAV_ITEMS.slice(1).map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} asChild>
<a
                      className={cn(
                        "group relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300",
                        isActive
                          ? "bg-black/5 dark:bg-white/10 text-foreground border border-black/10 dark:border-white/10 shadow-sm"
                          : "text-muted-foreground hover:bg-black/5 dark:hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                      )}
                    >
                      {item.label}
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black leading-none tracking-widest",
                          item.badgeCls
                        )}
                      >
                        {item.badge}
                      </span>
                    </a>
</Link>
                );
              })}
            </nav>

            {/* Data Sync Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 mr-2">
              {isFetching > 0 ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
                  <span className="text-xs font-bold text-muted-foreground hidden lg:inline-block">Syncing...</span>
                </>
              ) : syncStatus?.lastSyncStatus === "SUCCESS" ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[10px] font-bold text-muted-foreground hidden lg:inline-block">Synced</span>
                </>
              ) : syncStatus?.lastSyncStatus === "FAILED" ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-[10px] font-bold text-red-500 hidden lg:inline-block">Sync Failed</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-muted-foreground hidden lg:inline-block">Waiting</span>
                </>
              )}
            </div>

            {/* Theme Toggle & Mobile Menu */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setActiveDropdown(activeDropdown === 'theme' ? null : 'theme')}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-foreground transition-all hover:bg-black/10 dark:hover:bg-white/10 hover:scale-105 active:scale-95"
                  aria-label="Customize theme"
                >
                  <Palette className="h-5 w-5" />
                </button>
                <div className={cn("absolute top-full right-0 pt-3 z-50", activeDropdown === 'theme' ? "block" : "hidden")}>
                  <div className="w-64 rounded-2xl glass-card p-3 shadow-2xl">
                    <div className="mb-2 px-2">
                      <h4 className="text-sm font-bold text-foreground">Tema Visual</h4>
                      <p className="text-[10px] text-muted-foreground font-medium">Palette untuk analisis data jangka panjang.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            useThemeStore.getState().setTheme(t.id);
                            setActiveDropdown(null);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300 text-left",
                            theme === t.id
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-4 w-4 rounded-full border border-black/10 dark:border-white/20 shadow-sm flex-shrink-0" style={{ backgroundColor: t.color }}></div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold leading-tight">{t.label}</span>
                              <span className="text-[9px] opacity-70 leading-tight mt-0.5">{t.description}</span>
                            </div>
                          </div>
                          {theme === t.id && <Check className="h-3 w-3 ml-2 flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile/Tablet hamburger */}
              <button
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-foreground transition-all hover:bg-black/10 dark:hover:bg-white/10 hover:scale-105 active:scale-95 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
