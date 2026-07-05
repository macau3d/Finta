import { useState, useMemo } from "react";
import { useGetTotoMonths, useGetNomorTaruhan } from "@workspace/api-client-react";
import { useMarketStore, MARKET_SESSIONS, MARKET_SESSION_LABELS } from "@/lib/market-store";
import { PageSeo } from "@/components/page-seo";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeHits } from "@/lib/classify";
import { NumberDisplay } from "@/components/number-display";
import { ScrollToTop } from "@/components/scroll-to-top";
import { motion, AnimatePresence } from "motion/react";

type DrawTimeKey = "draw0001" | "draw1300" | "draw1600" | "draw1900" | "draw2200" | "draw2300";
function drawKey(t: string): DrawTimeKey {
  return `draw${t}` as DrawTimeKey;
}

export default function ResultPage() {
  const activeMarket = useMarketStore(s => s.activeMarket);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  
  const { data: months, isLoading: monthsLoading } = useGetTotoMonths(activeMarket);
  const { data: nomorTaruhan } = useGetNomorTaruhan();

  const taruhanSet = useMemo(
    () => new Set<string>(nomorTaruhan?.numbers ?? []),
    [nomorTaruhan]
  );

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6 md:pb-6">
      <PageSeo
        title="Result & Riwayat"
        description="Riwayat lengkap data keluaran Toto Macau per bulan."
      />

      <div>
        <h1 className="mb-3 text-2xl font-bold uppercase tracking-wider text-foreground">
          Riwayat per Bulan
        </h1>
        {monthsLoading ? (
          <div className="rounded-[2rem] glass-card overflow-hidden divide-y divide-black/10 dark:divide-white/10 shadow-sm">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-none bg-black/5 dark:bg-white/5" />
            ))}
          </div>
        ) : months && months.length > 0 ? (
          <div className="rounded-[2rem] glass-card overflow-hidden divide-y divide-black/10 dark:divide-white/10">
            {months.map((monthGroup, idx) => {
              const key = `${monthGroup.year}-${monthGroup.month}`;
              const expanded = expandedMonths.has(key);
              return (
                <div key={key}>
                  <button
                    className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    onClick={() => toggleMonth(key)}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={cn(
                        "flex h-2.5 w-2.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(var(--primary),0.5)]",
                        idx === 0 ? "bg-primary" : "bg-black/20 dark:bg-white/20"
                      )} />
                      <span className="font-bold text-foreground text-[15px]">
                        {monthGroup.monthName} {monthGroup.year}
                      </span>
                      <span className="rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                        {monthGroup.totalDays} hari
                      </span>
                    </div>
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-black/5 dark:bg-white/5">
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 text-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-black/10 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
                      {/* Header row */}
                      <div className="flex items-center gap-2 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2.5 sm:px-5 sm:py-3">
                        <div className="w-[60px] shrink-0 sm:w-[90px]" />
                        {MARKET_SESSIONS[activeMarket].map((t) => (
                          <div key={t} className="flex-1 text-center text-[9px] font-bold uppercase tracking-widest text-muted-foreground sm:text-[10px]">
                            {MARKET_SESSION_LABELS[activeMarket][t]}
                          </div>
                        ))}
                        {taruhanSet.size > 0 && (
                          <div className="w-8 shrink-0 text-center text-[9px] font-bold uppercase tracking-widest text-primary/70 sm:text-[10px]">
                            HIT
                          </div>
                        )}
                      </div>
                      {/* Data rows */}
                      <AnimatePresence>
                        {monthGroup.results.map((row, rowIdx) => {
                          const rowHits = MARKET_SESSIONS[activeMarket].reduce((sum, t) => sum + computeHits(row[drawKey(t)] ?? null, taruhanSet), 0);
                          return (
                            <motion.div 
                              key={row.drawDate}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: rowIdx * 0.05 }}
                              className="flex items-center gap-2 px-3 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors sm:px-5 sm:py-3.5"
                            >
                              {/* Date */}
                              <div className="w-[60px] shrink-0 sm:w-[90px]">
                              <div className="text-[10px] font-semibold text-muted-foreground leading-none sm:text-[11px] uppercase tracking-wider">{row.dayName.slice(0,3)}</div>
                              <div className="mt-1 font-mono text-xs font-bold leading-tight text-foreground sm:text-[15px]">
                                {row.drawDate.slice(5).replace('-','/')}
                              </div>
                            </div>
                            {/* Draw slots */}
                            {MARKET_SESSIONS[activeMarket].map((t) => {
                              const val = row[drawKey(t)] ?? null;
                              const hits = computeHits(val, taruhanSet);
                              const isHit = taruhanSet.size > 0 && hits > 0;
                              return (
                                <div
                                  key={t}
                                  className={cn(
                                    "flex flex-1 items-center justify-center rounded-xl border py-2.5 text-center transition-all duration-300 sm:py-3",
                                    isHit
                                      ? "border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/20 shadow-[inset_0_0_15px_rgba(245,158,11,0.1)]"
                                      : "border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]"
                                  )}
                                >
                                  <NumberDisplay
                                    value={val}
                                    className={isHit ? "text-amber-300 font-bold" : undefined}
                                  />
                                </div>
                              );
                            })}
                            {/* Hit count */}
                            {taruhanSet.size > 0 && (
                              <div className="w-8 shrink-0 text-center">
                                {rowHits > 0 ? (
                                  <span className={cn(
                                    "inline-flex items-center justify-center rounded-full border font-bold h-7 w-7 text-xs shadow-sm",
                                    rowHits >= 16 ? "bg-emerald-500/30 text-emerald-500 dark:text-emerald-300 border-emerald-500/50" :
                                    rowHits >= 8  ? "bg-amber-500/30 text-amber-500 dark:text-amber-300 border-amber-500/50" :
                                    rowHits >= 4  ? "bg-orange-500/30 text-orange-500 dark:text-orange-300 border-orange-500/50" :
                                                    "bg-black/10 dark:bg-white/10 text-foreground border-black/20 dark:border-white/20"
                                  )}>{rowHits}</span>
                                ) : (
                                  <span className="text-muted-foreground/30 text-xs font-bold">—</span>
                                )}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[2rem] glass-card p-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 mb-5">
              <SearchX className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="text-lg font-bold text-foreground mb-2">Riwayat Kosong</div>
            <div className="text-sm text-muted-foreground max-w-[250px]">Belum ada data history yang tersimpan di server.</div>
          </div>
        )}
      </div>
      <ScrollToTop />
    </div>
  );
}
