import { Link } from "wouter";
import {
  useMarketStore,
  MARKET_NAMES,
  MARKET_SESSIONS,
  MARKET_SESSION_LABELS,
} from "@/lib/market-store";
import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTotoLatest,
  useGetTotoSchedule,
  useRefreshTotoData,
  getGetTotoLatestQueryKey,
  getGetTotoScheduleQueryKey,
  useGetSyncStatus,
  getGetSyncStatusQueryKey,
  useGetTotoVerify,
  useRepairTotoData,
  getGetTotoVerifyQueryKey,
} from "@workspace/api-client-react";
import { DailySummary } from "@/components/daily-summary";
import { PageSeo } from "@/components/page-seo";
import { PageSkeleton } from "@/components/page-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RefreshCw,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Timer,
  Database,
  Globe,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  Sparkles,
  SearchX,
  Dices,
  Target,
  BarChart3,
  History,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useCountdown } from "@/hooks/use-countdown";
import {
  NumberDisplayBadged,
  NumberDisplay,
} from "@/components/number-display";
import { useGetNomorTaruhan } from "@workspace/api-client-react";
import { computeHits } from "@/lib/classify";
import { useToast } from "@/hooks/use-toast";
import { ScrollToTop } from "@/components/scroll-to-top";
import { motion, AnimatePresence } from "motion/react";

type DrawTimeKey =
  "draw0001" | "draw1300" | "draw1600" | "draw1900" | "draw2200" | "draw2300";
function drawKey(t: string): DrawTimeKey {
  return `draw${t}` as DrawTimeKey;
}

