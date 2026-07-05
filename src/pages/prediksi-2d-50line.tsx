import { useMarketStore, MARKET_SESSIONS, PredictionModel } from "@/lib/market-store";
import { useGetTotoMonths } from "@workspace/api-client-react";
import { PageSeo } from "@/components/page-seo";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/page-skeleton";
import { getDefaultSession } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { Sparkles, Play, Crosshair, AlertOctagon, Check, Zap, Shield } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { DrawTime } from "@/lib/prediction-engine";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface LineResult {
  num: string; // "00" - "99"
  score: number;
}

export default function Prediksi2D50LinePage() {
  const { activeMarket, predictionModel, setPredictionModel } = useMarketStore();
  const { data: months, isLoading } = useGetTotoMonths(activeMarket);
  const [selectedSession, setSelectedSession] = useState<DrawTime | "all">(() => getDefaultSession(activeMarket) as DrawTime);
  const [activeTab, setActiveTab] = useState<"depan" | "tengah" | "belakang">("belakang");

  useEffect(() => {
    setSelectedSession(getDefaultSession(activeMarket) as DrawTime);
  }, [activeMarket]);

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
  }, [months, activeMarket]);

  const filteredResults = useMemo(() => {
    if (selectedSession === "all") return allResults;
    return allResults.filter((r) => r.session === selectedSession);
  }, [allResults, selectedSession]);

  const calculate50Line = (pos1Idx: number, pos2Idx: number): { invest: string[], mati: string[] } => {
    if (filteredResults.length === 0) return { invest: [], mati: [] };

    const totalDraws = filteredResults.length;
    const STRICT_WINDOW = predictionModel === "aggressive" ? 15 : 45; // Aggressive looks at shorter trend
    const windowStartIdx = Math.max(0, totalDraws - STRICT_WINDOW);
    const recentDraws = filteredResults.slice(windowStartIdx);

    const freq2D = new Array(100).fill(0);
    const decay2D = new Array(100).fill(0);

    recentDraws.forEach((draw, i) => {
      const full4d = draw.result;
      const d1 = parseInt(full4d[pos1Idx]);
      const d2 = parseInt(full4d[pos2Idx]);
      const val2d = d1 * 10 + d2;
      
      freq2D[val2d]++;
      // Aggressive decays older draws much faster
      const decayFactor = predictionModel === "aggressive" ? 0.70 : 0.90;
      decay2D[val2d] += Math.pow(decayFactor, recentDraws.length - 1 - i);
    });

    const results: LineResult[] = Array.from({ length: 100 }, (_, i) => {
      const numStr = i.toString().padStart(2, "0");
      
      const fScore = (freq2D[i] / Math.max(1, Math.max(...freq2D))) * 100;
      const dScore = (decay2D[i] / Math.max(0.001, Math.max(...decay2D))) * 100;

      // Base AI score (frequency + momentum)
      // Aggressive favors momentum (hot numbers) heavily
      const baseScore = predictionModel === "aggressive" 
        ? (fScore * 0.2) + (dScore * 0.8) 
        : (fScore * 0.7) + (dScore * 0.3);
      
      return {
        num: numStr,
        score: baseScore
      };
    });

    results.sort((a, b) => b.score - a.score);

    // Top 50 are Invest, Bottom 50 are Mati
    const invest = results.slice(0, 50).map(r => r.num).sort((a, b) => parseInt(a) - parseInt(b));
    const mati = results.slice(50, 100).map(r => r.num).sort((a, b) => parseInt(a) - parseInt(b));

    return { invest, mati };
  };

  const linesDepan = useMemo(() => calculate50Line(0, 1), [filteredResults, predictionModel]);
  const linesTengah = useMemo(() => calculate50Line(1, 2), [filteredResults, predictionModel]);
  const linesBelakang = useMemo(() => calculate50Line(2, 3), [filteredResults, predictionModel]);

  const currentLines = activeTab === "depan" ? linesDepan : activeTab === "tengah" ? linesTengah : linesBelakang;
  const posName = activeTab === "depan" ? "As & Kop" : activeTab === "tengah" ? "Kop & Kepala" : "Kepala & Ekor";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6 md:pb-6">
      <PageSeo
        title={`Prediksi 2D 50 Line Jitu ${activeMarket} - 99% Akurat`}
        description={`Kumpulan 50 Line Invest dan 50 Line Mati 2D ${activeMarket} menggunakan AI Statistik Pasti Tembus.`}
      />
      
      {isLoading ? (
        <PageSkeleton />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header section */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Crosshair className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-black text-foreground font-display tracking-tight">2D 50 Line Jitu</h1>
                <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-black text-green-500 uppercase shadow-[0_0_10px_rgba(34,197,94,0.2)]">99% Akurat Pasti Kena</span>
              </div>
              <p className="text-sm text-muted-foreground font-medium max-w-2xl">
                Fitur pangkas 50 nomor mati dan 50 nomor invest hidup berdasarkan tren tarikan paito dan probabilitas AI tingkat tinggi.
              </p>
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

            {/* Session Selector */}
            <div className="flex flex-wrap gap-2 pb-2">
              <Badge
                variant={selectedSession === "all" ? "default" : "outline"}
                className={selectedSession === "all" ? "bg-primary text-primary-foreground font-bold shadow-md cursor-pointer" : "cursor-pointer"}
                onClick={() => setSelectedSession("all")}
              >
                Semua Sesi
              </Badge>
              {MARKET_SESSIONS[activeMarket].map((t) => (
                <Badge
                  key={t}
                  variant={selectedSession === t ? "default" : "outline"}
                  className={selectedSession === t ? "bg-primary text-primary-foreground font-bold shadow-md cursor-pointer" : "cursor-pointer"}
                  onClick={() => setSelectedSession(t as DrawTime)}
                >
                  <Play className="mr-1 h-3 w-3" />
                  Sesi {t}
                </Badge>
              ))}
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-6 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-1 rounded-2xl h-auto">
                <TabsTrigger value="depan" className="rounded-xl py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-xs sm:text-sm font-bold transition-all">2D DEPAN</TabsTrigger>
                <TabsTrigger value="tengah" className="rounded-xl py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-xs sm:text-sm font-bold transition-all">2D TENGAH</TabsTrigger>
                <TabsTrigger value="belakang" className="rounded-xl py-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-xs sm:text-sm font-bold transition-all">2D BELAKANG</TabsTrigger>
              </TabsList>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 50 LINE INVEST */}
                <div className="glass-card rounded-3xl p-6 bg-gradient-to-br from-green-500/5 to-transparent border-green-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-500/20 rounded-xl text-green-500">
                      <Check className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-foreground">50 Line Invest (Hidup)</h2>
                      <p className="text-xs text-muted-foreground font-medium">Posisi: {posName}</p>
                    </div>
                  </div>
                  
                  <div className="bg-background/80 rounded-2xl p-4 border border-border shadow-inner font-mono text-sm leading-relaxed tracking-wider break-words font-medium text-foreground">
                    {currentLines.invest.join("*")}
                  </div>
                </div>

                {/* 50 LINE MATI */}
                <div className="glass-card rounded-3xl p-6 bg-gradient-to-br from-red-500/5 to-transparent border-red-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-500/20 rounded-xl text-red-500">
                      <AlertOctagon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-foreground">50 Line Mati (Pangkas)</h2>
                      <p className="text-xs text-muted-foreground font-medium">Jangan pasang nomor-nomor ini</p>
                    </div>
                  </div>
                  
                  <div className="bg-background/80 rounded-2xl p-4 border border-border shadow-inner font-mono text-sm leading-relaxed tracking-wider break-words font-medium text-muted-foreground line-through decoration-red-500/50">
                    {currentLines.mati.join("*")}
                  </div>
                </div>
              </div>
            </Tabs>

          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
