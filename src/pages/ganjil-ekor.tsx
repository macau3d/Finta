import { useMarketStore, MARKET_SESSIONS, MARKET_SESSION_LABELS } from "@/lib/market-store";
import { useGetTotoMonths } from "@workspace/api-client-react";
import { PageSeo } from "@/components/page-seo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { NumberDisplay } from "@/components/number-display";
import { isGanjilEkor } from "@/lib/classify";
import { useState, useMemo } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Hash } from "lucide-react";
import { useTodayStats } from "@/hooks/use-today-stats";
import { TodayHitBanner } from "@/components/today-hit-banner";
import { useGetNomorTaruhan } from "@workspace/api-client-react";
import { Link } from "wouter";

const GANJIL_EKOR_LIST = [
  "01","03","05","07","09",
  "11","13","15","17","19",
  "21","23","25","27","29",
  "31","33","35","37","39",
  "41","43","45","47","49",
  "51","53","55","57","59",
  "61","63","65","67","69",
  "71","73","75","77","79",
  "81","83","85","87","89",
  "91","93","95","97","99",
];


type DrawTimeKey = "draw0001" | "draw1300" | "draw1600" | "draw1900" | "draw2200" | "draw2300";
function drawKey(t: string): DrawTimeKey {
  return `draw${t}` as DrawTimeKey;
}

function RefGanjilEkor() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = GANJIL_EKOR_LIST.join("*");

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 w-full">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-rose-400">Daftar 2D Ganjil Ekor</span>
          <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-400">50 nomor</Badge>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-400 hover:bg-rose-500/20 transition-colors"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Disalin!" : "Copy"}
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1">
          {GANJIL_EKOR_LIST.map((n) => (
            <span key={n} className="rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-rose-300">
              {n}
            </span>
          ))}
        </div>
      )}
      {open && (
        <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground/60 leading-relaxed">
          {text}
        </p>
      )}
    </div>
  );
}

