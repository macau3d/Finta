import { useMarketStore, MARKET_NAMES, MARKET_SESSIONS, MARKET_SESSION_LABELS } from "@/lib/market-store";
import { useState, useMemo } from "react";
import { useGetTotoMonths } from "@workspace/api-client-react";
import { PageSeo } from "@/components/page-seo";
import { cn } from "@/lib/utils";
import { Palette, Eraser } from "lucide-react";
import { ScrollToTop } from "@/components/scroll-to-top";



const COLORS = [
  "bg-transparent", // Eraser
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-cyan-500",
];

export default function PaitoPage() {
  const activeMarket = useMarketStore(s => s.activeMarket);
  const { data: months, isLoading } = useGetTotoMonths(activeMarket);
  const [activeColor, setActiveColor] = useState<string>("bg-red-500");
  
  // Store cell colors: { "rowIdx-colIdx": "bg-color" }
  const [cellColors, setCellColors] = useState<Record<string, string>>({});
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Flatten the latest N rows from history for the Paito
  const rows = useMemo(() => {
    if (!months) return [];
    return months.flatMap(m => m.results).sort((a,b) => b.drawDate.localeCompare(a.drawDate)).slice(0, 100);
  }, [months]);

  const handleCellAction = (rowIdx: number, colIdx: number) => {
    const key = `${rowIdx}-${colIdx}`;
    setCellColors(prev => {
      const next = { ...prev };
      if (activeColor === "bg-transparent") {
        delete next[key];
      } else {
        next[key] = activeColor;
      }
      return next;
    });
  };

  const handleMouseEnter = (rowIdx: number, colIdx: number) => {
    if (isMouseDown) {
      handleCellAction(rowIdx, colIdx);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-24 pt-6 md:pb-6">
      <PageSeo title={`Paito Warna - ${MARKET_NAMES[activeMarket]}`} description={`Paito Warna Interaktif ${MARKET_NAMES[activeMarket]}`} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Palette className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground font-display tracking-tight">Paito Warna</h1>
        </div>

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
      </div>

      {/* Color Palette */}
      <div className="rounded-[2rem] glass-card p-5">
        <div className="text-sm font-semibold mb-3">Pilih Warna:</div>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((c, i) => (
            <button
              key={i}
              onClick={() => setActiveColor(c)}
              className={cn(
                "h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-md",
                c === "bg-transparent" ? "border-dashed border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/5 shadow-none" : c,
                activeColor === c ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background border-transparent" : "border-transparent opacity-80 hover:opacity-100"
              )}
            >
              {c === "bg-transparent" && <Eraser className="h-4 w-4 text-muted-foreground" />}
            </button>
          ))}
          <button 
            onClick={() => setCellColors({})}
            className="ml-auto text-xs font-semibold px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground transition-all duration-300 hover:text-foreground"
          >
            Reset Semua
          </button>
        </div>
      </div>

      {/* Paito Table */}
      <div 
        className="rounded-[2rem] glass-card overflow-hidden"
        onMouseDown={() => setIsMouseDown(true)}
        onMouseUp={() => setIsMouseDown(false)}
        onMouseLeave={() => setIsMouseDown(false)}
      >
        <div className="overflow-x-auto select-none">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground border-b border-black/10 dark:border-white/10">
                <th className="p-3 sm:p-4 border-r border-black/10 dark:border-white/10 w-24 sm:w-32 font-semibold">Tanggal</th>
                {MARKET_SESSIONS[activeMarket].map(t => (
                  <th key={MARKET_SESSION_LABELS[activeMarket][t]} className="p-3 sm:p-4 border-r border-black/10 dark:border-white/10 font-semibold w-16 sm:w-20 last:border-0">
                    {MARKET_SESSION_LABELS[activeMarket][t]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                      <p className="text-sm font-medium animate-pulse">Memuat data paito...</p>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground font-medium">Belum ada data history</td>
                </tr>
              ) : (
                rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-200">
                    <td className="p-2 border-r border-black/5 dark:border-white/5 text-[10px] sm:text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {row.drawDate}
                    </td>
                    {MARKET_SESSIONS[activeMarket].map((t, colIdx) => {
                      const val = (row as any)[`draw${t}`];
                      const key = `${rowIdx}-${colIdx}`;
                      const cellColor = cellColors[key];
                      
                      return (
                        <td 
                          key={colIdx} 
                          className={cn(
                            "p-0 border-r border-black/5 dark:border-white/5 last:border-0 cursor-pointer transition-colors duration-200",
                            cellColor && cellColor !== "bg-transparent" ? cellColor : ""
                          )}
                          onMouseDown={() => handleCellAction(rowIdx, colIdx)}
                          onMouseEnter={() => handleMouseEnter(rowIdx, colIdx)}
                        >
                          <div className={cn(
                            "flex items-center justify-center h-8 sm:h-10 w-full font-mono text-xs sm:text-sm font-bold",
                            cellColor && cellColor !== "bg-transparent" ? "text-white" : "text-foreground"
                          )}>
                            {val && val !== "-" ? val : "----"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ScrollToTop />
    </div>
  );
}
