import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  TrendingUp,
  TrendingDown,
  BarChart2,
  BarChart,
  Brain,
  ChevronRight,
  X,
  Cpu,
  ClipboardList,
  Palette,
  ChevronDown,
  Layers2,
  Settings,
  Sparkles, Target, Shuffle, Compass, Hash,
} from "lucide-react";
import { useTodayStats } from "@/hooks/use-today-stats";
import { useMarketStore, MARKET_NAMES, MarketType } from "@/lib/market-store";
import { motion, AnimatePresence } from "motion/react";

const MAIN_NAV_ITEMS = [
  {
    href: "/",
    label: "Home",
    desc: "Hasil & jadwal live",
    icon: Home,
    badge: "LIVE",
    badgeCls: "bg-emerald-500 text-white shadow-emerald-500/30",
    iconBg: "bg-emerald-500/20 text-emerald-400",
    pulse: true,
    statKey: null,
  },
  {
    href: "/paito",
    label: "Paito Warna",
    desc: "Tabel history angka interaktif",
    icon: Palette,
    badge: "New",
    badgeCls: "bg-emerald-500 text-white shadow-emerald-500/30",
    iconBg: "bg-emerald-500/20 text-emerald-400",
    statKey: null,
  },
  {
    href: "/result",
    label: "Result",
    desc: "Riwayat per bulan",
    icon: ClipboardList,
    badge: "NEW",
    badgeCls: "bg-emerald-500 text-white shadow-emerald-500/30",
    iconBg: "bg-emerald-500/20 text-emerald-400",
    statKey: null,
  },
  {
    href: "/analisa-harian",
    label: "Analisa Harian",
    desc: "Tren pergerakan angka",
    icon: BarChart2,
    badge: "📊",
    badgeCls: "bg-purple-500 text-white shadow-purple-500/30",
    iconBg: "bg-purple-500/20 text-purple-400",
    statKey: null,
  },
  {
    href: "/kalkulator-investasi",
    label: "Kalkulator Taruhan",
    desc: "Simulasi strategi kompensasi",
    icon: Target,
    badge: "Rp",
    badgeCls: "bg-emerald-500 text-white shadow-emerald-500/30",
    iconBg: "bg-emerald-500/20 text-emerald-400",
    statKey: null,
  },
  
  {
    href: "/prediksi-shio",
    label: "Prediksi Shio",
    desc: "12 Lambang Zodiak",
    icon: Compass,
    badge: "HOT",
    badgeCls: "bg-orange-500 text-white shadow-orange-500/30",
    iconBg: "bg-orange-500/20 text-orange-500",
  },
  {
    href: "/silang-homo",
    label: "Silang Homo",
    desc: "Prediksi Ganjil Genap",
    icon: Shuffle,
    badge: "NEW",
    badgeCls: "bg-indigo-500 text-white shadow-indigo-500/30",
    iconBg: "bg-indigo-500/20 text-indigo-500",
  },
  
  {
    href: "/prediksi-ai",
    label: "Smart AI",
    desc: "Ensemble 7 engine AI",
    icon: Brain,
    badge: "AI",
    badgeCls: "bg-primary text-white shadow-primary/30 text-primary-foreground",
    iconBg: "bg-primary/20 text-primary",
    statKey: null,
  },
  {
    href: "/riwayat-prediksi",
    label: "Riwayat Prediksi",
    desc: "History prediksi tersimpan",
    icon: ClipboardList,
    badge: "📋",
    badgeCls: "bg-indigo-500 text-white shadow-indigo-500/30",
    iconBg: "bg-indigo-500/20 text-indigo-400",
    statKey: null,
  },
];

const PREDIKSI_NAV_ITEMS = [
  {
    href: "/prediksi-1d",
    label: "Prediksi 1D",
    desc: "Formula 7 Line Belakang Terkuat",
    icon: Cpu,
    badge: "7L",
    badgeCls: "bg-blue-500 text-white shadow-blue-500/30",
    iconBg: "bg-blue-500/20 text-blue-400",
    statKey: null,
  },
  {
    href: "/prediksi-2d",
    label: "Prediksi 2D",
    desc: "Formula 70 Line Belakang Terkuat",
    icon: Cpu,
    badge: "70L",
    badgeCls: "bg-purple-500 text-white shadow-purple-500/30",
    iconBg: "bg-purple-500/20 text-purple-400",
    statKey: null,
  },
  {
    href: "/prediksi-2d-depan",
    label: "2D Depan",
    desc: "Formula 80 Line As & Kop AI",
    icon: Sparkles,
    badge: "80L",
    badgeCls: "bg-primary text-primary-foreground shadow-primary/30",
    iconBg: "bg-primary/20 text-primary",
    statKey: null,
  },
  {
    href: "/prediksi-2d-50line",
    label: "2D 50 Line",
    desc: "50 Line Invest & Mati Akurat",
    icon: Sparkles,
    badge: "50L",
    badgeCls: "bg-green-500 text-white shadow-green-500/30",
    iconBg: "bg-green-500/20 text-green-400",
    statKey: null,
  },
  {
    href: "/colok-bebas",
    label: "Colok Bebas",
    desc: "Prediksi 1 Digit Jitu Bom",
    icon: Target,
    badge: "JITU",
    badgeCls: "bg-red-500 text-white shadow-red-500/30",
    iconBg: "bg-red-500/20 text-red-400",
    statKey: null,
  },
  {
    href: "/prediksi-dasar",
    label: "Prediksi Dasar",
    desc: "AI Ganjil-Genap & Besar-Kecil",
    icon: Hash,
    badge: "AI",
    badgeCls: "bg-blue-500 text-white shadow-blue-500/30",
    iconBg: "bg-blue-500/20 text-blue-400",
    statKey: null,
  },
];

