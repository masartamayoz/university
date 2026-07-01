import { GoogleGenAI } from "@google/genai";
import express from "express";
import path from "path";

const app = express();
app.use(express.json());

/* Lazy-initialized Gemini client */
let aiInstance: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

/* AI Chat Proxy endpoint */
app.post("/api/chat", async (req, res) => {
  try {
    const { system, messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages array" });
    }

    const gemini = getGemini();

    /* Translate message roles: 'assistant' -> 'model', 'user' -> 'user' */
    const translatedContents = messages.map((m: any) => {
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      };
    });

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: translatedContents,
      config: {
        systemInstruction: system || "أنت مساعد توجيه جامعي تذكاري مفيد.",
      },
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
});

/* Serve Frontend as static files from public (dev) or dist/public (production) */
async function startServer() {
  const PORT = 3000;

  const publicPath = process.env.NODE_ENV === "production"
    ? path.join(process.cwd(), "dist", "public")
    : path.join(process.cwd(), "public");

  app.use(express.static(publicPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
