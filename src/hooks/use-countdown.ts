import { useEffect, useState } from "react";
import { MarketType, MARKET_SESSION_LABELS } from "@/lib/market-store";

export function getDrawTimesWIB(market: MarketType): { hour: number; minute: number }[] {
  const labels = MARKET_SESSION_LABELS[market];
  const times = Object.values(labels).map((label) => {
    const match = label.match(/(\d{2}):(\d{2})/);
    if (match) {
      return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) };
    }
    return { hour: 0, minute: 0 };
  });
  times.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  return times;
}

function getWIBSeconds(): number {
  const now = new Date();
  const utcSeconds = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  return (utcSeconds + 7 * 3600) % (24 * 3600);
}

export interface CountdownState {
  nextDrawLabel: string;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isImminent: boolean;
}

function computeCountdown(market: MarketType): CountdownState {
  const currentSec = getWIBSeconds();
  const drawTimes = getDrawTimesWIB(market);

  for (const { hour, minute } of drawTimes) {
    const drawSec = hour * 3600 + minute * 60;
    if (drawSec > currentSec) {
      const remaining = drawSec - currentSec;
      const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      return {
        nextDrawLabel: label,
        hours: Math.floor(remaining / 3600),
        minutes: Math.floor((remaining % 3600) / 60),
        seconds: remaining % 60,
        totalSeconds: remaining,
        isImminent: remaining <= 300,
      };
    }
  }

  const first = drawTimes[0] || { hour: 0, minute: 1 };
  const drawSec = first.hour * 3600 + first.minute * 60;
  const remaining = 24 * 3600 - currentSec + drawSec;
  return {
    nextDrawLabel: `${String(first.hour).padStart(2, "0")}:${String(first.minute).padStart(2, "0")}`,
    hours: Math.floor(remaining / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
    totalSeconds: remaining,
    isImminent: remaining <= 300,
  };
}

export function useCountdown(market: MarketType): CountdownState {
  const [state, setState] = useState<CountdownState>(() => computeCountdown(market));

  useEffect(() => {
    setState(computeCountdown(market));
    const id = setInterval(() => {
      setState(computeCountdown(market));
    }, 1000);
    return () => clearInterval(id);
  }, [market]);

  return state;
}