export default function Home() {
  const activeMarket = useMarketStore((s) => s.activeMarket);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [showIssues, setShowIssues] = useState(false);

  const {
    isActive: autoActive,
    lastRefreshed,
    nextDrawLabel,
  } = useAutoRefresh(activeMarket);
  const countdown = useCountdown(activeMarket);

  const { data: latest, isLoading: latestLoading } =
    useGetTotoLatest(activeMarket);
  const { data: schedule } = useGetTotoSchedule(activeMarket);
  const { data: nomorTaruhan } = useGetNomorTaruhan();
  const { data: syncStatus } = useGetSyncStatus();
  const { data: verifyReport, isLoading: verifyLoading } = useGetTotoVerify();

  const refreshMutation = useRefreshTotoData();
  const repairMutation = useRepairTotoData();

  const taruhanSet = useMemo(
    () => new Set<string>(nomorTaruhan?.numbers ?? []),
    [nomorTaruhan],
  );

  // Audio countdown effect
  useEffect(() => {
    const playBeep = (freq = 880, duration = 0.5) => {
      try {
        const AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.00001,
          ctx.currentTime + duration,
        );
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch (err) {
        // ignore
      }
    };

    if (countdown.totalSeconds === 0) {
      // Final long beep
      playBeep(440, 1.5);
    } else if (countdown.totalSeconds <= 5 && countdown.totalSeconds > 0) {
      // Short beep for last 5 seconds
      playBeep(880, 0.2);
    }
  }, [countdown.totalSeconds]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refreshMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: getGetTotoLatestQueryKey(activeMarket),
      });
      await queryClient.invalidateQueries({
        queryKey: getGetTotoScheduleQueryKey(activeMarket),
      });
      await queryClient.invalidateQueries({
        queryKey: getGetSyncStatusQueryKey(),
      });
      await queryClient.invalidateQueries({
        queryKey: getGetTotoVerifyQueryKey(),
      });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRepair() {
    setRepairing(true);
    try {
      const result = await repairMutation.mutateAsync();
      toast({
        title: "Integrasi Data Sukses!",
        description: `Berhasil memperbaiki ${result.repairedCount} draw kosong di masa lalu dengan hasil draw simulasi presisi tinggi.`,
      });
      // Invalidate queries to refresh calculations
      await queryClient.invalidateQueries({
        queryKey: getGetTotoLatestQueryKey(activeMarket),
      });
      await queryClient.invalidateQueries({
        queryKey: getGetTotoVerifyQueryKey(),
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal memulihkan data",
        description:
          err.message || "Terjadi kendala jaringan atau kesalahan internal.",
      });
    } finally {
      setRepairing(false);
    }
  }

  if (latestLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 px-4 pb-24 pt-6 md:pb-6">
        <PageSeo
          title="Home"
          description="Data result Toto live terlengkap. Cek hasil keluaran terbaru."
        />
        <PageSkeleton type="dashboard" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-24 pt-8 md:pb-8 relative">
      <PageSeo
        title="Home"
        description="Data result Toto live terlengkap. Cek hasil keluaran terbaru."
      />

      {/* Header & Market Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl md:text-5xl font-bold text-gradient tracking-tight">
              {MARKET_NAMES[activeMarket]}
            </h1>
            {autoActive && (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                LIVE
              </span>
            )}
          </div>
          <p className="text-sm md:text-base text-muted-foreground font-medium">
            {autoActive
              ? "Auto-refresh aktif setiap 30 detik"
              : lastRefreshed
                ? `Diperbarui ${lastRefreshed.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · Draw berikutnya ${nextDrawLabel} WIB`
                : `Data hasil keluaran lengkap · Draw berikutnya ${nextDrawLabel} WIB`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1.5 glass-card rounded-full overflow-x-auto">
            {(Object.entries(MARKET_NAMES) as [keyof typeof MARKET_NAMES, string][]).map(([key, name]) => (
              <button
                key={key}
                onClick={() => useMarketStore.getState().setMarket(key)}
                className={cn(
                  "px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 whitespace-nowrap",
                  activeMarket === key
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5",
                )}
              >
                {name}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-full shrink-0 border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 backdrop-blur-sm hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/20 h-11 w-11 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={cn("h-4.5 w-4.5", refreshing && "animate-spin text-primary")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Column: Hero (Countdown) + Latest Results */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Countdown Timer */}
          <div
            className={cn(
              "rounded-[2rem] p-8 sm:p-10 transition-all duration-700 relative overflow-hidden flex flex-col justify-center border",
              countdown.isImminent
                ? "border-primary/40 bg-primary/5 shadow-[0_0_60px_rgba(var(--primary),0.15)]"
                : "glass-card",
            )}
          >
            
            
            <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between relative z-10">
              <div className="flex items-center gap-5 flex-wrap">
                <div
                  className={cn(
                    "flex items-center justify-center h-16 w-16 rounded-[1.25rem] border transition-all duration-500 backdrop-blur-sm",
                    countdown.isImminent
                      ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_30px_rgba(var(--primary),0.3)]"
                      : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-muted-foreground",
                  )}
                >
                  <Timer className={cn("h-8 w-8", countdown.isImminent && "animate-pulse")} />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-1">
                    Draw berikutnya
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "font-display font-bold text-3xl tracking-tight",
                        countdown.isImminent ? "text-gradient-primary" : "text-foreground",
                      )}
                    >
                      {countdown.nextDrawLabel} WIB
                    </span>
                    {countdown.isImminent && (
                      <span className="flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-[10px] font-black text-primary border border-primary/30 animate-pulse">
                        SEGERA
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 glass-card px-6 py-4 rounded-[1.5rem]">
                {[
                  { value: countdown.hours, label: "JAM" },
                  { value: countdown.minutes, label: "MNT" },
                  { value: countdown.seconds, label: "DTK" },
                ].map(({ value, label }, i) => (
                  <div key={label} className="flex items-center gap-2 sm:gap-4">
                    {i > 0 && (
                      <span className="text-2xl font-light text-muted-foreground/30 -mt-5">:</span>
                    )}
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className={cn(
                          "min-w-[4rem] text-center text-4xl sm:text-5xl font-display font-bold tabular-nums tracking-tighter transition-all duration-300",
                          countdown.isImminent ? "text-primary drop-shadow-[0_0_10px_rgba(var(--primary),0.5)]" : "text-foreground",
                        )}
                      >
                        {String(value).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">
                        {label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Draw schedule chips */}
            {schedule && (
              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-black/5 dark:border-white/5 pt-6 relative z-10">
                <Clock className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Jadwal Result:
                </span>
                {schedule.drawTimes.map((t) => (
                  <Badge
                    key={t}
                    variant={t === countdown.nextDrawLabel ? "default" : "outline"}
                    className={cn(
                      "font-mono text-xs rounded-lg px-3 py-1 transition-all",
                      t === countdown.nextDrawLabel
                        ? "bg-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20"
                        : "border-black/10 dark:border-white/10 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5",
                    )}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Daily Summary */}
          <DailySummary />

          {/* Latest Result */}
          <div className="flex-1 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Hasil Terbaru
            </h2>
            {latestLoading ? (
              <div className="glass-card rounded-[2rem] h-[180px] flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground/50" />
              </div>
            ) : latest ? (
              <div className="glass-card rounded-[2rem] overflow-hidden group hover:border-black/10 dark:hover:border-white/10 transition-colors duration-500">
                {/* Day header */}
                <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 px-6 py-4 backdrop-blur-sm">
                  <Calendar className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-semibold text-foreground text-sm sm:text-base">
                    {latest.dayName}, {latest.drawDate}
                  </span>
                </div>
                {/* Results grid */}
                <div
                  className={cn(
                    "grid divide-x divide-y sm:divide-y-0 divide-black/5 dark:divide-white/5 bg-black/5 dark:bg-black/20",
                    MARKET_SESSIONS[activeMarket].length === 1
                      ? "grid-cols-1"
                      : "grid-cols-3 sm:grid-cols-6",
                  )}
                >
                  {MARKET_SESSIONS[activeMarket].map((t, i) => {
                    const val = latest[drawKey(t)] ?? null;
                    const hasResult = !!val;
                    return (
                      <div
                        key={t}
                        className={cn(
                          "flex flex-col items-center justify-center gap-3 px-3 py-8 text-center transition-colors hover:bg-black/5 dark:hover:bg-white/5",
                          i < 3 && "border-b sm:border-b-0", 
                          hasResult ? "" : "opacity-40 grayscale",
                        )}
                      >
                        <div className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                          {MARKET_SESSION_LABELS[activeMarket][t]}
                        </div>
                        <NumberDisplayBadged value={val} className="scale-110 origin-center" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-[2rem] p-10 flex flex-col items-center justify-center text-center">
                <SearchX className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <div className="font-medium text-foreground mb-1">Belum ada data terbaru</div>
                <div className="text-sm text-muted-foreground">Klik Refresh untuk mengambil data hasil draw hari ini.</div>
              </div>
            )}
          </div>

          {/* Menu Utama */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Menu Prediksi
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { href: "/prediksi-ai", icon: Sparkles, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", title: "Prediksi AI", desc: "Cerdas & Akurat" },
                { href: "/prediksi-1d", icon: Dices, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10 dark:bg-blue-400/10", border: "border-blue-500/20 dark:border-blue-400/20", title: "Colok 1D", desc: "Colok Bebas" },
                { href: "/prediksi-2d", icon: Target, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500/10 dark:bg-purple-400/10", border: "border-purple-500/20 dark:border-purple-400/20", title: "Jitu 2D", desc: "Angka Jitu" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col items-center p-6 rounded-[2rem] glass-card hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300"
                >
                  <div className={cn("mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner border transition-transform duration-500 group-hover:scale-110", item.bg, item.border, item.color)}>
                    <item.icon className="h-8 w-8" strokeWidth={1.5} />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground text-sm mb-1">{item.title}</div>
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Status Widgets */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Sistem Informasi
          </h2>

          {/* Sync Status Widget */}
          {syncStatus && (
            <div className="glass-card rounded-[2rem] p-6 flex flex-col gap-6 relative overflow-hidden">
              <div className="flex items-center gap-4 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Sumber Data Live</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5 text-emerald-400/80">masterlive.net</div>
                </div>
              </div>

              <div className="h-[1px] w-full bg-black/5 dark:bg-white/5" />

              <div className="flex items-center gap-4 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Riwayat Tersimpan</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{syncStatus.lastSyncCount} Hari (2026)</div>
                </div>
              </div>

              <div className="h-[1px] w-full bg-black/5 dark:bg-white/5" />

              <div className="flex items-center gap-4 relative z-10">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Activity className={cn("h-5 w-5", syncStatus.lastSyncStatus === "PENDING" ? "animate-spin text-amber-400" : "animate-pulse")} />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">Sinkronisasi Terakhir</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {syncStatus.lastSyncStatus === "SUCCESS" ? (
                      <span>Sukses · {new Date(syncStatus.lastSyncTime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</span>
                    ) : syncStatus.lastSyncStatus === "PENDING" ? (
                      <span className="text-amber-400 animate-pulse">Sedang sinkronisasi...</span>
                    ) : (
                      <span className="text-rose-400">Gagal (Mencoba kembali...)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Verification & Integrity Panel */}
          <div className="glass-card rounded-[2rem] p-6 flex flex-col gap-5 relative overflow-hidden">
            <div className="flex items-start gap-4 relative z-10">
              <div
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                  verifyLoading
                    ? "bg-black/5 dark:bg-white/5 text-muted-foreground animate-pulse border-black/10 dark:border-white/10"
                    : verifyReport && verifyReport.healthScore === 100
                      ? "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/20",
                )}
              >
                {verifyLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : verifyReport && verifyReport.healthScore === 100 ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-foreground text-sm">Validasi Integritas</h3>
                  {verifyLoading ? (
                    <Badge variant="outline" className="animate-pulse text-[10px] border-black/10 dark:border-white/10">Cek...</Badge>
                  ) : verifyReport ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono px-2 py-0 text-[10px] uppercase border",
                        verifyReport.healthScore === 100 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border-rose-500/30",
                      )}
                    >
                      {verifyReport.healthScore}% OK
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {verifyLoading
                    ? "Menganalisis dataset riwayat..."
                    : verifyReport
                      ? verifyReport.healthScore === 100
                        ? "Data utuh dan terverifikasi sempurna. Tidak ada draw kosong."
                        : `Ditemukan ${verifyReport.anomalies.filter((a) => !a.repaired).length} masalah pada dataset.`
                      : "Gagal memuat status."}
                </p>
              </div>
            </div>

            {/* Actions for Verification */}
            {!verifyLoading && verifyReport && verifyReport.healthScore < 100 && (
              <div className="flex flex-col gap-3 pt-4 border-t border-black/5 dark:border-white/5">
                <Button
                  variant="default"
                  onClick={handleRepair}
                  disabled={repairing}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white gap-2 font-semibold shadow-lg shadow-rose-500/20 rounded-xl"
                >
                  <Wrench className={cn("h-4 w-4", repairing && "animate-spin")} />
                  {repairing ? "Memperbaiki..." : "Auto-Repair Dataset"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowIssues(!showIssues)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground rounded-xl"
                >
                  {showIssues ? "Sembunyikan Masalah" : "Lihat Detail Masalah"}
                </Button>
              </div>
            )}

            {!verifyLoading && verifyReport && verifyReport.healthScore === 100 && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-500/5 py-3 rounded-xl border border-emerald-500/10">
                <Sparkles className="h-4 w-4" />
                SIAP DIGUNAKAN
              </div>
            )}

            {/* Collapsible Issues List */}
            {showIssues && verifyReport && verifyReport.anomalies.length > 0 && (
              <div className="mt-2 space-y-2 border-t border-black/5 dark:border-white/5 pt-4">
                <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2">
                  {verifyReport.anomalies.map((anomaly, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 rounded-xl bg-black/5 dark:bg-black/20 p-3 text-xs border border-black/10 dark:border-white/5">
                      <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-foreground mb-0.5">
                          {anomaly.date} <span className="text-muted-foreground font-normal">(Sesi {anomaly.session})</span>
                        </div>
                        <div className="text-muted-foreground text-[10px] leading-relaxed">{anomaly.message}</div>
                      </div>
                      {anomaly.repaired ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">OK</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[9px]">ERR</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <ScrollToTop />
    </div>
  );
}
