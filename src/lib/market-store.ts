import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MarketType = "toto";

export const MARKET_SESSIONS: Record<MarketType, string[]> = {
  toto: ["1300", "1600", "1900", "2200", "2300", "0001"],
};

export const MARKET_SESSION_LABELS: Record<MarketType, Record<string, string>> = {
  toto: { "0001": "00:01", "1300": "13:00", "1600": "16:00", "1900": "19:00", "2200": "22:00", "2300": "23:00" },
};

export const MARKET_NAMES: Record<MarketType, string> = {
  toto: "Toto Macau",
};

export type PredictionModel = "conservative" | "aggressive";

interface MarketStore {
  activeMarket: MarketType;
  predictionModel: PredictionModel;
  setMarket: (m: MarketType) => void;
  setPredictionModel: (m: PredictionModel) => void;
}

export const useMarketStore = create<MarketStore>()(
  persist(
    (set) => ({
      activeMarket: "toto",
      predictionModel: "aggressive",
      setMarket: (m) => set({ activeMarket: m }),
      setPredictionModel: (m) => set({ predictionModel: m }),
    }),
    {
      name: "market-preferences",
    }
  )
);