export default function GanjilEkorPage() {
  const activeMarket = useMarketStore(s => s.activeMarket);
  const { data: months, isLoading } = useGetTotoMonths(activeMarket);
  const todayStats = useTodayStats();
  const { data: nomorTaruhan } = useGetNomorTaruhan();
  const taruhanSet = useMemo(() => new Set<string>(nomorTaruhan?.numbers ?? []), [nomorTaruhan]);

  void taruhanSet;

  const [selectedTime, setSelectedTime] = useState<"all" | string>("all");
  const displayedTimes = selectedTime === "all" ? MARKET_SESSIONS[activeMarket] : [selectedTime];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6 md:pb-6">
      <PageSeo title="Ganjil Ekor" description="Analisis angka Ganjil Ekor (ekor 1,3,5,7,9) berdasarkan 2D belakang Toto Macau" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/20 border border-rose-500/30">
              <Hash className="h-5 w-5 text-rose-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Analisis Ganjil Ekor</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-13 pl-0.5">
            50 nomor — ekor digit 1,3,5,7,9 — disorot dari 2D belakang
          </p>
        </div>
        <div className="sm:w-80 lg:w-96 shrink-0">
          <RefGanjilEkor />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border border-black/10 dark:border-white/10 rounded-2xl p-1 bg-black/5 dark:bg-white/5 w-fit">
        <Link href="/ganjil" asChild>
          <a className="px-4 py-2 text-xs font-bold rounded-xl transition-all text-muted-foreground hover:text-foreground">
            2D Depan (As & Kop)
          </a>
        </Link>
        <Link href="/ganjil-ekor" asChild>
          <a className="px-4 py-2 text-xs font-bold rounded-xl transition-all bg-background text-foreground shadow-sm">
            2D Belakang (Ekor)
          </a>
        </Link>
      </div>

      {todayStats && (
        <TodayHitBanner
          count={todayStats.ganjilEkor}
          total={todayStats.total}
          label="Ganjil Ekor"
          color="rose"
          showBack
          slots={todayStats.slots.map((s) => ({ key: s.key, value: s.value, hit: s.ganjilEkor }))}
        />
      )}

      {/* Responsive Column Filter & Scroll Cue */}
      <div className="flex flex-col gap-3 rounded-[2rem] glass-card p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Filter Tampilan Jam Draw (Responsif Mobile)
          </span>
          {selectedTime === "all" && (
            <span className="text-[10px] text-muted-foreground/80 sm:hidden">
              ← Geser tabel ke samping untuk melihat jam lainnya →
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedTime("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border",
              selectedTime === "all"
                ? "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-sm font-bold"
                : "bg-muted/10 text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            Semua Jam
          </button>
          {MARKET_SESSIONS[activeMarket].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTime(t)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border",
                selectedTime === t
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/30 shadow-sm font-bold"
                  : "bg-muted/10 text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              {MARKET_SESSION_LABELS[activeMarket][t]} WIB
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : months && months.length > 0 ? (
        <div className="space-y-6">
          {months.map((monthGroup) => {
            const totalHit = monthGroup.results.reduce((acc, row) => {
              return acc + MARKET_SESSIONS[activeMarket].filter((t) => isGanjilEkor(row[drawKey(t)] ?? null) === true).length;
            }, 0);
            return (
            <div key={`${monthGroup.year}-${monthGroup.month}`} className="rounded-[2rem] glass-card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-black/10 dark:border-white/10 px-5 py-4 bg-black/5 dark:bg-white/5">
                <span className="font-semibold text-foreground text-[15px]">{monthGroup.monthName} {monthGroup.year}</span>
                <Badge variant="outline" className="text-[11px] bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">{monthGroup.totalDays} hari</Badge>
                <Badge variant="outline" className="text-[11px] bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400">Total Ganjil Ekor: {totalHit}</Badge>
              </div>
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20">
                <table className="w-full text-sm table-auto min-w-[500px]">
                  <thead>
                    <tr className="bg-muted/40">
                      <th className="sticky left-0 z-10 bg-muted-header border-r border-border/40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] px-1 py-1.5 text-left text-[10px] font-medium text-muted-foreground sm:px-3 sm:text-xs w-[52px] sm:w-auto" style={{ backgroundColor: "var(--color-bg-muted-header, rgb(24, 24, 27))" }}>Tanggal</th>
                      {displayedTimes.map((t) => (
                        <th key={t} className="px-0 py-1.5 text-center text-[10px] font-medium text-muted-foreground sm:px-2 sm:text-xs">{MARKET_SESSION_LABELS[activeMarket][t]}</th>
                      ))}
                      <th className="px-0.5 py-1.5 text-center text-[10px] font-medium text-rose-400/80 sm:px-3">
                        <span className="block">HIT</span>
                        <span className="block text-[9px] text-rose-400/50 font-normal">gj.ekor/6</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthGroup.results.map((row) => {
                      const rowHits = MARKET_SESSIONS[activeMarket].filter((t) => isGanjilEkor(row[drawKey(t)] ?? null) === true).length;
                      return (
                        <tr key={row.drawDate} className="group border-t border-border/50 hover:bg-muted/20">
                          <td className="sticky left-0 z-10 bg-card group-hover:bg-muted/50 border-r border-border/30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors px-1 py-1 font-medium text-foreground sm:px-3 sm:py-2 w-[52px] sm:w-auto" style={{ backgroundColor: "var(--color-bg-card, rgb(9, 9, 11))" }}>
                            <div className="whitespace-nowrap">
                              <span className="hidden sm:inline text-xs text-muted-foreground mr-1">{row.dayName}</span>
                              <span className="hidden sm:inline">{row.drawDate}</span>
                              <span className="sm:hidden block text-[10px] text-muted-foreground leading-none">{row.dayName.slice(0, 3)}</span>
                              <span className="sm:hidden block font-mono text-xs leading-tight">{row.drawDate.slice(5).replace('-', '/')}</span>
                            </div>
                          </td>
                          {displayedTimes.map((t) => {
                            const val = row[drawKey(t)] ?? null;
                            const hit = isGanjilEkor(val);
                            return (
                              <td key={t} className={cn("px-0 py-1.5 text-center sm:px-2 sm:py-2", hit === true ? "bg-rose-500/20" : "")}>
                                <NumberDisplay
                                  value={val}
                                  ekorMode
                                  className={hit === true ? "text-rose-300" : "opacity-15"}
                                />
                              </td>
                            );
                          })}
                          <td className="px-0.5 py-1 text-center sm:px-2 sm:py-2">
                            <span className={cn(
                              "inline-flex items-center justify-center rounded-full border font-bold h-6 w-6 text-xs sm:h-7 sm:w-7 sm:text-sm",
                              rowHits >= 5 ? "bg-rose-500/35 text-rose-200 border-rose-500/55" :
                              rowHits >= 4 ? "bg-rose-500/25 text-rose-300 border-rose-500/40" :
                              rowHits >= 2 ? "bg-rose-500/15 text-rose-400 border-rose-500/30" :
                              rowHits === 1 ? "bg-slate-600/50 text-slate-300 border-slate-500/40" :
                                             "bg-slate-700/30 text-slate-500 border-slate-600/20"
                            )}>{rowHits}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
          Belum ada data. Refresh di halaman Home terlebih dahulu.
        </div>
      )}
    </div>
  );
}
