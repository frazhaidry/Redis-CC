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

app.delete('/banner', async (req, res) => {
  await redis.del(BANNER_KEY);
  res.json({ success: true, message: 'Banner deleted successfully' });
});

app.get("/banner/exists", async( req, res) => {
  const exists = await redis.exists(BANNER_KEY);
  res.json({ exists: exists === 1 });
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});