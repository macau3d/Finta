import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types matching the schema of Toto Macau predictions
export interface TotoDay {
  id: number;
  drawDate: string; // YYYY-MM-DD
  dayName: string;  // e.g., "Senin"
  draw0001: string | null;
  draw1300: string | null;
  draw1600: string | null;
  draw1900: string | null;
  draw2200: string | null;
  draw2300: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TotoMonthGroup {
  month: string;      // "01"-"12"
  year: string;       // YYYY
  monthName: string;  // e.g., "Januari"
  totalDays: number;
  results: TotoDay[];
}

export interface TotoSchedule {
  drawTimes: string[]; // e.g. ["00:01", "13:00", ...]
}

export interface Prediction {
  id: number;
  market: string;        // "toto"
  session: string;       // e.g., "0001", "1300"
  forDate: string;       // YYYY-MM-DD
  predicted4d: string;   // e.g., "1234"
  confidence: number;    // 0-100
  signal: string;        // "STRONG_BUY", etc.
  asP: number;
  kopP: number;
  kepalaP: number;
  ekorP: number;
  bbfs: string;          // "1,2,3,4"
  createdAt: string;
  actual4d: string | null;
  asCorrect: boolean | null;
  kopCorrect: boolean | null;
  kepalaCorrect: boolean | null;
  ekorCorrect: boolean | null;
  digitScore: number | null;
}

export interface NomorTaruhan {
  numbers: string[];
}

// ─── Query Key Generators ───────────────────────────────────────────────────

export function getGetTotoLatestQueryKey(market: string = "toto") {
  return ["getTotoLatest", market] as const;
}

export function getGetTotoMonthsQueryKey(market: string = "toto") {
  return ["getTotoMonths", market] as const;
}

export function getGetTotoScheduleQueryKey(market: string = "toto") {
  return ["getTotoSchedule", market] as const;
}

export function getGetPredictionsQueryKey(market: string = "toto") {
  return ["getPredictions", market] as const;
}

export function getGetNomorTaruhanQueryKey() {
  return ["getNomorTaruhan"] as const;
}

// ─── Fetch API wrappers ──────────────────────────────────────────────────────

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${res.statusText} - ${text}`);
  }
  return res.json();
}

// ─── Query & Mutation Hooks ──────────────────────────────────────────────────

export function useGetTotoLatest(market: string = "toto") {
  return useQuery<TotoDay, Error>({
    queryKey: getGetTotoLatestQueryKey(market),
    queryFn: () => apiFetch<TotoDay>(`/api/toto/latest?market=${market}`),
  });
}

export function useGetTotoMonths(market: string = "toto") {
  return useQuery<TotoMonthGroup[], Error>({
    queryKey: getGetTotoMonthsQueryKey(market),
    queryFn: () => apiFetch<TotoMonthGroup[]>(`/api/toto/months?market=${market}`),
  });
}

export function useGetTotoSchedule(market: string = "toto") {
  return useQuery<TotoSchedule, Error>({
    queryKey: getGetTotoScheduleQueryKey(market),
    queryFn: () => apiFetch<TotoSchedule>(`/api/toto/schedule?market=${market}`),
  });
}

export function useRefreshTotoData() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => apiFetch<void>("/api/toto/refresh", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetTotoLatestQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTotoMonthsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSyncStatusQueryKey() });
    },
  });
}

export interface SyncStatus {
  lastSyncTime: string;
  lastSyncStatus: "SUCCESS" | "FAILED" | "PENDING";
  lastSyncCount: number;
  dataSource: string;
}

export function getGetSyncStatusQueryKey() {
  return ["getSyncStatus"] as const;
}

export function useGetSyncStatus() {
  return useQuery<SyncStatus, Error>({
    queryKey: getGetSyncStatusQueryKey(),
    queryFn: () => apiFetch<SyncStatus>("/api/toto/sync-status"),
  });
}

export function useGetNomorTaruhan() {
  return useQuery<NomorTaruhan, Error>({
    queryKey: getGetNomorTaruhanQueryKey(),
    queryFn: () => apiFetch<NomorTaruhan>("/api/toto/nomor-taruhan"),
  });
}

export function useGetPredictions(market: string = "toto") {
  return useQuery<Prediction[], Error>({
    queryKey: getGetPredictionsQueryKey(market),
    queryFn: () => apiFetch<Prediction[]>(`/api/predictions?market=${market}`),
  });
}

export function useSavePrediction(market: string = "toto") {
  const queryClient = useQueryClient();
  return useMutation<Prediction, Error, Partial<Prediction>>({
    mutationFn: (data) =>
      apiFetch<Prediction>("/api/predictions", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetPredictionsQueryKey(market) });
    },
  });
}

export function useDeletePrediction(market: string = "toto") {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (id) =>
      apiFetch<void>(`/api/predictions/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetPredictionsQueryKey(market) });
    },
  });
}

// ─── Verification & Integrity API ──────────────────────────────────────────

export interface VerifyAnomaly {
  date: string;
  session: string;
  type: "missing" | "invalid_format";
  value: string | null;
  repaired: boolean;
  message: string;
}

export interface VerifyReport {
  success: boolean;
  totalChecked: number;
  healthScore: number;
  anomalies: VerifyAnomaly[];
  repairedCount: number;
}

export function getGetTotoVerifyQueryKey() {
  return ["getTotoVerify"] as const;
}

export function useGetTotoVerify() {
  return useQuery<VerifyReport, Error>({
    queryKey: getGetTotoVerifyQueryKey(),
    queryFn: () => apiFetch<VerifyReport>("/api/toto/verify"),
  });
}

export function useRepairTotoData() {
  const queryClient = useQueryClient();
  return useMutation<VerifyReport, Error, void>({
    mutationFn: () => apiFetch<VerifyReport>("/api/toto/repair", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetTotoVerifyQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTotoLatestQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTotoMonthsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPredictionsQueryKey() });
    },
  });
}

export function useGetAiAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { historyLength: number, bbfs: string, predicted4D: string, confidence: number }) => {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Gagal mendapatkan analisis AI");
      }
      return res.json() as Promise<{ analysis: string }>;
    },
  });
}