const STATS_NAV_ITEMS = [
  {
    href: "/ganjil",
    label: "Ganjil Depan",
    desc: "Analisis angka ganjil depan",
    icon: TrendingUp,
    badge: null,
    badgeCls: "bg-amber-500 text-white shadow-amber-500/30",
    iconBg: "bg-amber-500/20 text-amber-400",
    statKey: "ganjil" as const,
  },
  {
    href: "/ganjil-ekor",
    label: "Ganjil Ekor",
    desc: "Analisis angka ganjil ekor",
    icon: TrendingUp,
    badge: null,
    badgeCls: "bg-amber-500 text-white shadow-amber-500/30",
    iconBg: "bg-amber-500/20 text-amber-400",
    statKey: "ganjilEkor" as const,
  },
  {
    href: "/genap",
    label: "Genap Depan",
    desc: "Analisis angka genap depan",
    icon: TrendingDown,
    badge: null,
    badgeCls: "bg-sky-500 text-white shadow-sky-500/30",
    iconBg: "bg-sky-500/20 text-sky-400",
    statKey: "genap" as const,
  },
  {
    href: "/genap-ekor",
    label: "Genap Ekor",
    desc: "Analisis angka genap ekor",
    icon: TrendingDown,
    badge: null,
    badgeCls: "bg-sky-500 text-white shadow-sky-500/30",
    iconBg: "bg-sky-500/20 text-sky-400",
    statKey: "genapEkor" as const,
  },
  {
    href: "/besar",
    label: "Besar Depan",
    desc: "Analisis angka besar depan",
    icon: BarChart2,
    badge: null,
    badgeCls: "bg-red-500 text-white shadow-red-500/30",
    iconBg: "bg-red-500/20 text-red-400",
    statKey: "besar" as const,
  },
  {
    href: "/besar-ekor",
    label: "Besar Ekor",
    desc: "Analisis angka besar ekor",
    icon: BarChart2,
    badge: null,
    badgeCls: "bg-orange-500 text-white shadow-orange-500/30",
    iconBg: "bg-orange-500/20 text-orange-400",
    statKey: "besarEkor" as const,
  },
  {
    href: "/kecil",
    label: "Kecil Depan",
    desc: "Analisis angka kecil depan",
    icon: BarChart,
    badge: null,
    badgeCls: "bg-green-500 text-white shadow-green-500/30",
    iconBg: "bg-green-500/20 text-green-400",
    statKey: "kecil" as const,
  },
  {
    href: "/kecil-ekor",
    label: "Kecil Ekor",
    desc: "Analisis angka kecil ekor",
    icon: BarChart,
    badge: null,
    badgeCls: "bg-emerald-500 text-white shadow-emerald-500/30",
    iconBg: "bg-emerald-500/20 text-emerald-400",
    statKey: "kecilEkor" as const,
  },
];

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as any as any,
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: {
      type: "spring" as any as any,
      stiffness: 400,
      damping: 40,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as any as any, stiffness: 300, damping: 24 },
  },
};

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const [location] = useLocation();
  const todayStats = useTodayStats();
  const [statsOpen, setStatsOpen] = useState(false);
  const [prediksiOpen, setPrediksiOpen] = useState(false);
  const activeMarket = useMarketStore((s) => s.activeMarket);
  const setMarket = useMarketStore((s) => s.setMarket);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      const isStatsActive = STATS_NAV_ITEMS.some(
        (item) => location === item.href,
      );
      if (isStatsActive) setStatsOpen(true);
      const isPrediksiActive = PREDIKSI_NAV_ITEMS.some(
        (item) => location === item.href,
      );
      if (isPrediksiActive) setPrediksiOpen(true);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, location]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end lg:hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2" onClick={onClose}>
              <div className="h-1.5 w-12 rounded-full bg-black/20 dark:bg-white/20" />
            </div>

            <div className="rounded-t-[2rem] bg-background/95 backdrop-blur-sm border-t border-black/10 dark:border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-black/5 dark:border-white/5 shrink-0 bg-black/5 dark:bg-white/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 shrink-0 shadow-[0_0_20px_rgba(var(--primary),0.1)] dark:shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                  <span className="text-2xl leading-none">🎰</span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-base font-display font-black text-foreground leading-tight uppercase tracking-wide">
                    {MARKET_NAMES[activeMarket]}
                  </span>
                  <span className="text-xs font-bold tracking-widest text-primary uppercase mt-1">
                    Live Results
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground transition-all shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Market Selector Tabs */}
              <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 shrink-0 overflow-x-auto scrollbar-none">
                <div className="flex gap-2 min-w-max">
                  {(Object.keys(MARKET_NAMES) as MarketType[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMarket(m)}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap",
                        activeMarket === m
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "bg-black/5 dark:bg-white/5 text-muted-foreground border border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground",
                      )}
                    >
                      {MARKET_NAMES[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Items */}
              <div className="px-4 py-5 space-y-2 overflow-y-auto scrollbar-none pb-12">
                {/* First part of Main Nav */}
                <motion.div variants={itemVariants}>
                  <NavItem
                    item={MAIN_NAV_ITEMS[0]}
                    location={location}
                    onClose={onClose}
                    stats={todayStats}
                  />
                </motion.div>
                <motion.div variants={itemVariants}>
                  <NavItem
                    item={MAIN_NAV_ITEMS[1]}
                    location={location}
                    onClose={onClose}
                    stats={todayStats}
                  />
                </motion.div>

                {/* Prediksi Accordion */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-[1.25rem] glass-card overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setPrediksiOpen(!prediksiOpen)}
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 text-foreground font-bold text-[15px]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20 text-primary shrink-0 border border-primary/20">
                        <Cpu className="h-5 w-5" />
                      </div>
                      Formula Prediksi
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-300",
                        prediksiOpen ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {prediksiOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="p-2 space-y-1 bg-black/5 dark:bg-black/20 border-t border-black/5 dark:border-white/5">
                          {PREDIKSI_NAV_ITEMS.map((item) => (
                            <NavItem
                              key={item.href}
                              item={item}
                              location={location}
                              onClose={onClose}
                              stats={todayStats}
                              isSubItem
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Stats Accordion */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-[1.25rem] glass-card overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setStatsOpen(!statsOpen)}
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 text-foreground font-bold text-[15px]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 shrink-0 border border-orange-500/20">
                        <BarChart2 className="h-5 w-5" />
                      </div>
                      Statistik 2D Belakang
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 text-muted-foreground transition-transform duration-300",
                        statsOpen ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {statsOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="p-2 space-y-1 bg-black/5 dark:bg-black/20 border-t border-black/5 dark:border-white/5">
                          {STATS_NAV_ITEMS.map((item) => (
                            <NavItem
                              key={item.href}
                              item={item}
                              location={location}
                              onClose={onClose}
                              stats={todayStats}
                              isSubItem
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Rest of Main Nav */}
                {MAIN_NAV_ITEMS.slice(2).map((item) => (
                  <motion.div variants={itemVariants} key={item.href}>
                    <NavItem
                      item={item}
                      location={location}
                      onClose={onClose}
                      stats={todayStats}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Safe area spacer */}
              <div className="h-[env(safe-area-inset-bottom,0px)]" />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const NavItem: React.FC<{
  item: any;
  location: string;
  onClose: () => void;
  stats: any;
  isSubItem?: boolean;
}> = ({
  item,
  location,
  onClose,
  stats,
  isSubItem = false,
}) => {
  const Icon = item.icon;
  const isActive = location === item.href;

  return (
    <Link href={item.href} onClick={onClose} asChild>
<a
        className={cn(
          "w-full flex items-center gap-4 transition-all duration-200 text-left rounded-[1.25rem]",
          isSubItem ? "px-3 py-3" : "px-4 py-4",
          isActive
            ? "bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 shadow-inner"
            : "hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 border border-transparent bg-black/[0.02] dark:bg-white/[0.02]",
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "flex items-center justify-center rounded-xl shrink-0 border",
            isSubItem ? "h-9 w-9" : "h-11 w-11",
            isActive
              ? "bg-primary/10 dark:bg-primary/20 text-primary border-primary/20 dark:border-primary/30 shadow-[0_0_20px_rgba(var(--primary),0.1)] dark:shadow-[0_0_20px_rgba(var(--primary),0.2)]"
              : cn(item.iconBg, "border-black/5 dark:border-white/10"),
          )}
        >
          <Icon className={cn(isSubItem ? "h-4 w-4" : "h-5 w-5")} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "font-bold leading-tight",
                isSubItem ? "text-[14px]" : "text-[15px]",
                isActive ? "text-primary" : "text-foreground",
              )}
            >
              {item.label}
            </span>
            {item.badgeCls && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black leading-none shadow-sm",
                  item.badgeCls,
                  item.pulse && "animate-pulse",
                )}
              >
                {item.statKey && stats
                  ? `${stats[item.statKey]} kena`
                  : item.badge}
              </span>
            )}
          </div>
          {item.desc && !isSubItem && (
            <span className="text-xs text-muted-foreground/80 leading-tight mt-1 block truncate font-medium">
              {item.desc}
            </span>
          )}
        </div>

        {/* Chevron */}
        <ChevronRight
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            isActive ? "text-primary" : "text-muted-foreground",
          )}
        />
      </a>
</Link>
  );
}
