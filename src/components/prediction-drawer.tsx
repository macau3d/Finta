import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { X, Sparkles, Target, Shuffle, Compass, Hash, Dices, Cpu, Layers2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PredictionDrawerProps {
  open: boolean;
  onClose: () => void;
}

const PREDIKSI_NAV_ITEMS = [
  
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
    icon: Sparkles,
    badge: "PRO",
    badgeCls: "bg-primary text-primary-foreground shadow-primary/30",
    iconBg: "bg-primary/20 text-primary",
  },
  {
    href: "/prediksi-1d",
    label: "Prediksi 1D",
    desc: "Formula 7 Line Belakang",
    icon: Dices,
    badge: "7L",
    badgeCls: "bg-blue-500 text-white shadow-blue-500/30",
    iconBg: "bg-blue-500/20 text-blue-400",
  },
  {
    href: "/prediksi-2d",
    label: "Prediksi 2D",
    desc: "Formula 70 Line Belakang",
    icon: Cpu,
    badge: "70L",
    badgeCls: "bg-purple-500 text-white shadow-purple-500/30",
    iconBg: "bg-purple-500/20 text-purple-400",
  },
  {
    href: "/prediksi-2d-depan",
    label: "2D Depan",
    desc: "Formula 80 Line As & Kop AI",
    icon: Layers2,
    badge: "80L",
    badgeCls: "bg-primary text-primary-foreground shadow-primary/30",
    iconBg: "bg-primary/20 text-primary",
  },
];

const drawerVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as any as any,
      stiffness: 300,
      damping: 30,
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

export function PredictionDrawer({ open, onClose }: PredictionDrawerProps) {
  const [location] = useLocation();

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

          {/* Drawer */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2" onClick={onClose}>
              <div className="h-1.5 w-12 rounded-full bg-black/20 dark:bg-white/20" />
            </div>

            <div className="rounded-t-[2rem] bg-background/95 backdrop-blur-sm border-t border-black/10 dark:border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col pb-6">
              
              <div className="flex items-center gap-4 px-6 py-5 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)] shrink-0">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-base font-black text-foreground uppercase tracking-wide">
                    Prediksi
                  </span>
                  <span className="text-xs font-bold tracking-widest text-primary uppercase mt-1">
                    Kategori Analisa
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10 hover:text-foreground transition-all shrink-0"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-2">
                {PREDIKSI_NAV_ITEMS.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={item.href} href={item.href} onClick={onClose} className={cn(
                        "w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-colors border",
                        isActive 
                          ? "bg-primary/10 border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.05)]" 
                          : "bg-black/5 dark:bg-white/5 border-transparent hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/5 dark:hover:border-white/5"
                      )}>
                        <div className="flex items-center gap-4">
                          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", item.iconBg)}>
                            <item.icon className="h-5 w-5" strokeWidth={2.5} />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className={cn("text-sm font-black tracking-wide", isActive ? "text-primary" : "text-foreground")}>
                              {item.label}
                            </span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                              {item.desc}
                            </span>
                          </div>
                        </div>
                        {item.badge && (
                          <div className={cn("px-2 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase", item.badgeCls)}>
                            {item.badge}
                          </div>
                        )}
                    </Link>
                  );
                })}
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
