import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGetAiAnalysis } from "@/lib/api-client";
import { Sparkles, AlertCircle, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";

export function AiAnalysisCard({ result, history }: { result: any, history: any[] }) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const { mutateAsync: getAnalysis, isPending, error } = useGetAiAnalysis();

  const handleAnalyze = async () => {
    try {
      const bbfsStr = result.bbfsCandidates ? JSON.stringify(result.bbfsCandidates) : "";
      const res = await getAnalysis({
        historyLength: (history || []).reduce((acc, m) => acc + (m.results?.length || 0), 0),
        bbfs: bbfsStr,
        predicted4D: result.predicted4D,
        confidence: result.confidence?.total || 0,
      });
      setAnalysis(res.analysis);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-[2rem] border border-black/10 dark:border-white/10 p-6 space-y-4 bg-black/5 dark:bg-white/5 backdrop-blur-sm mt-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <h3 className="text-lg font-bold font-display text-foreground">Gemini AI Analysis</h3>
         </div>
         {!analysis && !isPending && (
           <Button onClick={handleAnalyze} size="sm" className="rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
             Dapatkan Analisis Pakar
           </Button>
         )}
      </div>
      
      {isPending && (
         <div className="flex items-center justify-center p-6 text-muted-foreground gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            Gemini AI sedang menganalisa probabilitas...
         </div>
      )}

      {error && (
         <div className="text-red-400 text-sm font-medium p-4 rounded-xl bg-red-400/10 border border-red-400/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            Koneksi ke Gemini AI gagal. Pastikan API key terkonfigurasi.
         </div>
      )}

      {analysis && (
         <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-display">
            <ReactMarkdown>{analysis}</ReactMarkdown>
         </div>
      )}
    </div>
  );
}
