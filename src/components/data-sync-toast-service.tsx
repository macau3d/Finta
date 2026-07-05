import { useEffect, useRef } from "react";
import { useGetSyncStatus } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useIsFetching } from "@tanstack/react-query";

export function DataSyncToastService() {
  const { data: syncStatus } = useGetSyncStatus();
  const { toast } = useToast();
  const lastSyncTimeRef = useRef<string | null>(null);
  const isFetching = useIsFetching();

  useEffect(() => {
    if (syncStatus?.lastSyncStatus === "SUCCESS" && syncStatus.lastSyncTime) {
      if (lastSyncTimeRef.current && lastSyncTimeRef.current !== syncStatus.lastSyncTime) {
        toast({
          title: "Data Synced",
          description: `Successfully fetched latest Toto Macau data.`,
          duration: 3000,
        });
      }
      lastSyncTimeRef.current = syncStatus.lastSyncTime;
    } else if (syncStatus?.lastSyncStatus === "FAILED" && syncStatus.lastSyncTime) {
      if (lastSyncTimeRef.current !== syncStatus.lastSyncTime) {
        toast({
          title: "Sync Failed",
          description: "Failed to fetch latest Toto Macau data.",
          variant: "destructive",
          duration: 3000,
        });
      }
      lastSyncTimeRef.current = syncStatus.lastSyncTime;
    }
  }, [syncStatus?.lastSyncTime, syncStatus?.lastSyncStatus, toast]);

  return null;
}
