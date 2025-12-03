const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express().use(bodyParser.json());

// =================== CONFIG ===================
const CONFIG = {
    VERIFY_TOKEN: "vibecode",
    WHATSAPP_TOKEN: "EAATYnV0AGrEBQGiD3PmGZASK8uF9H7HfMHLeJcTyAZBqI7gWy3GjXKac0XgdNQbZCQmfZAW1rmdLUpYWUMUgDAA0hLlOWKNZAQ1VJtSCmSERiC9Konit3YmwhkI4QhoAvHDRDOK2D06kpJGMoMYZCxHYmdFCgANcmwuUSk5GRDwkUHYo7ppZBrmDDqKQdxc4DIQf1OZAZBVmeeE4LmUfENqaWuoTZBc6iJ3BKzj4FJUIydPy5fh7SFuOg3J5cFcnak2hDudU6R0al0DLJ0g8hJ61qm",
    PHONE_NUMBER_ID: "914348355095214",
    WEATHER_API_KEY: "15d7f3b7395c4e7c953131120250312"
};

// =================== SEND MESSAGE ===================
async function sendMessage(to, text) {
    try {
        await axios.post(
            `https://graph.facebook.com/v20.0/${CONFIG.PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to,
                type: "text",
                text: { body: text }
            },
            {
                headers: {
                    Authorization: `Bearer ${CONFIG.WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (error) {
        console.error("❌ WhatsApp Send Error:", error.response?.data || error.message);
    }
}

// =================== WEATHER FETCHER ===================
async function getWeather(location) {
    try {
        const url = `https://api.weatherapi.com/v1/current.json?key=${CONFIG.WEATHER_API_KEY}&q=${location}`;
        const res = await axios.get(url);

        const loc = res.data.location;
        const curr = res.data.current;

        return `
🌤 *Weather for ${loc.name}, ${loc.country}*
--------------------------------
Condition: *${curr.condition.text}*
Temperature: *${curr.temp_c}°C*
Feels Like: *${curr.feelslike_c}°C*
Humidity: *${curr.humidity}%*
Wind: *${curr.wind_kph} kph* ${curr.wind_dir}
Visibility: *${curr.vis_km} km*
Updated: ${curr.last_updated}
        `;
    } catch (err) {
        console.log("Weather API Error:", err.response?.data || err.message);
        return "❌ Could not find that location. Use *weather Harare*";
    }
}

// =================== VERIFY WEBHOOK ===================
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === "subscribe" && token === CONFIG.VERIFY_TOKEN) {
        console.log("✔ Webhook Verified!");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// =================== RECEIVE WHATSAPP MESSAGES ===================
app.post('/webhook', async (req, res) => {
    console.log("📥 Incoming Webhook:", JSON.stringify(req.body, null, 2));

    const entry = req.body.entry?.[0]?.changes?.[0]?.value;
    if (!entry || !entry.messages) return res.sendStatus(200);

    const message = entry.messages[0];
    if (message.type !== "text") return res.sendStatus(200);

    const from = message.from;
    const userText = message.text.body.toLowerCase();

    console.log(`📩 Message from ${from}: ${userText}`);

    // WEATHER COMMAND
    if (userText.startsWith("weather")) {
        let city = "Harare"; // default
        const parts = userText.split(" ");

        if (parts.length > 1) city = parts.slice(1).join(" ");

        const weatherReply = await getWeather(city);
        await sendMessage(from, weatherReply);

    } else {
        await sendMessage(
            from,
            "🌤 Send weather like this:\n\n• *weather Harare*\n• *weather Bulawayo*\n• *weather Mutare*"
        );
    }

    res.sendStatus(200);
});

// =================== START SERVER ===================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Weather Bot LIVE on Port " + PORT));
