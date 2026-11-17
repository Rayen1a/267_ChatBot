import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Wajib ada agar bisa membaca JSON dari frontend
app.use(express.json());
app.use(express.static("public"));

app.get('/', (req, res) => {
    res.sendFile(path.join('index.html'));
});

// 2. Endpoint harus POST dan path-nya "/api/chat"
app.post("/api/chat", async (req, res) => {
    try {
        const { messages } = req.body;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "inclusionai/ling-3.2-flash:free", // Sesuaikan dengan slug model Anda
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            return res.status(response.status).json({ error: errText });
        }

        // Header untuk Server-Sent Events (SSE) sesuai script.js
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;

                const data = trimmed.slice(5).trim();
                if (data === "[DONE]") {
                    res.write("data: [DONE]\n\n");
                    break;
                }

                try {
                    const parsed = JSON.parse(data);
                    const token = parsed.choices?.[0]?.delta?.content;
                    if (token) {
                        // Kirim string JSON token agar cocok dengan JSON.parse(data) di script.js
                        res.write(`data: ${JSON.stringify(token)}\n\n`);
                    }
                } catch (e) {
                    // Abaikan potongan JSON yang belum lengkap
                }
            }
        }

        res.end();
    } catch (error) {
        console.error("Server Error:", error);
        // Pastikan error dikirim dalam bentuk JSON, bukan HTML
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || "Internal Server Error" });
        } else {
            res.end();
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

