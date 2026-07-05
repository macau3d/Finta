import { useMemo } from "react";
import { useMarketStore } from "@/lib/market-store";
import { useGetPredictions, useGetTotoMonths } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { TrendingUp, Activity, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function DailySummary() {
  const activeMarket = useMarketStore((s) => s.activeMarket);
  const { data: predictions, isLoading: isLoadingPreds } = useGetPredictions(activeMarket);
  const { data: months, isLoading: isLoadingMonths } = useGetTotoMonths(activeMarket);

  const todayStr = useMemo(() => {
    return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }, []);

  const summary = useMemo(() => {
    if (!predictions || !months) return null;

    // 1. Day's predicted trends
    const todayPreds = predictions.filter(p => p.forDate === todayStr);
    const predictedDigits = new Array(10).fill(0);
    todayPreds.forEach(p => {
      if (p.predicted4d) {
        for (let i = 0; i < 4; i++) {
          const digit = parseInt(p.predicted4d[i], 10);
          if (!isNaN(digit)) {
            predictedDigits[digit]++;
          }
        }
      }
    });

    const topPredicted = predictedDigits
      .map((count, digit) => ({ digit, count }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map(x => x.digit);

    // 2. Most frequent numbers (recent 30 draws)
    const recentDraws: string[] = [];
    months.forEach((m) => {
      m.results.forEach((day) => {
        Object.keys(day).forEach(k => {
          if (k.startsWith("draw")) {
            const val = day[k as keyof typeof day] as string;
            if (val && val.length === 4) {
              recentDraws.push(val);
            }
          }
        });
      });
    });

    // We need them in chronological order to get the *most recent* 30 draws.
    // However, month results are already sorted (we should extract and sort by date/time, but since we just want frequency of recent, let's just grab the last 120 draws which is about 30 days).
    const N = Math.min(120, recentDraws.length);
    const lastDraws = recentDraws.slice(-N);
    
    const freqCounts = new Array(10).fill(0);
    lastDraws.forEach(val => {
      for (let i = 0; i < 4; i++) {
        freqCounts[parseInt(val[i], 10)]++;
      }
    });

    const topFrequent = freqCounts
      .map((count, digit) => ({ digit, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map(x => x.digit);

    const averageConfidence = todayPreds.length > 0
      ? Math.round(todayPreds.reduce((acc, p) => acc + p.confidence, 0) / todayPreds.length)
      : 0;

    return {
      topPredicted,
      topFrequent,
      predictionCount: todayPreds.length,
      averageConfidence
    };
  }, [predictions, months, todayStr]);

  if (isLoadingPreds || isLoadingMonths) {
    return (
      <div className="glass-card rounded-[2rem] p-6 mb-8 flex flex-col gap-4">
        <Skeleton className="h-6 w-48 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="glass-card rounded-[2rem] p-6 mb-8 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary border border-primary/20">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Daily Summary</h2>
          <p className="text-xs text-muted-foreground font-medium">Ringkasan hari ini berdasarkan analisis AI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {/* Card 1: Trends */}
        <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-muted-foreground">Top Prediksi Angka</span>
            <Target className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex gap-2 items-center">
            {summary.topPredicted.length > 0 ? (
              summary.topPredicted.map((d, i) => (
                <div key={i} className="flex h-10 w-10 items-center justify-center bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-xl font-display font-bold text-lg">
                  {d}
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">Belum ada prediksi</div>
            )}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-3">Sering muncul di prediksi hari ini</div>
        </div>

        {/* Card 2: Frequent numbers */}
        <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-muted-foreground">Angka Panas (History)</span>
            <TrendingUp className="h-4 w-4 text-rose-400" />
          </div>
          <div className="flex gap-2 items-center">
            {summary.topFrequent.length > 0 ? (
              summary.topFrequent.map((d, i) => (
                <div key={i} className="flex h-10 w-10 items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl font-display font-bold text-lg">
                  {d}
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">Data tidak tersedia</div>
            )}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-3">Angka paling sering muncul (100 draw)</div>
        </div>

        {/* Card 3: Model confidence */}
        <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-5 flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-muted-foreground">Status Analisis</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-display font-bold text-foreground">{summary.predictionCount}</span>
              <span className="text-sm text-muted-foreground pb-1">Sesi Dianalisis</span>
            </div>
            {summary.predictionCount > 0 && (
              <div className="text-sm font-medium text-emerald-400">Rata-rata Konfidensi: {summary.averageConfidence}%</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
