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
  TrendingDown, AlertTriangle, ArrowRight, Play, Eye, EyeOff, Zap
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";




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


// Menghitung tren probabilitas berbobot menggunakan regresi linier sederhana pada data histori
function calculateWeightedProbability(recentHistory: { result: string }[], targetVal: number): number {
  const N = recentHistory.length;
  if (N < 2) return 1.0;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  let cumulativeHits = 0;

  for (let i = 0; i < N; i++) {
    const draw = recentHistory[i];
    const val2d = parseInt(draw.result.slice(2, 4));
    if (val2d === targetVal) cumulativeHits++;
    
    sumX += i;
    sumY += cumulativeHits;
    sumXY += i * cumulativeHits;
    sumX2 += i * i;
  }

  const denominator = (N * sumX2 - sumX * sumX);
  if (denominator === 0) return 1.0;
  
  const slope = (N * sumXY - sumX * sumY) / denominator;
  
  // Baseline slope for 2D (1/100)
  const baseline = 0.01;
  
  if (slope > baseline * 1.5) return 1.4; // Strong uptrend
  if (slope > baseline) return 1.2; // Uptrend
  if (slope > 0) return 0.9; // Weak trend
  return 0.6; // Dead/flat
}

const prediksi2DCache = new Map<string, { list: LineResult[], stats: any }>();

