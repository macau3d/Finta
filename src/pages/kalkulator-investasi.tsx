import React, { useState, useMemo } from "react";
import { 
  Calculator, 
  Settings2, 
  RefreshCcw, 
  TrendingUp, 
  DollarSign, 
  Target, 
  ShieldCheck, 
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface RoundResult {
  putaran: number;
  taruhanPerNomor: number;
  modalPutaran: number;
  totalModalKeluar: number;
  kemenangan: number;
  profitBersih: number;
}

export default function KalkulatorInvestasi() {
  const [jumlahNomor, setJumlahNomor] = useState<number>(70);
  const [hadiahPerPerak, setHadiahPerPerak] = useState<number>(95);
  const [taruhanAwal, setTaruhanAwal] = useState<number>(1000);
  const [jumlahPutaran, setJumlahPutaran] = useState<number>(10);
  const [pembulatan, setPembulatan] = useState<number>(100);

  const results = useMemo(() => {
    const data: RoundResult[] = [];
    
    let totalModalKeluar = 0;
    const targetProfitAwal = (taruhanAwal * hadiahPerPerak) - (taruhanAwal * jumlahNomor);
    
    // Safety check to prevent infinite loops or negative math
    if (jumlahNomor >= hadiahPerPerak || targetProfitAwal <= 0) {
      return [];
    }

    for (let i = 1; i <= Math.min(jumlahPutaran, 50); i++) {
      let taruhan: number;
      
      if (i === 1) {
        taruhan = taruhanAwal;
      } else {
        // We want: (taruhan * hadiahPerPerak) - (taruhan * jumlahNomor) - totalModalKeluar = targetProfitAwal
        // taruhan * (hadiahPerPerak - jumlahNomor) = targetProfitAwal + totalModalKeluar
        // taruhan = (targetProfitAwal + totalModalKeluar) / (hadiahPerPerak - jumlahNomor)
        const exactTaruhan = (targetProfitAwal + totalModalKeluar) / (hadiahPerPerak - jumlahNomor);
        
        if (pembulatan > 1) {
          taruhan = Math.ceil(exactTaruhan / pembulatan) * pembulatan;
        } else {
          taruhan = Math.ceil(exactTaruhan);
        }
      }
      
      const modalPutaran = taruhan * jumlahNomor;
      totalModalKeluar += modalPutaran;
      const kemenangan = taruhan * hadiahPerPerak;
      const profitBersih = kemenangan - totalModalKeluar;
      
      data.push({
        putaran: i,
        taruhanPerNomor: taruhan,
        modalPutaran,
        totalModalKeluar,
        kemenangan,
        profitBersih
      });
    }
    
    return data;
  }, [jumlahNomor, hadiahPerPerak, taruhanAwal, jumlahPutaran, pembulatan]);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(angka);
  };

  const isInvalid = jumlahNomor >= hadiahPerPerak;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-8 md:p-12 border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Calculator className="w-48 h-48 text-primary" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 text-primary text-sm font-bold tracking-wide mb-6">
            <TrendingUp className="w-4 h-4" />
            STRATEGI MARTINGALE
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground font-display tracking-tight mb-4">
            Kalkulator <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">Investasi Taruhan</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            Hitung otomatis strategi taruhan (kompensasi kekalahan) agar Anda tetap mendapatkan profit bersih yang konsisten meskipun mengalami kekalahan beruntun.
          </p>
          
          <Dialog>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-all">
                <AlertCircle className="w-5 h-5" />
                Panduan & Manajemen Risiko
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2 text-amber-600 dark:text-amber-500">
                  <ShieldCheck className="w-6 h-6" />
                  Manajemen Risiko & Tips Bermain
                </DialogTitle>
                <DialogDescription>
                  Penting untuk dipahami sebelum menggunakan strategi kompensasi (Martingale).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 my-4 text-sm text-foreground">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <h4 className="font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Batasan Modal (Bankroll)
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Strategi kompensasi membutuhkan modal yang berlipat. Pastikan Anda memiliki saldo yang cukup untuk menahan setidaknya 5-7 putaran kekalahan beruntun. Jika modal habis sebelum menang, kerugian akan sangat besar.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Target Harian (Stop Win/Loss)
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Tentukan target kemenangan harian (misal: 5-10% dari modal) dan batas kerugian maksimal. Berhenti bermain ketika target atau batas tersebut tercapai untuk menjaga psikologis yang stabil.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <h4 className="font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Perhatikan Limit Bandar
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Setiap platform/bandar memiliki batas maksimal taruhan (Max Bet). Strategi martingale akan gagal jika taruhan Anda sudah menyentuh batas tersebut.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Settings Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-black/10 dark:border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Settings2 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold font-display">Parameter Taruhan</h2>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Jumlah Nomor (Line)</span>
                  <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">Ln</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={jumlahNomor}
                    onChange={(e) => setJumlahNomor(Number(e.target.value))}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 font-mono text-lg outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Hadiah per Perkalian (x)</span>
                  <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">Win</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={hadiahPerPerak}
                    onChange={(e) => setHadiahPerPerak(Number(e.target.value))}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 font-mono text-lg outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                {isInvalid && (
                  <p className="text-xs text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" /> Hadiah harus lebih besar dari jumlah nomor
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Taruhan Awal (Rp)</span>
                  <span className="text-xs font-mono text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">Bet</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Rp</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={taruhanAwal}
                    onChange={(e) => setTaruhanAwal(Number(e.target.value))}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 font-mono text-lg outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Maksimal Putaran</span>
                  <span className="text-xs font-mono text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded">Round</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={jumlahPutaran}
                    onChange={(e) => setJumlahPutaran(Number(e.target.value))}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 font-mono text-lg outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Pembulatan Taruhan</span>
                  <span className="text-xs font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">Round</span>
                </label>
                <select
                  value={pembulatan}
                  onChange={(e) => setPembulatan(Number(e.target.value))}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                >
                  <option value={1}>Tidak Dibulatkan (Pasti Rp {results.length > 0 ? results[0].profitBersih.toLocaleString("id-ID") : ""})</option>
                  <option value={50}>Kelipatan Rp 50</option>
                  <option value={100}>Kelipatan Rp 100</option>
                  <option value={500}>Kelipatan Rp 500</option>
                  <option value={1000}>Kelipatan Rp 1.000</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Dibulatkan ke atas agar profit tidak kurang dari target.</p>
              </div>

            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
             <div className="flex items-center gap-3 mb-4">
               <Target className="w-5 h-5 text-emerald-500" />
               <h3 className="font-bold text-emerald-600 dark:text-emerald-400">Target Profit Konsisten</h3>
             </div>
             {results.length > 0 ? (
                <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {formatRupiah(results[0].profitBersih)}
                </div>
             ) : (
                <div className="text-xl font-bold text-rose-500">Tidak Valid</div>
             )}
             <p className="text-xs text-muted-foreground mt-2">
               Pada putaran berapapun Anda menang, keuntungan bersih yang didapat setelah dipotong semua modal kekalahan sebelumnya akan <b>selalu lebih dari atau sama dengan</b> target di atas.
             </p>
          </div>
        </div>

        {/* Results Table */}
        <div className="lg:col-span-8">
          <div className="glass-card rounded-3xl border border-black/10 dark:border-white/10 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-between">
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Simulasi Putaran (Kompensasi)
              </h2>
            </div>
            
            {isInvalid ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-2">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Parameter Tidak Masuk Akal</h3>
                <p className="text-muted-foreground max-w-sm">
                  Jumlah nomor ({jumlahNomor}) tidak boleh sama atau lebih besar dari Hadiah ({hadiahPerPerak}). Dalam kondisi ini, kemenangan tidak akan pernah menutupi modal Anda (Rugi).
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-black/5 dark:bg-white/5">
                    <tr>
                      <th className="px-6 py-4 font-black tracking-wider text-center">Putaran</th>
                      <th className="px-6 py-4 font-black tracking-wider">Bet (Per Nomor)</th>
                      <th className="px-6 py-4 font-black tracking-wider">Modal Putaran</th>
                      <th className="px-6 py-4 font-black tracking-wider">Total Modal (Kumulatif)</th>
                      <th className="px-6 py-4 font-black tracking-wider text-emerald-600 dark:text-emerald-400">Total Menang</th>
                      <th className="px-6 py-4 font-black tracking-wider text-primary">Profit Bersih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {results.map((row, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={row.putaran} 
                        className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-6 py-4 font-bold text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs">
                            {row.putaran}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-foreground">
                          {formatRupiah(row.taruhanPerNomor)}
                        </td>
                        <td className="px-6 py-4 font-mono text-muted-foreground">
                          {formatRupiah(row.modalPutaran)}
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-rose-600 dark:text-rose-400/80">
                          {formatRupiah(row.totalModalKeluar)}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(row.kemenangan)}
                        </td>
                        <td className="px-6 py-4 font-mono font-black text-primary relative overflow-hidden">
                          <span className="relative z-10">{formatRupiah(row.profitBersih)}</span>
                          <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
