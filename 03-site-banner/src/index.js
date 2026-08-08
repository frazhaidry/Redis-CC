import express from 'express';
import Redis from 'ioredis';

const app = express();

app.use(express.json());


const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const BANNER_KEY = "app:banner";

app.get('/banner', async (req, res) => {
  const banner = await redis.get(BANNER_KEY);
  res.json({ banner });
});

app.post('/banner', async (req, res) => {
  const { banner } = req.body;
  await redis.set(BANNER_KEY, banner || "No banner set");
  res.json({ message: 'Banner updated successfully' });
});