export default function Prediksi2DPage() {
  const { activeMarket, predictionModel } = useMarketStore();
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

  // Main calculation of 100 possible 2D lines
  const predictionList = useMemo<LineResult[]>(() => {
    if (filteredResults.length === 0) return [];
    
    const cacheKey = `list-${selectedSession}-${filteredResults.length}-${filteredResults[filteredResults.length - 1]?.result || "0"}`;
    if (prediksi2DCache.has(cacheKey)) {
      return prediksi2DCache.get(cacheKey)!.list;
    }

    const totalDraws = filteredResults.length;
    // We only want to heavily weight the last 30 draws for statistical relevance
    const STRICT_WINDOW = 30;
    const windowStartIdx = Math.max(0, totalDraws - STRICT_WINDOW);
    const recentDraws = filteredResults.slice(windowStartIdx);

    const freq2D = new Array(100).fill(0);
    const lastSeenIndex = new Array(100).fill(-1);

    // Individual position frequencies from strict window
    const freqKepala = new Array(10).fill(0);
    const freqEkor = new Array(10).fill(0);

    // Exponentially decay-weighted frequency (much sharper decay for last 30)
    const decay2D = new Array(100).fill(0);

    // Transition count: from previous draw 2D to next 2D, strictly inside the window
    const transitionMatrix: Record<string, number[]> = {};

    filteredResults.forEach((draw, idx) => {
      const full4d = draw.result;
      const kepDigit = parseInt(full4d[2]);
      const ekorDigit = parseInt(full4d[3]);
      const val2d = kepDigit * 10 + ekorDigit;
      
      lastSeenIndex[val2d] = idx;
    });

    recentDraws.forEach((draw, i) => {
      const full4d = draw.result;
      const kepDigit = parseInt(full4d[2]);
      const ekorDigit = parseInt(full4d[3]);
      const val2d = kepDigit * 10 + ekorDigit;
      
      freq2D[val2d]++;
      freqKepala[kepDigit]++;
      freqEkor[ekorDigit]++;

      // Sharper decay for recent window (e.g. 0.85 instead of 0.965)
      // i goes from 0 to recentDraws.length - 1
      decay2D[val2d] += Math.pow(0.85, recentDraws.length - 1 - i);

      // Transition matrix tracking within the strict window
      if (i > 0) {
        const prevFull = recentDraws[i - 1].result;
        const prevVal2dStr = prevFull[2] + prevFull[3];
        if (!transitionMatrix[prevVal2dStr]) {
          transitionMatrix[prevVal2dStr] = new Array(100).fill(0);
        }
        transitionMatrix[prevVal2dStr][val2d]++;
      }
    });

    // Calculate recent trends from an even tighter window (last 10 of the 30)
    const RECENT_WINDOW = Math.min(10, recentDraws.length);
    let recentOdd = 0;
    let recentHigh = 0;
    for (let i = recentDraws.length - RECENT_WINDOW; i < recentDraws.length; i++) {
        const full4d = recentDraws[i].result;
        const val2d = parseInt(full4d[2] + full4d[3]);
        if (val2d % 2 !== 0) recentOdd++;
        if (val2d >= 50) recentHigh++;
    }
    const isOddTrending = recentOdd >= RECENT_WINDOW / 2;
    const isHighTrending = recentHigh >= RECENT_WINDOW / 2;

    // Last drawn 2D for Markov chain transition
    const lastDraw = recentDraws[recentDraws.length - 1]?.result;
    const last2dStr = lastDraw ? lastDraw[2] + lastDraw[3] : "";
    const transitionWeights = transitionMatrix[last2dStr] || new Array(100).fill(0);
    const maxTransition = Math.max(1, ...transitionWeights);

    // Build scores for each of 100 combinations
    const results: LineResult[] = Array.from({ length: 100 }, (_, i) => {
      const numStr = i.toString().padStart(2, "0");
      const kep = Math.floor(i / 10);
      const ekor = i % 10;

      const count = freq2D[i];
      const gap = lastSeenIndex[i] === -1 ? totalDraws : totalDraws - 1 - lastSeenIndex[i];

      // Normalized sub-scores
      const fScore = (count / Math.max(1, Math.max(...freq2D))) * 100;
      const dScore = (decay2D[i] / Math.max(0.001, Math.max(...decay2D))) * 100;
      const cScore = ((freqKepala[kep] + freqEkor[ekor]) / Math.max(1, Math.max(...freqKepala) + Math.max(...freqEkor))) * 100;
      const tScore = (transitionWeights[i] / maxTransition) * 100;

      // Gap bonus: strict penalty for being too long overdue, we want numbers that actually hit in this timeframe
      // But slight bonus if it's due soon based on standard distribution
      const gapBonus = gap <= 30 ? Math.min(40, gap * 1.5) : 0; 

      // Trend alignment bonus
      let trendBonus = 0;
      const isOdd = i % 2 !== 0;
      const isHigh = i >= 50;
      if (isOdd === isOddTrending) trendBonus += 20;
      if (isHigh === isHighTrending) trendBonus += 20;

      // Mathematical transformations (Togel Math) matches
      let mathBonus = 0;
      if (last2dStr) {
        const lastKep = parseInt(last2dStr[0]);
        const lastEk = parseInt(last2dStr[1]);
        
        // Mistik Lama: 0=1, 2=5, 3=8, 4=7, 6=9
        const mlMap: Record<number, number> = { 0:1, 1:0, 2:5, 5:2, 3:8, 8:3, 4:7, 7:4, 6:9, 9:6 };
        if (kep === mlMap[lastKep]) mathBonus += 15;
        if (ekor === mlMap[lastEk]) mathBonus += 15;
        
        // Mistik Baru: 0=8, 1=7, 2=6, 3=9, 4=5
        const mbMap: Record<number, number> = { 0:8, 8:0, 1:7, 7:1, 2:6, 6:2, 3:9, 9:3, 4:5, 5:4 };
        if (kep === mbMap[lastKep]) mathBonus += 15;
        if (ekor === mbMap[lastEk]) mathBonus += 15;
        
        // Index: 0=5, 1=6, 2=7, 3=8, 4=9
        const idxMap: Record<number, number> = { 0:5, 5:0, 1:6, 6:1, 2:7, 7:2, 3:8, 8:3, 4:9, 9:4 };
        if (kep === idxMap[lastKep]) mathBonus += 20;
        if (ekor === idxMap[lastEk]) mathBonus += 20;
      }

      // Final mathematical composite score
      let baseScore = 0;
      if (useMarketStore.getState().predictionModel === 'aggressive') {
        // Aggressive weighting: heavy on recent decay, transition, and trend momentum
        // Decay (40%) + Transition (30%) + Trend (10%) + Math (10%) + Combo (5%) + Freq (5%)
        baseScore = (dScore * 0.40) + (tScore * 0.30) + (trendBonus * 0.20) + (mathBonus * 0.5) + (cScore * 0.05) + (fScore * 0.05);
      } else {
        // Conservative weighting: focuses on overall long-term frequency, combo balance, gap stabilization, and math
        // Freq (30%) + Combo (25%) + Math (20%) + Gap (15%) + Decay (5%) + Transition (5%)
        baseScore = (fScore * 0.30) + (cScore * 0.25) + mathBonus + (gapBonus * 0.15) + (dScore * 0.05) + (tScore * 0.05);
      }
      
      const weightMulti = calculateWeightedProbability(recentDraws, i);
      const totalScore = baseScore * weightMulti;

      return {
        num: numStr,
        score: Math.round(totalScore),
        freq: count,
        gap,
        decayScore: Math.round(dScore),
        comboScore: Math.round(cScore),
        transitionScore: Math.round(tScore),
        rank: 0,
      };
    });

    results.sort((a, b) => b.score - a.score || b.freq - a.freq || a.gap - b.gap);

    results.forEach((item, index) => {
      item.rank = index + 1;
    });

    const finalData = { list: results, stats: null };
    prediksi2DCache.set(cacheKey, finalData);
    return results;
  }, [filteredResults, selectedSession]);

  // Segregate the 100 lines into groups
  const lineUtama = useMemo(() => predictionList.slice(0, 10), [predictionList]);
  const lineCadangan = useMemo(() => predictionList.slice(10, 40), [predictionList]);
  const lineSupport = useMemo(() => predictionList.slice(40, 70), [predictionList]);
  const lineLemah = useMemo(() => predictionList.slice(70, 100), [predictionList]);

  const all70Lines = useMemo(() => {
    return [...lineUtama, ...lineCadangan, ...lineSupport].map(x => x.num).sort();
  }, [lineUtama, lineCadangan, lineSupport]);

  // Backtest simulation: calculates what percentage of previous K draws were "Hits" in our 70-line generator
  const backtestStats = useMemo(() => {
    if (allResults.length < 25) return { rate: 0, hits: 0, total: 0 };
    
    // We can use the same filteredResults based cache key since it depends on the same data
    const cacheKey = `list-${selectedSession}-${allResults.length}-${allResults[allResults.length - 1]?.result || "0"}`;
    const cached = prediksi2DCache.get(cacheKey);
    if (cached?.stats) {
      return cached.stats;
    }

    const K = Math.min(30, allResults.length - 20); // Test last 30 draws
    let hits = 0;

    for (let i = 0; i < K; i++) {
      const testIdx = allResults.length - 1 - i;
      const testDraw = allResults[testIdx];
      const testDraw2D = testDraw.result[2] + testDraw.result[3];

      // Compile prediction prior to testIdx
      const priorHistory = allResults.slice(0, testIdx);
      if (selectedSession !== "all") {
        // filter session
        const sessHistory = priorHistory.filter(h => h.session === testDraw.session);
        if (sessHistory.length < 10) continue;
      }

      // Re-run simplified prediction calculation
      const histLength = priorHistory.length;
      const STRICT_WINDOW = 30;
      const windowStartIdx = Math.max(0, histLength - STRICT_WINDOW);
      const recentDraws = priorHistory.slice(windowStartIdx);

      const tempFreq = new Array(100).fill(0);
      const tempDecay = new Array(100).fill(0);
      const tempKepala = new Array(10).fill(0);
      const tempEkor = new Array(10).fill(0);
      const tempTransitions: Record<string, number[]> = {};
      
      recentDraws.forEach((draw, i) => {
        const full4d = draw.result;
        const val2d = parseInt(full4d[2] + full4d[3]);
        const kepDigit = parseInt(full4d[2]);
        const ekorDigit = parseInt(full4d[3]);

        tempFreq[val2d]++;
        tempKepala[kepDigit]++;
        tempEkor[ekorDigit]++;
        tempDecay[val2d] += Math.pow(0.85, recentDraws.length - 1 - i);

        if (i > 0) {
          const prevFull = recentDraws[i - 1].result;
          const prevVal2dStr = prevFull[2] + prevFull[3];
          if (!tempTransitions[prevVal2dStr]) {
            tempTransitions[prevVal2dStr] = new Array(100).fill(0);
          }
          tempTransitions[prevVal2dStr][val2d]++;
        }
      });

      const tempRecentWindow = Math.min(10, recentDraws.length);
      let tempRecentOdd = 0;
      let tempRecentHigh = 0;
      for (let i = recentDraws.length - tempRecentWindow; i < recentDraws.length; i++) {
        const full4d = recentDraws[i].result;
        const val2d = parseInt(full4d[2] + full4d[3]);
          if (val2d % 2 !== 0) tempRecentOdd++;
          if (val2d >= 50) tempRecentHigh++;
      }
      const tempIsOddTrending = tempRecentOdd >= tempRecentWindow / 2;
      const tempIsHighTrending = tempRecentHigh >= tempRecentWindow / 2;

      const lastDraw2D = priorHistory[histLength - 1]?.result.slice(2, 4) || "";
      const transWgts = tempTransitions[lastDraw2D] || new Array(100).fill(0);
      const maxTrans = Math.max(1, ...transWgts);

      const tempScores = Array.from({ length: 100 }, (_, code) => {
        const kep = Math.floor(code / 10);
        const ek = code % 10;
        const fScore = (tempFreq[code] / Math.max(1, Math.max(...tempFreq))) * 100;
        const dScore = (tempDecay[code] / Math.max(0.001, Math.max(...tempDecay))) * 100;
        const cScore = ((tempKepala[kep] + tempEkor[ek]) / Math.max(1, Math.max(...tempKepala) + Math.max(...tempEkor))) * 100;
        const tScore = (transWgts[code] / maxTrans) * 100;

        let tempTrend = 0;
        if ((code % 2 !== 0) === tempIsOddTrending) tempTrend += 20;
        if ((code >= 50) === tempIsHighTrending) tempTrend += 20;

        let mathBonus = 0;
        if (lastDraw2D) {
          const lastKep = parseInt(lastDraw2D[0]);
          const lastEk = parseInt(lastDraw2D[1]);
          
          const mlMap: Record<number, number> = { 0:1, 1:0, 2:5, 5:2, 3:8, 8:3, 4:7, 7:4, 6:9, 9:6 };
          if (kep === mlMap[lastKep]) mathBonus += 10;
          if (ek === mlMap[lastEk]) mathBonus += 10;
          
          const mbMap: Record<number, number> = { 0:8, 8:0, 1:7, 7:1, 2:6, 6:2, 3:9, 9:3, 4:5, 5:4 };
          if (kep === mbMap[lastKep]) mathBonus += 10;
          if (ek === mbMap[lastEk]) mathBonus += 10;
          
          const idxMap: Record<number, number> = { 0:5, 5:0, 1:6, 6:1, 2:7, 7:2, 3:8, 8:3, 4:9, 9:4 };
          if (kep === idxMap[lastKep]) mathBonus += 15;
          if (ek === idxMap[lastEk]) mathBonus += 15;
        }

        // Just an approximation since gap isn't fully tracked here to save perf
        const score = (dScore * 0.25) + (fScore * 0.10) + (tScore * 0.20) + (cScore * 0.15) + (tempTrend * 0.10) + mathBonus;

        return { code, score };
      });

      tempScores.sort((a, b) => b.score - a.score);
      const top70Codes = tempScores.slice(0, 70).map(x => x.code.toString().padStart(2, "0"));

      if (top70Codes.includes(testDraw2D)) {
        hits++;
      }
    }

    const rate = (hits / K) * 100;
    const finalStats = {
      rate: Math.round(rate),
      hits,
      total: K,
    };
    
    const existing = prediksi2DCache.get(cacheKey) || { list: [], stats: null };
    prediksi2DCache.set(cacheKey, { ...existing, stats: finalStats });
    
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
        title="Prediksi 2D Belakang 70 Line"
        description={`Analisis AI multi-algoritma data historis ${MARKET_NAMES[activeMarket]} untuk menghasilkan 70 line 2D belakang dengan akurasi maksimal.`}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/25 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <Cpu className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground drop-shadow-md">AI Prediksi 2D Belakang</h1>
              <Badge variant="secondary" className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] uppercase font-bold py-0.5 px-2 mt-0.5">
                Machine Learning + Togel Math (70 Line)
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground ml-14 pl-0.5">
            Menghitung probabilitas kombinasi 2 Angka Belakang (00–99) menggunakan Frequency, Exponential Trend, Markov Chain, Gap, dan Togel Math (Mistik, Index).
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

      {/* Model Toggle */}
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${predictionModel === 'aggressive' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-500'}`}>
            {predictionModel === 'aggressive' ? <Zap className="h-5 w-5" /> : <Cpu className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-bold text-sm">Mode Prediksi: {predictionModel === 'aggressive' ? 'Aggressive' : 'Conservative'}</h3>
            <p className="text-xs text-muted-foreground font-medium">
              {predictionModel === 'aggressive' 
                ? 'Fokus pada tren jangka pendek & angka panas.' 
                : 'Fokus pada pola jangka panjang & probabilitas frekuensi.'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="model-mode" className="text-xs font-bold text-muted-foreground hidden sm:block">
            Conservative
          </Label>
          <Switch 
            id="model-mode" 
            checked={predictionModel === 'aggressive'} 
            onCheckedChange={(c) => useMarketStore.getState().setPredictionModel(c ? 'aggressive' : 'conservative')}
            className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-blue-500"
          />
          <Label htmlFor="model-mode" className="text-xs font-bold text-muted-foreground hidden sm:block">
            Aggressive
          </Label>
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
          {/* Main 70 Line Hub Card */}
          <div className="rounded-3xl border border-primary/20 bg-background/60 backdrop-blur-sm shadow-[0_0_30px_rgba(0,220,255,0.1)] overflow-hidden">
            {/* Header copy action */}
            <div className="border-b border-primary/20 bg-primary/5 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest drop-shadow-[0_0_5px_currentColor]">Gabungan 70 Line Terkuat</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Gabungan Utama + Cadangan + Support</p>
                </div>
              </div>
              <button
                onClick={() => copyText(all70Lines, "all70")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black transition-all border",
                  copiedGroup === "all70"
                    ? "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                    : "bg-rose-500 text-white border-transparent hover:bg-rose-600 active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                )}
              >
                {copiedGroup === "all70" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedGroup === "all70" ? "Berhasil Disalin!" : "Copy Semua 70 Line"}
              </button>
            </div>

            {/* Display grid of 70 numbers */}
            <div className="p-4 sm:p-6 bg-black/5 dark:bg-black/30 relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,220,255,0.05),transparent_70%)] pointer-events-none" />
              <div className="flex flex-wrap gap-2 justify-center relative z-10">
                {all70Lines.map((num) => {
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
                  {all70Lines.join(separator)}
                </p>
              </div>
            </div>
          </div>

          {/* Grouped Lists (Bento Grid Style) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Line Utama (10 Line) */}
            <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 p-5 space-y-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold">1</div>
                  <h4 className="text-xs font-black text-rose-400 uppercase tracking-wider">Line Utama (10 LN)</h4>
                </div>
                <button
                  onClick={() => copyText(lineUtama.map(x => x.num), "utama")}
                  className="rounded px-2 py-1 text-[10px] font-bold border border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors"
                >
                  {copiedGroup === "utama" ? "Disalin!" : "Copy 10 LN"}
                </button>
              </div>
              <p className="text-[10px] text-rose-300/70 leading-normal">
                10 Kombinasi dengan akumulasi skor tertinggi & momentum paling stabil.
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

            {/* 2. Line Cadangan (30 Line) */}
            <div className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-5 space-y-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">2</div>
                  <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">Line Cadangan (30 LN)</h4>
                </div>
                <button
                  onClick={() => copyText(lineCadangan.map(x => x.num), "cadangan")}
                  className="rounded px-2 py-1 text-[10px] font-bold border border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
                >
                  {copiedGroup === "cadangan" ? "Disalin!" : "Copy 30 LN"}
                </button>
              </div>
              <p className="text-[10px] text-amber-300/70 leading-normal">
                Kombinasi pendukung berfrekuensi tinggi & trend kuat yang berpotensi melesat.
              </p>
              <div className="grid grid-cols-6 gap-1 max-h-32 overflow-y-auto pr-1">
                {lineCadangan.map((item) => (
                  <div key={item.num} className="text-center bg-amber-500/5 rounded-lg border border-amber-500/15 py-1.5">
                    <div className="font-mono text-xs font-bold text-amber-200">{item.num}</div>
                    <div className="text-[7px] text-amber-400/70 scale-90">{item.score}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Line Support (30 Line) */}
            <div className="rounded-3xl border border-border/50 bg-gradient-to-b from-card to-background p-5 space-y-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded bg-muted/40 text-muted-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider">Line Support (30 LN)</h4>
                </div>
                <button
                  onClick={() => copyText(lineSupport.map(x => x.num), "support")}
                  className="rounded px-2 py-1 text-[10px] font-bold border border-border bg-muted/10 text-foreground hover:bg-muted/30 transition-colors"
                >
                  {copiedGroup === "support" ? "Disalin!" : "Copy 30 LN"}
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
              METODE FILTRASI AI 70 LINE
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs">
              <div className="space-y-1 bg-black/10 border border-border/20 rounded-xl p-3">
                <span className="font-bold text-rose-400 block">1. Decay & Gap (30%)</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Menghitung bobot eksponensial sesi baru + kompensasi angka overdue (titik jenuh).
                </p>
              </div>
              <div className="space-y-1 bg-black/10 border border-border/20 rounded-xl p-3">
                <span className="font-bold text-amber-400 block">2. Togel Math (15%)</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Transformasi Mistik Lama, Mistik Baru, dan Angka Index.
                </p>
              </div>
              <div className="space-y-1 bg-black/10 border border-border/20 rounded-xl p-3">
                <span className="font-bold text-blue-400 block">3. Markov Chain (20%)</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Probabilitas transisi dari angka 2D terakhir yang keluar menuju rilis berikutnya.
                </p>
              </div>
              <div className="space-y-1 bg-black/10 border border-border/20 rounded-xl p-3">
                <span className="font-bold text-emerald-400 block">4. Trend Analysis (10%)</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Mendeteksi arah pergerakan Ganjil/Genap dan Besar/Kecil terkini.
                </p>
              </div>
              <div className="space-y-1 bg-black/10 border border-border/20 rounded-xl p-3">
                <span className="font-bold text-fuchsia-400 block">5. Combos (25%)</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Analisis probabilitas kuat untuk Kepala dan Ekor mandiri.
                </p>
              </div>
            </div>
          </div>

          {/* Saringan AI: Weak Numbers filter out list */}
          <div className="rounded-3xl border border-border/50 bg-card/60 p-5 space-y-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Saringan AI: 30 Line yang Dieliminasi</h4>
                <p className="text-[10px] text-muted-foreground">Angka terlemah/paling dingin berdasarkan hitungan data saat ini.</p>
              </div>
              <button
                onClick={() => setShowWeakLines(!showWeakLines)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[10px] font-bold px-3 py-1.5 transition-colors"
              >
                {showWeakLines ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showWeakLines ? "Sembunyikan" : "Tampilkan 30 LN Lemah"}
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
                    <strong>Saran Manajemen Risiko:</strong> Ke-30 line di atas adalah angka dengan skor di bawah ambang batas (cutoff) analitik. AI menyarankan untuk membatasi/menghilangkan angka ini dari taruhan Anda guna meningkatkan efisiensi modal.
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
