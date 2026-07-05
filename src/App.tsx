import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThemeProvider } from "@/hooks/use-theme";
import React from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import GanjilPage from "@/pages/ganjil";
import GenapPage from "@/pages/genap";
import BesarPage from "@/pages/besar";
import KecilPage from "@/pages/kecil";
import KecilEkorPage from "@/pages/kecil-ekor";
import BesarEkorPage from "@/pages/besar-ekor";
import GenapEkorPage from "@/pages/genap-ekor";
import GanjilEkorPage from "@/pages/ganjil-ekor";
import AnalisaHarianPage from "@/pages/analisa-harian";
import PrediksiAIPage from "@/pages/prediksi-ai";
import RiwayatPrediksiPage from "@/pages/riwayat-prediksi";
import PrediksiDasarPage from "@/pages/prediksi-dasar";
import PrediksiShioPage from "@/pages/prediksi-shio";
import SilangHomoPage from "@/pages/silang-homo";
import ColokBebasPage from "@/pages/colok-bebas";
import Prediksi1DPage from "@/pages/prediksi-1d";
import Prediksi2DPage from "@/pages/prediksi-2d";
import Prediksi2DDepanPage from "@/pages/prediksi-2d-depan";
import Prediksi2D50LinePage from "@/pages/prediksi-2d-50line";
import PaitoPage from "@/pages/paito";
import ResultPage from "@/pages/result";
import KalkulatorInvestasiPage from "@/pages/kalkulator-investasi";
import { FloatingNav } from "@/components/floating-nav";
import { TopNav } from "@/components/top-nav";
import { DataSyncToastService } from "@/components/data-sync-toast-service";

import { AINotification } from "@/components/ai-notification";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function FreezeRouter({ currentPath, children }: { currentPath: string, children: React.ReactNode }) {
  return (
    <WouterRouter hook={() => [currentPath, () => {}]}>
      {children}
    </WouterRouter>
  );
}

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -15, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full flex-1"
      >
        <FreezeRouter currentPath={location}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/ganjil" component={GanjilPage} />
            <Route path="/genap" component={GenapPage} />
            <Route path="/besar" component={BesarPage} />
            <Route path="/kecil" component={KecilPage} />
            <Route path="/kecil-ekor" component={KecilEkorPage} />
            <Route path="/besar-ekor" component={BesarEkorPage} />
            <Route path="/genap-ekor" component={GenapEkorPage} />
            <Route path="/ganjil-ekor" component={GanjilEkorPage} />
            <Route path="/analisa-harian" component={AnalisaHarianPage} />
            <Route path="/prediksi-ai" component={PrediksiAIPage} />
            <Route path="/prediksi-dasar" component={PrediksiDasarPage} />
            <Route path="/prediksi-shio" component={PrediksiShioPage} />
            <Route path="/silang-homo" component={SilangHomoPage} />
            <Route path="/colok-bebas" component={ColokBebasPage} />
            <Route path="/prediksi-1d" component={Prediksi1DPage} />
            <Route path="/prediksi-2d" component={Prediksi2DPage} />
            <Route path="/prediksi-2d-depan" component={Prediksi2DDepanPage} />
            <Route path="/prediksi-2d-50line" component={Prediksi2D50LinePage} />
            <Route path="/riwayat-prediksi" component={RiwayatPrediksiPage} />
            <Route path="/paito" component={PaitoPage} />
            <Route path="/result" component={ResultPage} />
            <Route path="/kalkulator-investasi" component={KalkulatorInvestasiPage} />
                        <Route component={NotFound} />
          </Switch>
        </FreezeRouter>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter
            base={((import.meta as any).env?.BASE_URL || "/").replace(/\/$/, "")}
          >
            <TopNav />
            <Router />
            <FloatingNav />
            <AINotification />
            <DataSyncToastService />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
