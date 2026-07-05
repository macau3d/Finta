import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { MarketType, MARKET_SESSIONS, MARKET_SESSION_LABELS } from "./market-store"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDefaultSession(market: MarketType): string {
  if (market !== "toto") {
    return MARKET_SESSIONS[market][0];
  }

  // Get current time in WIB (UTC+7)
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const wibMinutes = (utcMinutes + 7 * 60) % (24 * 60);

  // Toto Macau draw times in WIB minutes
  const drawTimes = [
    { key: "0001", minutes: 0 * 60 + 1 },
    { key: "1300", minutes: 13 * 60 },
    { key: "1600", minutes: 16 * 60 },
    { key: "1900", minutes: 19 * 60 },
    { key: "2200", minutes: 22 * 60 },
    { key: "2300", minutes: 23 * 60 },
  ];

  for (const draw of drawTimes) {
    if (draw.minutes > wibMinutes) {
      return draw.key;
    }
  }

  return "0001"; // Default to next day's first draw
}
