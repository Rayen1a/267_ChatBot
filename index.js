const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.redirect('/index.html');
});

app.post("/api/chat", async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ 
                error: "Messages harus berupa array" 
            });
        }

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions", 
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "nvidia/nemotron-3.5-super-vl:free",
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: true,
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error("OpenRouter Error:", errorData);
            

    } catch (error) {
        console.error("Server Error:", error);
        
        if (!res.headersSent) {
            res.status(500).json({ 
                error: "Terjadi kesalahan pada server" 
            });
        } else {
            res.write(`data: ${JSON.stringify("Terjadi kesalahan pada server")}\n\n`);
            res.end();
        }
    }
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});