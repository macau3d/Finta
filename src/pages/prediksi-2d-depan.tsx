import { useMarketStore, MARKET_NAMES, MARKET_SESSIONS, MARKET_SESSION_LABELS } from "@/lib/market-store";
import { motion } from "motion/react";
import { useGetTotoMonths } from "@workspace/api-client-react";
import { PageSeo } from "@/components/page-seo";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/page-skeleton";
import { cn, getDefaultSession } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import {
  Copy, Check, Sparkles, Cpu, Layers2, HelpCircle,
  AlertTriangle, Eye, EyeOff
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

const prediksi2DDepanCache = new Map<string, { list: LineResult[], stats: any }>();

export default function Prediksi2DDepanPage() {
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
    return list.sort((a, b) => a.drawDate.localeCompare(b.drawDate));
  }, [months]);

  const filteredResults = useMemo(() => {
    if (selectedSession === "all") return allResults;
    return allResults.filter((r) => r.session === selectedSession);
  }, [allResults, selectedSession]);

  const predictionList = useMemo<LineResult[]>(() => {
    if (filteredResults.length === 0) return [];
    
    const cacheKey = `list-depan-${selectedSession}-${filteredResults.length}-${filteredResults[filteredResults.length - 1]?.result || "0"}`;
    if (prediksi2DDepanCache.has(cacheKey)) {
      return prediksi2DDepanCache.get(cacheKey)!.list;
    }

    const totalDraws = filteredResults.length;
    const freq2D = new Array(100).fill(0);
    const lastSeenIndex = new Array(100).fill(-1);
    const freqAs = new Array(10).fill(0);
    const freqKop = new Array(10).fill(0);
    const decay2D = new Array(100).fill(0);
    const transitionMatrix: Record<string, number[]> = {};

    filteredResults.forEach((draw, idx) => {
      const full4d = draw.result;
      const asDigit = parseInt(full4d[0]);
      const kopDigit = parseInt(full4d[1]);
      const val2d = asDigit * 10 + kopDigit;

      freq2D[val2d]++;
      lastSeenIndex[val2d] = idx;
      freqAs[asDigit]++;
      freqKop[kopDigit]++;

      decay2D[val2d] += Math.pow(0.965, totalDraws - 1 - idx);

      if (idx > 0) {
        const prevFull = filteredResults[idx - 1].result;
        const prevVal2dStr = prevFull[0] + prevFull[1];
        if (!transitionMatrix[prevVal2dStr]) {
          transitionMatrix[prevVal2dStr] = new Array(100).fill(0);
        }
        transitionMatrix[prevVal2dStr][val2d]++;
      }
    });

    const RECENT_WINDOW = Math.min(10, totalDraws);
    let recentOdd = 0;
    let recentHigh = 0;
    for (let i = totalDraws - RECENT_WINDOW; i < totalDraws; i++) {
        const full4d = filteredResults[i].result;
        const val2d = parseInt(full4d[0] + full4d[1]);
        if (val2d % 2 !== 0) recentOdd++;
        if (val2d >= 50) recentHigh++;
    }
    const isOddTrending = recentOdd >= RECENT_WINDOW / 2;
    const isHighTrending = recentHigh >= RECENT_WINDOW / 2;

    const lastDraw = filteredResults[filteredResults.length - 1]?.result;
    const last2dStr = lastDraw ? lastDraw[0] + lastDraw[1] : "";
    const transitionWeights = transitionMatrix[last2dStr] || new Array(100).fill(0);
    const maxTransition = Math.max(1, ...transitionWeights);

    const results: LineResult[] = Array.from({ length: 100 }, (_, i) => {
      const numStr = i.toString().padStart(2, "0");
      const asD = Math.floor(i / 10);
      const kopD = i % 10;
      const count = freq2D[i];
      const gap = lastSeenIndex[i] === -1 ? totalDraws : totalDraws - 1 - lastSeenIndex[i];

      const fScore = (count / Math.max(1, Math.max(...freq2D))) * 100;
      const dScore = (decay2D[i] / Math.max(0.001, Math.max(...decay2D))) * 100;
      const cScore = ((freqAs[asD] + freqKop[kopD]) / Math.max(1, Math.max(...freqAs) + Math.max(...freqKop))) * 100;
      const tScore = (transitionWeights[i] / maxTransition) * 100;

      const gapBonus = Math.min(60, gap * 2);

      let trendBonus = 0;
      const isOdd = i % 2 !== 0;
      const isHigh = i >= 50;
      if (isOdd === isOddTrending) trendBonus += 20;
      if (isHigh === isHighTrending) trendBonus += 20;

      let mathBonus = 0;
      if (last2dStr) {
        const lastAs = parseInt(last2dStr[0]);
        const lastKop = parseInt(last2dStr[1]);
        
        const mlMap: Record<number, number> = { 0:1, 1:0, 2:5, 5:2, 3:8, 8:3, 4:7, 7:4, 6:9, 9:6 };
        if (asD === mlMap[lastAs]) mathBonus += 10;
        if (kopD === mlMap[lastKop]) mathBonus += 10;
        
        const mbMap: Record<number, number> = { 0:8, 8:0, 1:7, 7:1, 2:6, 6:2, 3:9, 9:3, 4:5, 5:4 };
        if (asD === mbMap[lastAs]) mathBonus += 10;
        if (kopD === mbMap[lastKop]) mathBonus += 10;
        
        const idxMap: Record<number, number> = { 0:5, 5:0, 1:6, 6:1, 2:7, 7:2, 3:8, 8:3, 4:9, 9:4 };
        if (asD === idxMap[lastAs]) mathBonus += 15;
        if (kopD === idxMap[lastKop]) mathBonus += 15;
      }

      const totalScore = (dScore * 0.25) + (fScore * 0.10) + (tScore * 0.20) + (cScore * 0.15) + (gapBonus * 0.05) + (trendBonus * 0.10) + mathBonus;

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
    results.forEach((item, index) => { item.rank = index + 1; });

    const existing = prediksi2DDepanCache.get(cacheKey) || { list: [], stats: null };
    prediksi2DDepanCache.set(cacheKey, { ...existing, list: results });
    
    return results;
  }, [filteredResults, selectedSession]);

  const lineUtama = useMemo(() => predictionList.slice(0, 20), [predictionList]);
  const lineCadangan = useMemo(() => predictionList.slice(20, 50), [predictionList]);
  const lineSupport = useMemo(() => predictionList.slice(50, 80), [predictionList]);
  const lineLemah = useMemo(() => predictionList.slice(80, 100), [predictionList]);

  const all80Lines = useMemo(() => {
    return [...lineUtama, ...lineCadangan, ...lineSupport].map(x => x.num).sort();
  }, [lineUtama, lineCadangan, lineSupport]);

  // Detailed Analysis based on the 80 lines (As & Kop)
  const analysisStats = useMemo(() => {
    if (all80Lines.length === 0) return null;
    let asGanjil = 0, asGenap = 0, asBesar = 0, asKecil = 0;
    let kopGanjil = 0, kopGenap = 0, kopBesar = 0, kopKecil = 0;
    let kembar = 0;
    let jumlahBesar = 0, jumlahKecil = 0;
    let jumlahGanjil = 0, jumlahGenap = 0;

    all80Lines.forEach(numStr => {
      const as = parseInt(numStr[0]);
      const kop = parseInt(numStr[1]);
      
      if (as % 2 !== 0) asGanjil++; else asGenap++;
      if (as >= 5) asBesar++; else asKecil++;
      
      if (kop % 2 !== 0) kopGanjil++; else kopGenap++;
      if (kop >= 5) kopBesar++; else kopKecil++;

      if (as === kop) kembar++;

      const sum = as + kop;
      if (sum >= 10) jumlahBesar++; else jumlahKecil++;
      if (sum % 2 !== 0) jumlahGanjil++; else jumlahGenap++;
    });

    const total = 80;
    return {
      as: {
        ganjil: (asGanjil / total) * 100,
        genap: (asGenap / total) * 100,
        besar: (asBesar / total) * 100,
        kecil: (asKecil / total) * 100,
      },
      kop: {
        ganjil: (kopGanjil / total) * 100,
        genap: (kopGenap / total) * 100,
        besar: (kopBesar / total) * 100,
        kecil: (kopKecil / total) * 100,
      },
      kembar: (kembar / total) * 100,
      jumlah: {
        besar: (jumlahBesar / total) * 100,
        kecil: (jumlahKecil / total) * 100,
        ganjil: (jumlahGanjil / total) * 100,
        genap: (jumlahGenap / total) * 100,
      }
    };
  }, [all80Lines]);

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
        title="Prediksi AI 2D Depan"
        description={`Analisis AI multi-algoritma data historis ${MARKET_NAMES[activeMarket]} untuk 80 line 2D Depan (As & Kop).`}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 border border-primary/25 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground drop-shadow-md">AI Prediksi 2D Depan (As & Kop)</h1>
              <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold py-0.5 px-2 mt-0.5">
                80 Line Akurasi Tinggi
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground ml-14 pl-0.5">
            Menghitung probabilitas 2 Angka Depan (As & Kop) menggunakan AI terpadu untuk {MARKET_NAMES[activeMarket]}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest block">
              PILIH SESI DRAW
            </span>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
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
                    ? "bg-primary/15 text-primary border-primary/40 shadow-sm"
                    : "bg-black/5 dark:bg-white/5 text-muted-foreground border-transparent hover:text-foreground hover:bg-black/10 dark:hover:bg-white/10"
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
          
          {/* Detailed Analysis Card */}
          {analysisStats && (
            <div className="rounded-3xl border border-primary/20 bg-background/60 backdrop-blur-sm p-6 space-y-5 shadow-sm">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                Analisa Detail Prediksi As & Kop (Berdasarkan 80 Line)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <div className="space-y-3 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/10 dark:border-white/10">
                  <h4 className="text-xs font-bold text-foreground border-b border-black/10 dark:border-white/10 pb-2">Analisa AS (Ribuan)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span>Ganjil:</span> <span className="font-mono text-primary font-bold">{analysisStats.as.ganjil.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-xs"><span>Genap:</span> <span className="font-mono text-primary font-bold">{analysisStats.as.genap.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-xs"><span>Besar (5-9):</span> <span className="font-mono text-primary font-bold">{analysisStats.as.besar.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-xs"><span>Kecil (0-4):</span> <span className="font-mono text-primary font-bold">{analysisStats.as.kecil.toFixed(1)}%</span></div>
                  </div>
                </div>

                <div className="space-y-3 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/10 dark:border-white/10">
                  <h4 className="text-xs font-bold text-foreground border-b border-black/10 dark:border-white/10 pb-2">Analisa KOP (Ratusan)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span>Ganjil:</span> <span className="font-mono text-blue-500 dark:text-blue-400 font-bold">{analysisStats.kop.ganjil.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-xs"><span>Genap:</span> <span className="font-mono text-blue-500 dark:text-blue-400 font-bold">{analysisStats.kop.genap.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-xs"><span>Besar (5-9):</span> <span className="font-mono text-blue-500 dark:text-blue-400 font-bold">{analysisStats.kop.besar.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-xs"><span>Kecil (0-4):</span> <span className="font-mono text-blue-500 dark:text-blue-400 font-bold">{analysisStats.kop.kecil.toFixed(1)}%</span></div>
                  </div>
                </div>

                <div className="space-y-3 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/10 dark:border-white/10">
                  <h4 className="text-xs font-bold text-foreground border-b border-black/10 dark:border-white/10 pb-2">Jumlah & Kembar</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span>Peluang Kembar:</span> <span className="font-mono text-amber-500 dark:text-amber-400 font-bold">{analysisStats.kembar.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-xs mt-2 text-muted-foreground"><span className="uppercase text-[10px] font-bold">Total As+Kop</span></div>
                    <div className="flex justify-between text-xs"><span>Jumlah Besar (&ge;10):</span> <span className="font-mono text-rose-500 dark:text-rose-400 font-bold">{analysisStats.jumlah.besar.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-xs"><span>Jumlah Kecil (&lt;10):</span> <span className="font-mono text-rose-500 dark:text-rose-400 font-bold">{analysisStats.jumlah.kecil.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-xs"><span>Jumlah Ganjil:</span> <span className="font-mono text-rose-500 dark:text-rose-400 font-bold">{analysisStats.jumlah.ganjil.toFixed(1)}%</span></div>
                    <div className="flex justify-between text-xs"><span>Jumlah Genap:</span> <span className="font-mono text-rose-500 dark:text-rose-400 font-bold">{analysisStats.jumlah.genap.toFixed(1)}%</span></div>
                  </div>
                </div>

              </div>
            </div>
          )}

          <div className="rounded-3xl border border-primary/20 bg-background/60 backdrop-blur-sm shadow-[0_0_30px_rgba(var(--primary),0.1)] overflow-hidden">
            <div className="border-b border-primary/20 bg-primary/5 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers2 className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                <div>
                  <h3 className="text-sm font-black text-foreground uppercase tracking-widest drop-shadow-[0_0_5px_currentColor]">Gabungan 80 Line 2D Depan</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Line Utama + Cadangan + Support</p>
                </div>
              </div>
              <button
                onClick={() => copyText(all80Lines, "all80")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-black transition-all border",
                  copiedGroup === "all80"
                    ? "bg-green-500/10 text-green-500 dark:text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                    : "bg-primary text-primary-foreground border-transparent hover:brightness-110 active:scale-95 shadow-[0_0_15px_rgba(var(--primary),0.4)]"
                )}
              >
                {copiedGroup === "all80" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedGroup === "all80" ? "Berhasil Disalin!" : "Copy Semua 80 Line"}
              </button>
            </div>

            <div className="p-4 sm:p-6 bg-black/5 dark:bg-black/5 dark:bg-black/30 relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--primary),0.05),transparent_70%)] pointer-events-none" />
              <div className="flex flex-wrap gap-2 justify-center relative z-10">
                {all80Lines.map((num) => {
                  const details = predictionList.find(x => x.num === num);
                  const isUtama = lineUtama.some(x => x.num === num);
                  const isCadangan = lineCadangan.some(x => x.num === num);

                  return (
                    <div
                      key={num}
                      className={cn(
                        "relative flex flex-col items-center justify-center h-14 w-12 rounded-xl border transition-all cursor-help group shadow-inner overflow-hidden",
                        isUtama
                          ? "bg-primary/20 border-primary/50 text-primary shadow-[inset_0_0_15px_rgba(var(--primary),0.2),0_0_10px_rgba(var(--primary),0.2)]"
                          : isCadangan
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-500 dark:text-blue-300 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]"
                          : "bg-black/5 dark:bg-black/5 dark:bg-black/40 border-black/10 dark:border-white/10 text-foreground"
                      )}
                      title={`Kombinasi ${num} - Skor Akurasi: ${details?.score}% (Rank #${details?.rank})`}
                    >
                      <span className="font-mono text-lg font-black tracking-tighter mb-1.5">{num}</span>
                      <div className="absolute bottom-1.5 left-0 right-0 px-1.5 flex items-center justify-between gap-0.5 opacity-90">
                        <div className="flex-1 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", isUtama ? "bg-primary" : isCadangan ? "bg-blue-500" : "bg-muted-foreground/50")} style={{ width: `${details?.score}%` }} />
                        </div>
                        <span className="text-[6px] font-black tracking-tighter text-muted-foreground leading-none">{details?.score}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 rounded-3xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/5 dark:bg-black/60 p-5 relative z-10 backdrop-blur-sm">
                <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground block mb-2">
                  Format Teks Cepat (Bintang)
                </span>
                <p className="font-mono text-[12px] text-primary/80 break-all leading-relaxed max-h-20 overflow-y-auto scrollbar-none select-all drop-shadow-[0_0_5px_currentColor]">
                  {all80Lines.join(separator)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 space-y-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</div>
                  <h4 className="text-xs font-black text-primary uppercase tracking-wider">Line Utama (20 LN)</h4>
                </div>
                <button
                  onClick={() => copyText(lineUtama.map(x => x.num), "utama")}
                  className="rounded px-2 py-1 text-[10px] font-bold border border-primary/35 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {copiedGroup === "utama" ? "Disalin!" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] text-primary/70 leading-normal">
                20 Kombinasi skor paling tinggi.
              </p>
              <div className="grid grid-cols-5 gap-1.5 max-h-40 overflow-y-auto">
                {lineUtama.map((item) => (
                  <div key={item.num} className="text-center bg-primary/10 rounded-lg border border-primary/20 py-1.5">
                    <div className="font-mono text-sm font-black text-primary">{item.num}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-500/25 bg-blue-500/5 p-5 space-y-4 shadow-sm backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded bg-blue-500/20 text-blue-500 dark:text-blue-400 flex items-center justify-center text-xs font-bold">2</div>
                  <h4 className="text-xs font-black text-blue-500 dark:text-blue-400 uppercase tracking-wider">Line Cadangan (30 LN)</h4>
                </div>
                <button
                  onClick={() => copyText(lineCadangan.map(x => x.num), "cadangan")}
                  className="rounded px-2 py-1 text-[10px] font-bold border border-blue-500/25 bg-blue-500/10 text-blue-500 dark:text-blue-300 hover:bg-blue-500/20 transition-colors"
                >
                  {copiedGroup === "cadangan" ? "Disalin!" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] text-blue-500/70 dark:text-blue-300/70 leading-normal">
                Kombinasi probabilitas kuat menengah.
              </p>
              <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto pr-1">
                {lineCadangan.map((item) => (
                  <div key={item.num} className="text-center bg-blue-500/5 rounded-lg border border-blue-500/15 py-1.5">
                    <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-200">{item.num}</div>
                  </div>
                ))}
              </div>
            </div>

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
                  {copiedGroup === "support" ? "Disalin!" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-normal">
                Kombinasi support/overdue.
              </p>
              <div className="grid grid-cols-6 gap-1 max-h-40 overflow-y-auto pr-1">
                {lineSupport.map((item) => (
                  <div key={item.num} className="text-center bg-muted/10 rounded-lg border border-border/40 py-1.5">
                    <div className="font-mono text-xs font-bold text-muted-foreground">{item.num}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/50 bg-card/60 p-5 space-y-4 shadow-sm backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Saringan AI: 20 Line yang Dieliminasi</h4>
                <p className="text-[10px] text-muted-foreground">Angka 2D Depan yang paling lemah berdasarkan AI.</p>
              </div>
              <button
                onClick={() => setShowWeakLines(!showWeakLines)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[10px] font-bold px-3 py-1.5 transition-colors"
              >
                {showWeakLines ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showWeakLines ? "Sembunyikan" : "Tampilkan 20 LN Lemah"}
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
