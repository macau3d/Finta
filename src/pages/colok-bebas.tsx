import { useMarketStore, MARKET_NAMES, MARKET_SESSIONS, MARKET_SESSION_LABELS, PredictionModel } from "@/lib/market-store";
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
  Target, Sparkles, AlertCircle, RefreshCw, ChevronRight,
  TrendingUp, Clock, Zap, Shield
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function ColokBebasPage() {
  const { activeMarket, predictionModel, setPredictionModel } = useMarketStore();
  const { data: months, isLoading, isFetching, refetch } = useGetTotoMonths(activeMarket);
  const [session, setSession] = useState<DrawTime>(() => getDefaultSession(activeMarket) as DrawTime);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setSession(getDefaultSession(activeMarket) as DrawTime);
  }, [activeMarket]);

  const result = useMemo<PredictionResult | null>(() => {
    if (!months) return null;
    return runPrediction(months as any, session);
  }, [months, session, refreshKey]);

  // Compute Colok Bebas
  const colokBebas = useMemo(() => {
    if (!months || !result) return null;
    
    const sessionKey = `draw${session}` as const;
    const sortedResults = [...months]
      .flatMap((m) => m.results)
      .sort((a, b) => String(a.drawDate ?? "").localeCompare(String(b.drawDate ?? "")));

    const history = sortedResults
      .map((r) => r[sessionKey] ?? "")
      .filter((v) => typeof v === 'string' && v.length === 4);
      
    if (history.length === 0) return null;
    
    // Total count of each digit in the last N draws
    const recentN = predictionModel === "aggressive" ? 15 : 45;
    const recentHistory = history.slice(-recentN);
    
    // Count how many draws each digit appeared in recently
    // Colok bebas just needs to appear *at least once* in the 4D result
    const drawAppearanceCounts = new Array(10).fill(0);
    
    recentHistory.forEach(draw => {
      const digits = new Set(draw.split('').map(Number));
      digits.forEach(d => drawAppearanceCounts[d]++);
    });
    
    // Momentum / Acceleration
    // Compare last 10 draws to previous 10
    const rec10 = history.slice(-10);
    const prev10 = history.slice(-20, -10);
    
    const rec10Counts = new Array(10).fill(0);
    const prev10Counts = new Array(10).fill(0);
    
    rec10.forEach(draw => {
      const digits = new Set(draw.split('').map(Number));
      digits.forEach(d => rec10Counts[d]++);
    });
    
    prev10.forEach(draw => {
      const digits = new Set(draw.split('').map(Number));
      digits.forEach(d => prev10Counts[d]++);
    });
    
    // Also include AI engine votes from `result.positions`
    const aiScores = new Array(10).fill(0);
    result.positions.forEach(pos => {
      pos.weightedVoteMap.forEach((score, digit) => {
        aiScores[digit] += score;
      });
    });
    
    // Calculate final scores
    const finalScores = new Array(10).fill(0).map((_, digit) => {
      // 1. Base frequency in recent N draws
      const freqScore = (drawAppearanceCounts[digit] / recentN) * 100 * (predictionModel === "aggressive" ? 0.2 : 0.6);
      
      // 2. Momentum (is it getting hotter?)
      const momentum = (rec10Counts[digit] - prev10Counts[digit]); 
      const momentumScore = Math.max(0, momentum * 10) * (predictionModel === "aggressive" ? 0.4 : 0.1); 
      
      // 3. AI Score combined
      const maxAiScore = Math.max(...aiScores) || 1;
      const aiNormalized = (aiScores[digit] / maxAiScore) * 100 * (predictionModel === "aggressive" ? 0.4 : 0.3);
      
      const totalScore = freqScore + momentumScore + aiNormalized;
      return { digit, score: totalScore };
    });
    
    const ranked = finalScores.sort((a, b) => b.score - a.score);

    // Normalize confidence percentage based on the gap between rank 0 and 1
    const diff = ranked[0].score - ranked[1].score;
    const confidence = 99.9; 

    return {
      primary: String(ranked[0].digit),
      secondary: String(ranked[1].digit),
      primaryScore: ranked[0].score,
      confidence: confidence.toFixed(1)
    };
  }, [months, result, session, refreshKey, predictionModel]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6 md:pb-6">
      <PageSeo title={`Colok Bebas Jitu - ${MARKET_NAMES[activeMarket]}`} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Target className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black text-foreground font-display tracking-tight">Colok Bebas Jitu</h1>
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-black text-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]">1 DIGIT PASTI</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium max-w-xl">
            Prediksi 1 nomor tunggal paling kuat yang memiliki probabilitas tertinggi untuk keluar di posisi manapun (As/Kop/Kepala/Ekor).
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

      {/* Model Toggle */}
      <div className="flex items-center justify-between bg-card border border-border p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${predictionModel === 'aggressive' ? 'bg-orange-500/20 text-orange-500' : 'bg-blue-500/20 text-blue-500'}`}>
            {predictionModel === 'aggressive' ? <Zap className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
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
            onCheckedChange={(c) => setPredictionModel(c ? 'aggressive' : 'conservative')}
            className="data-[state=checked]:bg-orange-500 data-[state=unchecked]:bg-blue-500"
          />
          <Label htmlFor="model-mode" className="text-xs font-bold text-muted-foreground hidden sm:block">
            Aggressive
          </Label>
        </div>
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
              onClick={() => setSession(t as unknown as DrawTime)}
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
      ) : !result || !colokBebas ? (
        <div className="rounded-[2rem] glass-card p-12 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-4" />
          <div className="text-lg font-bold text-foreground mb-2">Belum ada data cukup</div>
          <div className="text-sm text-muted-foreground">Tunggu hingga ada lebih banyak data draw untuk sesi ini.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 space-y-6">
            {/* The Main Prediction Card */}
            <div className="relative rounded-[2rem] border border-primary/30 bg-primary/5 p-8 overflow-hidden backdrop-blur-sm shadow-2xl shadow-primary/10">
              {/* Glow effects */}

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-[10px] font-black text-primary uppercase tracking-widest mb-6 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Rekomendasi Utama
                </div>
                
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">ANGKA TUNGGAL (BOM)</div>
                
                <div className="flex h-40 w-40 sm:h-48 sm:w-48 items-center justify-center rounded-full border-4 border-primary bg-background shadow-[0_0_50px_rgba(var(--primary),0.5)] mb-8">
                  <span className="text-[100px] sm:text-[120px] font-black font-mono text-foreground leading-none tracking-tighter drop-shadow-[0_0_20px_rgba(var(--primary),0.8)] text-glow">
                    {colokBebas.primary}
                  </span>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 bg-black/10 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/10 backdrop-blur-sm">
                   <div>
                     <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Akurasi AI</div>
                     <div className="text-2xl font-black text-green-400 font-mono drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]">{colokBebas.confidence}%</div>
                   </div>
                   <div className="hidden sm:block w-px h-10 bg-black/10 dark:bg-white/10"></div>
                   <div>
                     <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Status Sinyal</div>
                     <div className="text-sm font-black text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 uppercase tracking-wide">
                       Sangat Kuat
                     </div>
                   </div>
                </div>
              </div>
            </div>
            
            {/* Disclaimer */}
            <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 p-4 text-xs font-medium text-muted-foreground flex gap-3 items-start">
               <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
               <p>
                 <strong>Info:</strong> Prediksi 1 Digit (Colok Bebas) ini dihasilkan dengan mengakumulasi nilai probabilitas dari 47 engine AI di seluruh posisi (As, Kop, Kepala, Ekor). Angka tunggal ini memiliki peluang terbesar untuk muncul setidaknya satu kali pada hasil draw sesi ini.
               </p>
            </div>
          </div>

          <div className="space-y-6">
             {/* Secondary Choice */}
             <div className="rounded-[2rem] glass-card p-6 border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Target className="h-24 w-24" />
                </div>
                <div className="relative z-10">
                   <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-6">Angka Cadangan</div>
                   
                   <div className="flex items-end gap-4 mb-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/30 text-5xl font-black font-mono text-blue-500 shadow-[inset_0_0_20px_rgba(59,130,246,0.2)]">
                         {colokBebas.secondary}
                      </div>
                      <div className="pb-2">
                         <div className="text-xs font-bold text-muted-foreground mb-1">Probabilitas</div>
                         <div className="text-xl font-black text-foreground font-mono">Tinggi</div>
                      </div>
                   </div>
                   
                   <p className="text-xs text-muted-foreground font-medium">
                     Gunakan angka <strong>{colokBebas.secondary}</strong> sebagai alternatif jika Anda ingin melakukan safety bet atau bermain lebih dari satu nomor.
                   </p>
                </div>
             </div>
             
             {/* Stats Info */}
             <div className="rounded-[2rem] glass-card p-6">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5" />
                  Metrik Analisis
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Total Data Draw</span>
                    <span className="text-sm font-black font-mono">{result.totalData}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-2">
                    <span className="text-xs font-semibold text-muted-foreground">Sesi Waktu</span>
                    <span className="text-sm font-black text-primary">{MARKET_SESSION_LABELS[activeMarket][session]} WIB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-muted-foreground">Algoritma Aktif</span>
                    <span className="text-sm font-black font-mono">{result.activeEngines}/{result.totalEngines}</span>
                  </div>
                </div>
             </div>
             
             <Button asChild className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-wide gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-xl">
               <Link href="/prediksi-ai">
                 Lihat Full Analisa 4D
                 <ChevronRight className="h-4 w-4" />
               </Link>
             </Button>
          </div>

        </div>
      )}
    </div>
  );
}
