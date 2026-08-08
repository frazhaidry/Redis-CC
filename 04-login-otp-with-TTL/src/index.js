import express from 'express';
import redis from 'ioredis';

const app = express();
app.use(express.json());


const redis = new redis(process.env.REDIS_URL || 'redis://localhost:6379');

function generateOTP(phone){
    return `otp:${phone}`;
}

app.post("/otp", async(req , res) => {
    const {phone} = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await redis.set(generateOTP(phone), otp, "EX", 60);
    res.json({message: `OTP sent to ${phone}`});
})


app.get("/otp/:phone", async(req, res) => { 
    const {phone, otp} = req.params;
    const storedOTP = await redis.get(generateOTP(phone));
    if (!storedOTP) {
        return res.status(404).json({error: "OTP expired or not found"});
    }

    if(storedOTP !== otp) {
        return res.status(400).json({error: "Invalid OTP"});
    }

    await redis.del(generateOTP(phone));
    
    res.json({message: "OTP verified successfully"});
});


app.get('/otp/:phone/ttl', async(req, res) => {
    const {phone} = req.params;
    const ttl = await redis.ttl(generateOTP(phone)); 
    res.json({ttl}); 
});