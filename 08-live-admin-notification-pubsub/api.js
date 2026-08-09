import express from "express";

import Redis from "ioredis";

const app = express();
app.use(express.json());

// const publisher = new Redis({process.env.REDIS_URL || 'redis://localhost:6379'});

app.post('/send-notification', async(req, res) => {
    const payload = {
        title : req.body.title || "No title",
        message : req.body.message || "No message",
        createdAt : new Date().toISOString()
    }
    const receivers = await publisher.publish("notifications", JSON.stringify(payload));
    res.status(200).json({message: 'Notification published', payload, receivers});
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});