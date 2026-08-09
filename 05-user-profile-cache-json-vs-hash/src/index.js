import express from 'express';
import Redis from 'ioredis';

const app = express();
app.use(express.json());


const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

app.post("/user/:id/json", async(req, res) => {
    const {id} = req.params;
    const userProfile = req.body;

    await redis.set(`user:${id}`, JSON.stringify(userProfile));
    res.json({message: `User profile for ${id} stored as JSON`});
});


app.get("/user/:id/json", async(req, res) => {
    const {id} = req.params;
    const userProfileJSON = await redis.get(`user:${id}`);
    if (!userProfileJSON) {
        return res.status(404).json({error: "User profile not found"});
    }
    const userProfile = JSON.parse(userProfileJSON);
    res.json(userProfile);
});

app.post("/user/:id/hash", async(req, res) => {
    await redis.hmset(`user:${req.params.id}`, req.body);
    res.json({message: `User profile for ${req.params.id} stored as hash`});
})

app.get("/user/:id/hash", async(req, res) => {
    const user = await redis.hgetall(`user:${req.params.id}:hash`);
    res.json(user);
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});
