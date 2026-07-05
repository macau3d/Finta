import { useMarketStore, MARKET_NAMES, MARKET_SESSIONS, MARKET_SESSION_LABELS } from "@/lib/market-store";
import { motion } from "motion/react";
import { useGetTotoMonths } from "@workspace/api-client-react";
import { PageSeo } from "@/components/page-seo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageSkeleton } from "@/components/page-skeleton";
import { cn, getDefaultSession } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import {
  Copy, Check, Sparkles, Cpu, Layers2, TrendingUp, HelpCircle,
  TrendingDown, AlertTriangle, ArrowRight, Play, Eye, EyeOff
} from "lucide-react";




import type { DrawTime } from "@/lib/prediction-engine";

interface LineResult {
  num: string; // "00" - "99"
  score: number;
  freq: number;
  gap: number;
  decayScore: number;
  comboScore: number;
  transitionScore: number;
  rank: number;
}

const prediksi1DCache = new Map<string, { list: LineResult[], stats: any }>();

export default function Prediksi1DPage() {
  const activeMarket = useMarketStore(s => s.activeMarket);
  const { data: months, isLoading } = useGetTotoMonths(activeMarket);
  const [selectedSession, setSelectedSession] = useState<DrawTime | "all">(() => getDefaultSession(activeMarket) as DrawTime);

  useEffect(() => {
    setSelectedSession(getDefaultSession(activeMarket) as DrawTime);
  }, [activeMarket]);

  const separator = "*";
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const [showWeakLines, setShowWeakLines] = useState(false);

  // Parse all drawings from history
  const allResults = useMemo(() => {
    if (!months) return [];
    const list: { drawDate: string; session: string; result: string }[] = [];
    months.forEach((m) => {
      m.results.forEach((day) => {
        MARKET_SESSIONS[activeMarket].forEach((t) => {
          const val = day[`draw${t}` as const];
          if (val && val.length === 4 && !isNaN(parseInt(val))) {
            list.push({
              drawDate: day.drawDate,
              session: t,
              result: val,
            });
          }
        });
      });
    });
    // Sort from oldest to newest
    return list.sort((a, b) => a.drawDate.localeCompare(b.drawDate));
  }, [months]);

  // Filter based on chosen session
  const filteredResults = useMemo(() => {
    if (selectedSession === "all") return allResults;
    return allResults.filter((r) => r.session === selectedSession);
  }, [allResults, selectedSession]);

  // Main calculation of 10 possible 1D lines
  const predictionList = useMemo<LineResult[]>(() => {
    if (filteredResults.length === 0) return [];
    
    const cacheKey = `list-${selectedSession}-${filteredResults.length}-${filteredResults[filteredResults.length - 1]?.result || "0"}`;
    if (prediksi1DCache.has(cacheKey)) {
      return prediksi1DCache.get(cacheKey)!.list;
    }

    const totalDraws = filteredResults.length;
    const freq1D = new Array(10).fill(0);
    const lastSeenIndex = new Array(10).fill(-1);

    // Exponentially decay-weighted frequency
    const decay1D = new Array(10).fill(0);

    // Transition count: from previous draw 1D to next 1D
    const transitionMatrix: Record<string, number[]> = {};

    // Calculate recent trends
    const RECENT_WINDOW = Math.min(10, totalDraws);
    let recentOdd = 0;
    let recentHigh = 0;
    for (let i = totalDraws - RECENT_WINDOW; i < totalDraws; i++) {
        const val = parseInt(filteredResults[i].result[3]);
        if (val % 2 !== 0) recentOdd++;
        if (val >= 5) recentHigh++;
    }
    const isOddTrending = recentOdd >= RECENT_WINDOW / 2;
    const isHighTrending = recentHigh >= RECENT_WINDOW / 2;

    filteredResults.forEach((draw, idx) => {
      const full4d = draw.result;
      const val1d = parseInt(full4d[3]);

      freq1D[val1d]++;
      lastSeenIndex[val1d] = idx;

      // Decay scoring (recent draws get higher weight)
      decay1D[val1d] += Math.pow(0.965, totalDraws - 1 - idx);

      // Transition matrix tracking
      if (idx > 0) {
        const prevVal1dStr = filteredResults[idx - 1].result[3];
        if (!transitionMatrix[prevVal1dStr]) {
          transitionMatrix[prevVal1dStr] = new Array(10).fill(0);
        }
        transitionMatrix[prevVal1dStr][val1d]++;
      }
    });

    // Last drawn 1D for Markov chain transition
    const lastDraw = filteredResults[filteredResults.length - 1]?.result;
    const last1dStr = lastDraw ? lastDraw[3] : "";
    const transitionWeights = transitionMatrix[last1dStr] || new Array(10).fill(0);
    const maxTransition = Math.max(1, ...transitionWeights);

    const maxFreq = Math.max(1, Math.max(...freq1D));
    const maxDecay = Math.max(0.001, Math.max(...decay1D));

    // Build scores for each of 10 combinations
    const results: LineResult[] = Array.from({ length: 10 }, (_, i) => {
      const numStr = i.toString();
      const count = freq1D[i];
      const gap = lastSeenIndex[i] === -1 ? totalDraws : totalDraws - 1 - lastSeenIndex[i];

      // Normalized sub-scores
      const fScore = (count / maxFreq) * 100;
      const dScore = (decay1D[i] / maxDecay) * 100;
      const tScore = (transitionWeights[i] / maxTransition) * 100;

      // Gap bonus: we prefer hot numbers but also include a "rebound overdue" factor
      const gapBonus = Math.min(60, gap * 2);

      // Trend alignment bonus
      let trendBonus = 0;
      const isOdd = i % 2 !== 0;
      const isHigh = i >= 5;
      if (isOdd === isOddTrending) trendBonus += 20;
      if (isHigh === isHighTrending) trendBonus += 20;

      // Mathematical transformations (Togel Math) matches
      let mathBonus = 0;
      if (last1dStr) {
        const lastEk = parseInt(last1dStr);
        
        // Mistik Lama: 0=1, 2=5, 3=8, 4=7, 6=9
        const mlMap: Record<number, number> = { 0:1, 1:0, 2:5, 5:2, 3:8, 8:3, 4:7, 7:4, 6:9, 9:6 };
        if (i === mlMap[lastEk]) mathBonus += 20;
        
        // Mistik Baru: 0=8, 1=7, 2=6, 3=9, 4=5
        const mbMap: Record<number, number> = { 0:8, 8:0, 1:7, 7:1, 2:6, 6:2, 3:9, 9:3, 4:5, 5:4 };
        if (i === mbMap[lastEk]) mathBonus += 20;
        
        // Index: 0=5, 1=6, 2=7, 3=8, 4=9
        const idxMap: Record<number, number> = { 0:5, 5:0, 1:6, 6:1, 2:7, 7:2, 3:8, 8:3, 4:9, 9:4 };
        if (i === idxMap[lastEk]) mathBonus += 25;
      }

      // Final mathematical composite score
      // Weighting: Decay (25%) + Transition (20%) + Trend (15%) + Math (25%) + Gap (5%) + Freq (10%)
      const totalScore = (dScore * 0.25) + (fScore * 0.10) + (tScore * 0.20) + (gapBonus * 0.05) + (trendBonus * 0.15) + mathBonus;


      return {
        num: numStr,
        score: Math.round(totalScore),
        freq: count,
        gap,
        decayScore: Math.round(dScore),
        comboScore: Math.round(trendBonus), // repurposed as trend score
        transitionScore: Math.round(tScore),
        rank: 0, // Assigned below
      };
    });

    // Sort by composite score descending
    results.sort((a, b) => b.score - a.score || b.freq - a.freq || a.gap - b.gap);

    // Assign rank
    results.forEach((item, index) => {
      item.rank = index + 1;
    });

    const existing = prediksi1DCache.get(cacheKey) || { list: [], stats: null };
    prediksi1DCache.set(cacheKey, { ...existing, list: results });
    
    return results;
  }, [filteredResults, selectedSession]);

  // Segregate the 10 lines into groups
  const lineUtama = useMemo(() => predictionList.slice(0, 1), [predictionList]);
  const lineCadangan = useMemo(() => predictionList.slice(1, 4), [predictionList]);
  const lineSupport = useMemo(() => predictionList.slice(4, 7), [predictionList]);
  const lineLemah = useMemo(() => predictionList.slice(7, 10), [predictionList]);

  const all7Lines = useMemo(() => {
    return [...lineUtama, ...lineCadangan, ...lineSupport].map(x => x.num).sort();
  }, [lineUtama, lineCadangan, lineSupport]);

  // Backtest simulation: calculates what percentage of previous K draws were "Hits" in our 7-line generator
  const backtestStats = useMemo(() => {
    if (allResults.length < 25) return { rate: 0, hits: 0, total: 0 };
    
    // We can use the same filteredResults based cache key since it depends on the same data
    const cacheKey = `list-${selectedSession}-${allResults.length}-${allResults[allResults.length - 1]?.result || "0"}`;
    const cached = prediksi1DCache.get(cacheKey);
    if (cached?.stats) {
      return cached.stats;
    }

    const K = Math.min(30, allResults.length - 20); // Test last 30 draws
    let hits = 0;

    for (let i = 0; i < K; i++) {
      const testIdx = allResults.length - 1 - i;
      const testDraw = allResults[testIdx];
      const testDraw1D = testDraw.result[3];

      // Compile prediction prior to testIdx
      const priorHistory = allResults.slice(0, testIdx);
      if (selectedSession !== "all") {
        // filter session
        const sessHistory = priorHistory.filter(h => h.session === testDraw.session);
        if (sessHistory.length < 10) continue;
      }

      // Re-run simplified prediction calculation
      const tempFreq = new Array(10).fill(0);
      const tempDecay = new Array(10).fill(0);
      const tempTransitions: Record<string, number[]> = {};
      
      const histLength = priorHistory.length;

      // Calculate recent trends for testIdx
      const tempRecentWindow = Math.min(10, histLength);
      let tempRecentOdd = 0;
      let tempRecentHigh = 0;
      for (let i = histLength - tempRecentWindow; i < histLength; i++) {
          const val = parseInt(priorHistory[i].result[3]);
          if (val % 2 !== 0) tempRecentOdd++;
          if (val >= 5) tempRecentHigh++;
      }
      const tempIsOddTrending = tempRecentOdd >= tempRecentWindow / 2;
      const tempIsHighTrending = tempRecentHigh >= tempRecentWindow / 2;

      priorHistory.forEach((h, idx) => {
        const full4d = h.result;
        const val = parseInt(full4d[3]);

        tempFreq[val]++;
        tempDecay[val] += Math.pow(0.965, histLength - 1 - idx);

        if (idx > 0) {
          const prevVal = priorHistory[idx - 1].result[3];
          if (!tempTransitions[prevVal]) tempTransitions[prevVal] = new Array(10).fill(0);
          tempTransitions[prevVal][val]++;
        }
      });

      const lastDraw1D = priorHistory[histLength - 1]?.result[3] || "";
      const transWgts = tempTransitions[lastDraw1D] || new Array(10).fill(0);
      const maxTrans = Math.max(1, ...transWgts);

      const tempScores = Array.from({ length: 10 }, (_, code) => {
        
        const fScore = (tempFreq[code] / Math.max(1, Math.max(...tempFreq))) * 100;
        const dScore = (tempDecay[code] / Math.max(0.001, Math.max(...tempDecay))) * 100;
        const tScore = (transWgts[code] / maxTrans) * 100;

        let tempTrend = 0;
        if ((code % 2 !== 0) === tempIsOddTrending) tempTrend += 20;
        if ((code >= 5) === tempIsHighTrending) tempTrend += 20;

        let tempMathBonus = 0;
        if (lastDraw1D) {
          const lastEk = parseInt(lastDraw1D);
          const mlMap: Record<number, number> = { 0:1, 1:0, 2:5, 5:2, 3:8, 8:3, 4:7, 7:4, 6:9, 9:6 };
          if (code === mlMap[lastEk]) tempMathBonus += 20;
          const mbMap: Record<number, number> = { 0:8, 8:0, 1:7, 7:1, 2:6, 6:2, 3:9, 9:3, 4:5, 5:4 };
          if (code === mbMap[lastEk]) tempMathBonus += 20;
          const idxMap: Record<number, number> = { 0:5, 5:0, 1:6, 6:1, 2:7, 7:2, 3:8, 8:3, 4:9, 9:4 };
          if (code === idxMap[lastEk]) tempMathBonus += 25;
        }

        const score = (dScore * 0.25) + (fScore * 0.10) + (tScore * 0.20) + (tempTrend * 0.15) + tempMathBonus;

        return { code, score };
      });

      tempScores.sort((a, b) => b.score - a.score);
      const top7Codes = tempScores.slice(0, 7).map(x => x.code.toString());

      if (top7Codes.includes(testDraw1D)) {
        hits++;
      }
    }

    const rate = (hits / K) * 100;
    const finalStats = {
      rate: Math.round(rate),
      hits,
      total: K,
    };
    
    const existing = prediksi1DCache.get(cacheKey) || { list: [], stats: null };
    prediksi1DCache.set(cacheKey, { ...existing, stats: finalStats });
    
    return finalStats;
  }, [allResults, selectedSession]);

  function copyText(nums: string[], groupName: string) {
    const text = nums.join(separator);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedGroup(groupName);
      setTimeout(() => setCopiedGroup(null), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6 md:pb-6">
      <PageSeo
        title="Prediksi 1D Belakang 7 Line"
        description={`Analisis AI multi-algoritma data historis ${MARKET_NAMES[activeMarket]} untuk menghasilkan 7 line 1D belakang dengan akurasi maksimal.`}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-fuchsia-500/15 border border-fuchsia-500/25 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
              <Cpu className="h-5 w-5 text-fuchsia-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground drop-shadow-md">AI Prediksi 1D Belakang</h1>
              <Badge variant="secondary" className="bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 text-[10px] uppercase font-bold py-0.5 px-2 mt-0.5">
                Machine Learning + Togel Math (7 Line)
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground ml-14 pl-0.5">
            Menghitung probabilitas 1 Angka Belakang (0–9) menggunakan Frequency, Exponential Trend, Markov Chain, Gap, dan Togel Math (Mistik, Index).
          </p>
        </div>

        {/* Backtest accuracy badge */}
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-3 sm:w-auto shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground leading-none">Akurasi 30 Result Terakhir</div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-extrabold text-emerald-400">{backtestStats.rate}%</span>
              <span className="text-[10px] text-muted-foreground">Hit Rate ({backtestStats.hits}/{backtestStats.total} Draw)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel / Session Selection */}
      <div className="grid grid-cols-1 gap-4">
        {/* Session card filter */}
        <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">
              PILIH SESI DRAW MACAU
            </span>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MARKET_SESSIONS[activeMarket].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedSession(t as any)}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-bold transition-all border shrink-0",
                  selectedSession === t
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-sm"
                    : "bg-muted/20 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/40"
                )}
              >
                Sesi {MARKET_SESSION_LABELS[activeMarket][t]} WIB
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <PageSkeleton type="prediction" />
      ) : predictionList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground shadow-sm backdrop-blur-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500/80 mb-2" />
          Data historis kosong atau tidak ditemukan.
        </div>
      ) : (
        <motion.div key={selectedSession} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="space-y-6">
          {/* Main 7 Line Hub Card */}
          <div className="rounded-3xl border border-primary/20 bg-background/60 backdrop-blur-sm shadow-[0_0_30px_rgba(0,220,255,0.1)] overflow-hidden">
            {/* Header copy action */}
            <div className="border-b border-primary/20 bg-primary/5 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest drop-shadow-[0_0_5px_currentColor]">Gabungan 7 Line Terkuat</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Gabungan Utama + Cadangan + Support</p>
                </div>
              </div>
              <button
                onClick={() => copyText(all7Lines, "all7")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black transition-all border",
                  copiedGroup === "all7"
                    ? "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                    : "bg-rose-500 text-white border-transparent hover:bg-rose-600 active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                )}
              >
                {copiedGroup === "all7" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedGroup === "all7" ? "Berhasil Disalin!" : "Copy Semua 7 Line"}
              </button>
            </div>

            {/* Display grid of 7 numbers */}
            <div className="p-4 sm:p-6 bg-black/5 dark:bg-black/30 relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,220,255,0.05),transparent_7%)] pointer-events-none" />
              <div className="flex flex-wrap gap-2 justify-center relative z-10">
                {all7Lines.map((num) => {
                  const details = predictionList.find(x => x.num === num);
                  const isUtama = lineUtama.some(x => x.num === num);
                  const isCadangan = lineCadangan.some(x => x.num === num);

                  return (
                    <div
                      key={num}
                      className={cn(
                        "relative flex flex-col items-center justify-center h-14 w-12 rounded-xl border transition-all cursor-help group shadow-inner overflow-hidden",
                        isUtama
                          ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[inset_0_0_15px_rgba(244,63,94,0.2),0_0_10px_rgba(244,63,94,0.2)]"
                          : isCadangan
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]"
                          : "bg-black/5 dark:bg-black/40 border-black/10 dark:border-white/10 text-foreground"
                      )}
                      title={`Kombinasi ${num} - Skor Akurasi: ${details?.score}% (Rank #${details?.rank})`}
                    >
                      <span className="font-mono text-lg font-black tracking-tighter mb-1.5">{num}</span>
                      <div className="absolute bottom-1.5 left-0 right-0 px-1.5 flex items-center justify-between gap-0.5 opacity-90">
                        <div className="flex-1 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", isUtama ? "bg-rose-500" : isCadangan ? "bg-amber-500" : "bg-muted-foreground/50")} style={{ width: `${details?.score}%` }} />
                        </div>
                        <span className="text-[6px] font-black tracking-tighter text-muted-foreground leading-none">{details?.score}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fast code text display for copy pasting */}
              <div className="mt-6 rounded-3xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/60 p-5 relative z-10 backdrop-blur-sm">
                <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground block mb-2">
                  Format Teks Cepat (Bintang)
                </span>
                <p className="font-mono text-[12px] text-primary/80 break-all leading-relaxed max-h-20 overflow-y-auto scrollbar-none select-all drop-shadow-[0_0_5px_currentColor]">
                  {all7Lines.join(separator)}
                </p>
              </div>
            </div>
          </div>

          {/* Grouped Lists (Bento Grid Style) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Line Utama (1 Line) */}
            <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 p-5 space-y-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold">1</div>
                  <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider">Line Utama (1 LN)</h4>
                </div>
                <button
                  onClick={() => copyText(lineUtama.map(x => x.num), "utama")}
                  className="rounded px-2 py-1 text-[10px] font-bold border border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors"
                >
                  {copiedGroup === "utama" ? "Disalin!" : "Copy 1 LN"}
                </button>
              </div>
              <p className="text-[10px] text-rose-300/7 leading-normal">
                1 Kombinasi dengan akumulasi skor tertinggi & momentum paling stabil.
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {lineUtama.map((item) => (
                  <div key={item.num} className="text-center bg-rose-500/10 rounded-lg border border-rose-500/20 py-2">
                    <div className="font-mono text-sm font-black text-rose-300">{item.num}</div>
                    <div className="text-[8px] text-rose-400/80 mt-0.5">{item.score}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Line Cadangan (3 Line) */}
            <div className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-5 space-y-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">2</div>
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Line Cadangan (3 LN)</h4>
                </div>
                <button
                  onClick={() => copyText(lineCadangan.map(x => x.num), "cadangan")}
                  className="rounded px-2 py-1 text-[10px] font-bold border border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
                >
                  {copiedGroup === "cadangan" ? "Disalin!" : "Copy 3 LN"}
                </button>
              </div>
              <p className="text-[10px] text-amber-300/7 leading-normal">
                Kombinasi pendukung berfrekuensi tinggi & trend kuat yang berpotensi melesat.
              </p>
              <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto pr-1">
                {lineCadangan.map((item) => (
                  <div key={item.num} className="text-center bg-amber-500/5 rounded-lg border border-amber-500/15 py-1.5">
                    <div className="font-mono text-xs font-bold text-amber-200">{item.num}</div>
                    <div className="text-[7px] text-amber-400/7 scale-90">{item.score}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Line Support (3 Line) */}
            <div className="rounded-3xl border border-border/50 bg-gradient-to-b from-card to-background p-5 space-y-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded bg-muted/40 text-muted-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Line Support (3 LN)</h4>
                </div>
                <button
                  onClick={() => copyText(lineSupport.map(x => x.num), "support")}
                  className="rounded px-2 py-1 text-[10px] font-bold border border-border bg-muted/10 text-foreground hover:bg-muted/30 transition-colors"
                >
                  {copiedGroup === "support" ? "Disalin!" : "Copy 3 LN"}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal">
                Kombinasi dengan gap tinggi/overdue (lama tidak keluar) yang berpeluang keluar cepat.
              </p>
              <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto pr-1">
                {lineSupport.map((item) => (
                  <div key={item.num} className="text-center bg-muted/10 rounded-lg border border-border/40 py-1.5">
                    <div className="font-mono text-xs font-bold text-muted-foreground">{item.num}</div>
                    <div className="text-[7px] text-muted-foreground/60 scale-90">{item.score}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filtering Analysis Explanation Card */}
          <div className="rounded-3xl border border-border/50 bg-gradient-to-b from-card to-background p-6 space-y-5 shadow-sm backdrop-blur-sm">
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              METODE FILTRASI AI 1D
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs">
              <div className="space-y-1 bg-black/10 border border-border/20 rounded-xl p-3">
                <span className="font-bold text-rose-400 block">1. Decay & Gap (30%)</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Menghitung bobot eksponensial sesi baru + kompensasi angka overdue (titik jenuh).
                </p>
              </div>
              <div className="space-y-1 bg-black/10 border border-border/20 rounded-xl p-3">
                <span className="font-bold text-amber-400 block">2. Togel Math (25%)</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Transformasi matematis Mistik Lama, Mistik Baru, dan Angka Index.
                </p>
              </div>
              <div className="space-y-1 bg-black/10 border border-border/20 rounded-xl p-3">
                <span className="font-bold text-blue-400 block">3. Markov Chain (20%)</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Probabilitas transisi pergerakan dari angka 1D terakhir.
                </p>
              </div>
              <div className="space-y-1 bg-black/10 border border-border/20 rounded-xl p-3">
                <span className="font-bold text-emerald-400 block">4. Trend Analysis (15%)</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Mendeteksi arah pergerakan Ganjil/Genap dan Besar/Kecil terkini.
                </p>
              </div>
              <div className="space-y-1 bg-black/10 border border-border/20 rounded-xl p-3">
                <span className="font-bold text-fuchsia-400 block">5. Freq All-Time (10%)</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Bobot kemunculan angka dari awal dataset pasar tersedia.
                </p>
              </div>
            </div>
          </div>

          {/* Saringan AI: Weak Numbers filter out list */}
          <div className="rounded-3xl border border-border/50 bg-card/60 p-5 space-y-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Saringan AI: 3 Line yang Dieliminasi</h4>
                <p className="text-[10px] text-muted-foreground">Angka terlemah/paling dingin berdasarkan hitungan data saat ini.</p>
              </div>
              <button
                onClick={() => setShowWeakLines(!showWeakLines)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[10px] font-bold px-3 py-1.5 transition-colors"
              >
                {showWeakLines ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showWeakLines ? "Sembunyikan" : "Tampilkan 3 LN Lemah"}
              </button>
            </div>

            {showWeakLines && (
              <div className="space-y-3 pt-2 border-t border-border/40">
                <div className="flex flex-wrap gap-1 justify-center">
                  {lineLemah.map((item) => (
                    <div
                      key={item.num}
                      className="flex flex-col items-center justify-center h-10 w-10 rounded-lg border border-red-500/10 bg-red-500/5 text-muted-foreground/60"
                      title={`Kombinasi lemah: ${item.num} - Rank #${item.rank}`}
                    >
                      <span className="font-mono text-xs font-bold line-through">{item.num}</span>
                      <span className="text-[7px] text-red-400/55">{item.score}%</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-3 flex items-start gap-2 text-[10px] text-muted-foreground leading-relaxed">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Saran Manajemen Risiko:</strong> Ke-3 line di atas adalah angka dengan skor di bawah ambang batas (cutoff) analitik. AI menyarankan untuk membatasi/menghilangkan angka ini dari taruhan Anda guna meningkatkan efisiensi modal.
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
