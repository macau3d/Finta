import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTotoLatestQueryKey,
  getGetTotoMonthsQueryKey,
  getGetTotoScheduleQueryKey,
} from "@workspace/api-client-react";
import { MarketType } from "@/lib/market-store";
import { getDrawTimesWIB } from "./use-countdown";

const ACTIVE_WINDOW_MINUTES = 5;
const ACTIVE_INTERVAL_MS = 30_000;
const IDLE_INTERVAL_MS = 5 * 60_000;

function getWIBMinutes(): number {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMinutes + 7 * 60) % (24 * 60);
}

function isNearDrawTime(market: MarketType): boolean {
  const current = getWIBMinutes();
  const drawTimes = getDrawTimesWIB(market);
  for (const { hour, minute } of drawTimes) {
    const drawMinutes = hour * 60 + minute;
    const delta = (current - drawMinutes + 24 * 60) % (24 * 60);
    if (delta >= 0 && delta <= ACTIVE_WINDOW_MINUTES) {
      return true;
    }
  }
  return false;
}

function getNextDrawLabel(market: MarketType): string {
  const current = getWIBMinutes();
  const drawTimes = getDrawTimesWIB(market);
  for (const { hour, minute } of drawTimes) {
    const drawMinutes = hour * 60 + minute;
    if (drawMinutes > current) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }
  const first = drawTimes[0] || { hour: 0, minute: 1 };
  return `${String(first.hour).padStart(2, "0")}:${String(first.minute).padStart(2, "0")}`;
}

export interface AutoRefreshState {
  isActive: boolean;
  lastRefreshed: Date | null;
  nextDrawLabel: string;
}

export function useAutoRefresh(market: MarketType): AutoRefreshState {
  const queryClient = useQueryClient();
  const [isActive, setIsActive] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [nextDrawLabel, setNextDrawLabel] = useState(() => getNextDrawLabel(market));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: getGetTotoLatestQueryKey(market) });
    await queryClient.invalidateQueries({ queryKey: getGetTotoMonthsQueryKey(market) });
    await queryClient.invalidateQueries({ queryKey: getGetTotoScheduleQueryKey(market) });
    setLastRefreshed(new Date());
  }, [queryClient, market]);

  useEffect(() => {
    let active = true;

    function schedule() {
      if (!active) return;

      const near = isNearDrawTime(market);
      setIsActive(near);
      setNextDrawLabel(getNextDrawLabel(market));

      const interval = near ? ACTIVE_INTERVAL_MS : IDLE_INTERVAL_MS;

      timerRef.current = setTimeout(async () => {
        if (!active) return;
        await invalidateAll();
        schedule();
      }, interval);
    }

    schedule();

    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [invalidateAll, market]);

  return { isActive, lastRefreshed, nextDrawLabel };
}
