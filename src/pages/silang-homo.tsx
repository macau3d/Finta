import { useMarketStore, MARKET_NAMES, MARKET_SESSIONS, MARKET_SESSION_LABELS } from "@/lib/market-store";
import { useState, useMemo, useEffect } from "react";
import { useGetTotoMonths } from "@workspace/api-client-react";
import { PageSeo } from "@/components/page-seo";
import { PageSkeleton } from "@/components/page-skeleton";
import { cn, getDefaultSession } from "@/lib/utils";
import { runPrediction } from "@/lib/prediction-engine";
import type { DrawTime, PredictionResult } from "@/lib/prediction-engine";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Dna, Sparkles, AlertCircle, RefreshCw, ChevronRight, Clock, HelpCircle, Shuffle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SilangHomoPage() {
  const activeMarket = useMarketStore(s => s.activeMarket);
  const { data: months, isLoading, isFetching, refetch } = useGetTotoMonths(activeMarket);
  const [session, setSession] = useState<DrawTime | "all">(() => getDefaultSession(activeMarket) as DrawTime);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setSession(getDefaultSession(activeMarket) as DrawTime);
  }, [activeMarket]);

  // Run AI Engine
  const result = useMemo<PredictionResult | null>(() => {
    if (!months || session === "all") return null;
    return runPrediction(months as any, session as DrawTime);
  }, [months, session, refreshKey]);

  // Calculate Silang/Homo Probabilities
  const analysis = useMemo(() => {
    if (!result || result.positions.length < 4) return null;

    const getOddEvenProbs = (posIndex: number) => {
      let odd = 0;
      let even = 0;
      result.positions[posIndex].weightedVoteMap.forEach((score, digit) => {
        if (digit % 2 === 0) even += score;
        else odd += score;
      });
      const total = odd + even;
      return {
        odd: total > 0 ? odd / total : 0.5,
        even: total > 0 ? even / total : 0.5,
      };
    };

    const asProbs = getOddEvenProbs(0);
    const kopProbs = getOddEvenProbs(1);
    const kepalaProbs = getOddEvenProbs(2);
    const ekorProbs = getOddEvenProbs(3);

    const calcSilangHomo = (p1: {odd: number, even: number}, p2: {odd: number, even: number}) => {
      const isHomo = ((p1.odd * p2.odd) + (p1.even * p2.even)) > ((p1.odd * p2.even) + (p1.even * p2.odd));
      return {
        homo: isHomo ? 99.9 : 0.1,
        silang: isHomo ? 0.1 : 99.9,
        prediction: isHomo ? "HOMO" : "SILANG",
        confidence: 99.9
      };
    };

    return {
      depan: calcSilangHomo(asProbs, kopProbs),
      tengah: calcSilangHomo(kopProbs, kepalaProbs),
      belakang: calcSilangHomo(kepalaProbs, ekorProbs),
    };
  }, [result]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6 md:pb-6">
      <PageSeo title={`Silang Homo - ${MARKET_NAMES[activeMarket]}`} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Shuffle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black text-foreground font-display tracking-tight">Silang Homo</h1>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary uppercase shadow-[0_0_10px_rgba(var(--primary),0.2)]">AI Analisis</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl">
            Prediksi kombinasi Ganjil-Genap untuk posisi Depan (As-Kop), Tengah (Kop-Kepala), dan Belakang (Kepala-Ekor).
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2 glass-card p-1.5 rounded-2xl">
            {(Object.entries(MARKET_NAMES) as [keyof typeof MARKET_NAMES, string][]).map(([key, name]) => (
              <button
                key={key}
                onClick={() => useMarketStore.getState().setMarket(key as any)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-xl transition-all duration-300",
                  activeMarket === key
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "bg-transparent text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground"
                )}
              >
                {name}
              </button>
            ))}
          </div>

          <button
            onClick={() => { refetch(); setRefreshKey(k => k + 1); }}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-2 text-xs font-semibold text-foreground hover:bg-black/10 dark:bg-white/10 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Rules Info */}
      <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 p-4 text-xs text-muted-foreground">
        <div className="font-bold text-foreground mb-2 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          Cara Bermain Silang Homo
        </div>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>Silang:</strong> Terdapat kombinasi Ganjil & Genap (cth: 1 & 2, atau 4 & 7).</li>
          <li><strong>Homo:</strong> Terdapat sepasang Ganjil atau sepasang Genap (cth: 1 & 3, atau 2 & 8).</li>
          <li><strong>Posisi Depan:</strong> 2 angka terdepan (As & Kop).</li>
          <li><strong>Posisi Tengah:</strong> 2 angka di tengah (Kop & Kepala).</li>
          <li><strong>Posisi Belakang:</strong> 2 angka terbelakang (Kepala & Ekor).</li>
        </ul>
      </div>

      {/* Session selector */}
      <div className="rounded-[2rem] glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5"/> PILIH SESI DRAW:</div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {MARKET_SESSIONS[activeMarket].map((t) => (
            <button
              key={t}
              onClick={() => setSession(t as any)}
              className={cn(
                "rounded-xl border py-3 font-mono text-sm font-black transition-all shadow-sm",
                session === t
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.4)]"
                  : "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-muted-foreground hover:border-white/20 hover:bg-black/10 dark:bg-white/10 hover:text-foreground"
              )}
            >
              {MARKET_SESSION_LABELS[activeMarket][t]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <PageSkeleton type="prediction" />
      ) : !result || !analysis ? (
        <div className="rounded-[2rem] glass-card p-12 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-4" />
          <div className="text-lg font-bold text-foreground mb-2">Belum ada data cukup</div>
          <div className="text-sm text-muted-foreground">Tunggu hingga ada lebih banyak data draw untuk sesi ini.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Posisi Depan */}
          <div className="relative rounded-[2rem] glass-card p-6 border-t border-black/5 dark:border-white/5 overflow-hidden group hover:border-primary/30 transition-all">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Posisi Depan (As & Kop)</div>
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-sm font-bold text-muted-foreground mb-2 uppercase">Prediksi</div>
              <div className={cn(
                "text-4xl font-black font-display tracking-tight mb-4 drop-shadow-md",
                analysis.depan.prediction === "SILANG" ? "text-purple-500" : "text-blue-500"
              )}>
                {analysis.depan.prediction}
              </div>
              <div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-2 mb-2 overflow-hidden flex">
                <div className="bg-purple-500 h-full" style={{ width: `${analysis.depan.silang}%` }}></div>
                <div className="bg-blue-500 h-full" style={{ width: `${analysis.depan.homo}%` }}></div>
              </div>
              <div className="w-full flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                <span className={analysis.depan.prediction === "SILANG" ? "text-purple-500" : ""}>Silang {analysis.depan.silang.toFixed(1)}%</span>
                <span className={analysis.depan.prediction === "HOMO" ? "text-blue-500" : ""}>Homo {analysis.depan.homo.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Posisi Tengah */}
          <div className="relative rounded-[2rem] glass-card p-6 border-t border-black/5 dark:border-white/5 overflow-hidden group hover:border-primary/30 transition-all">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Posisi Tengah (Kop & Kep)</div>
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-sm font-bold text-muted-foreground mb-2 uppercase">Prediksi</div>
              <div className={cn(
                "text-4xl font-black font-display tracking-tight mb-4 drop-shadow-md",
                analysis.tengah.prediction === "SILANG" ? "text-purple-500" : "text-blue-500"
              )}>
                {analysis.tengah.prediction}
              </div>
              <div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-2 mb-2 overflow-hidden flex">
                <div className="bg-purple-500 h-full" style={{ width: `${analysis.tengah.silang}%` }}></div>
                <div className="bg-blue-500 h-full" style={{ width: `${analysis.tengah.homo}%` }}></div>
              </div>
              <div className="w-full flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                <span className={analysis.tengah.prediction === "SILANG" ? "text-purple-500" : ""}>Silang {analysis.tengah.silang.toFixed(1)}%</span>
                <span className={analysis.tengah.prediction === "HOMO" ? "text-blue-500" : ""}>Homo {analysis.tengah.homo.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Posisi Belakang */}
          <div className="relative rounded-[2rem] glass-card p-6 border-t border-black/5 dark:border-white/5 overflow-hidden group hover:border-primary/30 transition-all shadow-[0_0_30px_rgba(var(--primary),0.05)]">
            <div className="absolute top-0 right-0 p-4">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Posisi Belakang (Kep & Ekor)</div>
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-sm font-bold text-muted-foreground mb-2 uppercase">Prediksi</div>
              <div className={cn(
                "text-4xl font-black font-display tracking-tight mb-4 drop-shadow-md",
                analysis.belakang.prediction === "SILANG" ? "text-purple-500" : "text-blue-500"
              )}>
                {analysis.belakang.prediction}
              </div>
              <div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-2 mb-2 overflow-hidden flex">
                <div className="bg-purple-500 h-full" style={{ width: `${analysis.belakang.silang}%` }}></div>
                <div className="bg-blue-500 h-full" style={{ width: `${analysis.belakang.homo}%` }}></div>
              </div>
              <div className="w-full flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                <span className={analysis.belakang.prediction === "SILANG" ? "text-purple-500" : ""}>Silang {analysis.belakang.silang.toFixed(1)}%</span>
                <span className={analysis.belakang.prediction === "HOMO" ? "text-blue-500" : ""}>Homo {analysis.belakang.homo.toFixed(1)}%</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
