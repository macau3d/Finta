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
  Sparkles, AlertCircle, RefreshCw, ChevronRight, Clock, HelpCircle, Hash
} from "lucide-react";

function getDasarValue(kepala: number, ekor: number) {
  let sum = kepala + ekor;
  if (sum > 9) {
    sum = Math.floor(sum / 10) + (sum % 10);
  }
  return sum;
}

export default function PrediksiDasarPage() {
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

  // Calculate Dasar Probabilities
  const analysis = useMemo(() => {
    if (!result || result.positions.length < 4) return null;

    let totalScore = 0;
    
    let ganjilScore = 0;
    let genapScore = 0;
    let besarScore = 0;
    let kecilScore = 0;

    const valueScores = new Array(10).fill(0);

    for (let kepala = 0; kepala <= 9; kepala++) {
      for (let ekor = 0; ekor <= 9; ekor++) {
        const dasarVal = getDasarValue(kepala, ekor);
        
        const scoreK = result.positions[2].weightedVoteMap[kepala];
        const scoreE = result.positions[3].weightedVoteMap[ekor];
        const jointScore = scoreK * scoreE;
        
        valueScores[dasarVal] += jointScore;
        totalScore += jointScore;

        if (dasarVal % 2 === 0) genapScore += jointScore;
        else ganjilScore += jointScore;

        if (dasarVal >= 5) besarScore += jointScore;
        else kecilScore += jointScore;
      }
    }

    const isGanjilWin = ganjilScore > genapScore;
    const ganjilProb = isGanjilWin ? 99.9 : 0.1;
    const genapProb = isGanjilWin ? 0.1 : 99.9;

    const isBesarWin = besarScore > kecilScore;
    const besarProb = isBesarWin ? 99.9 : 0.1;
    const kecilProb = isBesarWin ? 0.1 : 99.9;

    return {
      ganjilGenap: {
        ganjil: ganjilProb,
        genap: genapProb,
        prediction: ganjilProb > genapProb ? "GANJIL" : "GENAP"
      },
      besarKecil: {
        besar: besarProb,
        kecil: kecilProb,
        prediction: besarProb > kecilProb ? "BESAR" : "KECIL"
      },
      values: valueScores.map((score, val) => ({
        val,
        percentage: (score / totalScore) * 100
      })).sort((a, b) => b.percentage - a.percentage)
    };
  }, [result]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6 md:pb-6">
      <PageSeo title={`Prediksi Dasar - ${MARKET_NAMES[activeMarket]}`} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Hash className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black text-foreground font-display tracking-tight">Prediksi Dasar</h1>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary uppercase shadow-[0_0_10px_rgba(var(--primary),0.2)]">AI Analisis</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl">
            Menebak kombinasi Ganjil/Genap dan Besar/Kecil dari penjumlahan angka 2D Belakang (Kepala + Ekor).
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
          Cara Bermain Prediksi Dasar
        </div>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>Pedoman:</strong> Menggunakan angka 2D Belakang (Kepala dan Ekor).</li>
          <li><strong>Penjumlahan:</strong> Kepala + Ekor. Jika hasil &gt; 9, maka kedua digit dijumlahkan kembali (contoh: 7+8=15 &rarr; 1+5=6).</li>
          <li><strong>Kecil:</strong> Angka 0, 1, 2, 3, 4.</li>
          <li><strong>Besar:</strong> Angka 5, 6, 7, 8, 9.</li>
          <li><strong>Ganjil:</strong> Angka 1, 3, 5, 7, 9.</li>
          <li><strong>Genap:</strong> Angka 0, 2, 4, 6, 8.</li>
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
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Ganjil Genap */}
          <div className="relative rounded-[2rem] glass-card p-6 border-t border-black/5 dark:border-white/5 overflow-hidden group hover:border-primary/30 transition-all">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Ganjil / Genap</div>
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-sm font-bold text-muted-foreground mb-2 uppercase">Prediksi</div>
              <div className={cn(
                "text-5xl font-black font-display tracking-tight mb-6 drop-shadow-md",
                analysis.ganjilGenap.prediction === "GANJIL" ? "text-purple-500" : "text-blue-500"
              )}>
                {analysis.ganjilGenap.prediction}
              </div>
              <div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-3 mb-3 overflow-hidden flex shadow-inner">
                <div className="bg-purple-500 h-full transition-all duration-1000" style={{ width: `${analysis.ganjilGenap.ganjil}%` }}></div>
                <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${analysis.ganjilGenap.genap}%` }}></div>
              </div>
              <div className="w-full flex justify-between text-[11px] font-bold text-muted-foreground uppercase">
                <span className={analysis.ganjilGenap.prediction === "GANJIL" ? "text-purple-500" : ""}>Ganjil {analysis.ganjilGenap.ganjil.toFixed(1)}%</span>
                <span className={analysis.ganjilGenap.prediction === "GENAP" ? "text-blue-500" : ""}>Genap {analysis.ganjilGenap.genap.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Besar Kecil */}
          <div className="relative rounded-[2rem] glass-card p-6 border-t border-black/5 dark:border-white/5 overflow-hidden group hover:border-primary/30 transition-all">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">Besar / Kecil</div>
            <div className="flex flex-col items-center text-center py-6">
              <div className="text-sm font-bold text-muted-foreground mb-2 uppercase">Prediksi</div>
              <div className={cn(
                "text-5xl font-black font-display tracking-tight mb-6 drop-shadow-md",
                analysis.besarKecil.prediction === "BESAR" ? "text-orange-500" : "text-emerald-500"
              )}>
                {analysis.besarKecil.prediction}
              </div>
              <div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-3 mb-3 overflow-hidden flex shadow-inner">
                <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${analysis.besarKecil.kecil}%` }}></div>
                <div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: `${analysis.besarKecil.besar}%` }}></div>
              </div>
              <div className="w-full flex justify-between text-[11px] font-bold text-muted-foreground uppercase">
                <span className={analysis.besarKecil.prediction === "KECIL" ? "text-emerald-500" : ""}>Kecil {analysis.besarKecil.kecil.toFixed(1)}%</span>
                <span className={analysis.besarKecil.prediction === "BESAR" ? "text-orange-500" : ""}>Besar {analysis.besarKecil.besar.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          
          {/* Angka Dasar (0-9) Probabilities */}
          <div className="md:col-span-2 rounded-[2rem] glass-card p-6">
             <div className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
               <Hash className="h-4 w-4" />
               Peluang Nilai Dasar (0-9)
             </div>
             
             <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {analysis.values.map((v, idx) => (
                  <div key={v.val} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 relative overflow-hidden">
                    {idx === 0 && <div className="absolute top-0 w-full h-1 bg-primary"></div>}
                    <div className="text-2xl font-black font-mono mb-1">{v.val}</div>
                    <div className={cn(
                      "text-xs font-bold",
                      idx === 0 ? "text-primary" : "text-muted-foreground"
                    )}>
                      {v.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
             </div>
             
             <div className="mt-8 text-center">
               <Button asChild className="w-full max-w-sm h-14 rounded-2xl font-black text-sm uppercase tracking-wide gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-xl">
                 <Link href="/prediksi-ai">
                   Lihat Full Analisa 4D
                   <ChevronRight className="h-4 w-4" />
                 </Link>
               </Button>
             </div>
          </div>

        </div>
      )}
    </div>
  );
}
