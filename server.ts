import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./src/backend/db";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // ─── API Endpoints ──────────────────────────────────────────────────────────

// GET /api/toto/latest
app.get("/api/toto/latest", (req, res) => {
  try {
    const market = req.query.market || "toto"; const latest = db.getTotoLatest(market as string);
    res.json(latest);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/toto/months
app.get("/api/toto/months", (req, res) => {
  try {
    const market = req.query.market || "toto"; const months = db.getTotoMonths(market as string);
    res.json(months);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/toto/schedule
app.get("/api/toto/schedule", (req, res) => {
  try {
    const market = (req.query.market as string) || "toto";
    const marketSessions: Record<string, string[]> = {
      toto: ["00:01", "13:00", "16:00", "19:00", "22:00", "23:00"],
    };
    res.json({ drawTimes: marketSessions[market] || marketSessions.toto });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/toto/nomor-taruhan
app.get("/api/toto/nomor-taruhan", (req, res) => {
  try {
    res.json(db.getNomorTaruhan());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/toto/nomor-taruhan
app.put("/api/toto/nomor-taruhan", (req, res) => {
  try {
    const { numbers } = req.body as { numbers: string[] };
    res.json(db.updateNomorTaruhan(numbers || []));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/toto/refresh
app.post("/api/toto/refresh", async (req, res) => {
  try {
    const count = await db.syncWithLiveWebsite();
    res.json({ success: true, message: `Toto Macau data refreshed successfully. Synchronized ${count} records.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/toto/sync-status
app.get("/api/toto/sync-status", (req, res) => {
  try {
    res.json(db.getSyncStatus());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/toto/verify
app.get("/api/toto/verify", (req, res) => {
  try {
    const report = db.verifyAndRepairData(false);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/toto/repair
app.post("/api/toto/repair", (req, res) => {
  try {
    const report = db.verifyAndRepairData(true);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/predictions
app.get("/api/predictions", (req, res) => {
  try {
    const market = req.query.market || "toto";
    res.json(db.getPredictions(market as string));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/predictions
app.post("/api/predictions", (req, res) => {
  try {
    const prediction = db.savePrediction(req.body);
    res.status(201).json(prediction);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/predictions/:id
app.delete("/api/predictions/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid prediction ID" });
      return;
    }
    db.deletePrediction(id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/ai-analysis
app.post("/api/ai-analysis", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured" });
    }
    const { historyLength, bbfs, predicted4D, confidence } = req.body;
    
    const prompt = `
Sebagai asisten pakar analisis data statistik Toto Macau, buatlah analisa singkat (maksimal 3 paragraf) berdasarkan data berikut:
- Angka BBFS unggulan: ${bbfs}
- Prediksi 4D utama: ${predicted4D}
- Tingkat kepercayaan algoritma: ${confidence}%
- Total data historis yang dianalisa: ${historyLength || 0} hasil terakhir.

Berikan penjelasan tentang momentum saat ini, seberapa kuat prediksi ini, dan saran bermain bijak (disclaimer). Jangan gunakan markdown header besar.
Gunakan bahasa Indonesia yang profesional namun menarik.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    
    res.json({ analysis: response.text });
  } catch (err: any) {
    console.error("AI Analysis Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Automated Scheduler ───────────────────────────────────────────────────

// Periodically check if there are newly passed WIB draw times and trigger a state refresh
setInterval(() => {
  try {
    db.refreshTotoData();
  } catch (err) {
    console.error("Failed to run scheduled auto-refresh check:", err);
  }
}, 60 * 1000); // Check once per minute

// ─── Serving Frontend Static Assets ──────────────────────────────────────────

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, we run the compiled dist/server.cjs from the project root
    // or we might need to resolve __dirname differently since it's CJS
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        next();
      } else {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  // ─── Server Start ────────────────────────────────────────────────────────────

  
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`====================================================`);
    console.log(` Macau Toto Prediction server started on port ${PORT}`);
    console.log(` Serving full-stack API and frontend SPA!`);
    console.log(`====================================================`);
  });

  // Graceful shutdown
  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}


startServer();
