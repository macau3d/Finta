import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMarketStore } from "@/lib/market-store";
import { Zap } from "lucide-react";
import React from "react";
import { Link } from "wouter";

export function AINotification() {
  const { toast } = useToast();
  const activeMarket = useMarketStore((s) => s.activeMarket);
  const [notified, setNotified] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Only notify once per market per session to avoid spam
    if (notified[activeMarket]) return;

    const timer = setTimeout(() => {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-500 fill-green-500 animate-pulse" />
            <span className="font-black text-green-500">SIGNAL 99% AKURAT</span>
          </div>
        ) as unknown as string,
        description: (
          <div className="mt-1 flex flex-col gap-3">
            <span className="text-sm font-medium text-foreground">
              AI telah mengidentifikasi pola 2D Invest kuat untuk putaran <strong className="uppercase">{activeMarket}</strong> selanjutnya.
            </span>
            <Link href="/prediksi-2d-50line" asChild>
              <a className="inline-flex items-center justify-center rounded-xl bg-green-500/10 border border-green-500/30 px-3 py-2 text-xs font-bold text-green-500 transition-colors hover:bg-green-500/20 w-fit">
                Lihat 50 Line Invest
              </a>
            </Link>
          </div>
        ) as unknown as string,
        duration: 10000,
      });
      setNotified((prev) => ({ ...prev, [activeMarket]: true }));
    }, 4500); // Wait 4.5 seconds after market change before showing

    return () => clearTimeout(timer);
  }, [activeMarket, toast, notified]);

  return null;
}
