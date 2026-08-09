import express from 'express';
import Redis from 'ioredis';

const app = express();
app.use(express.json());

// const redis = new Redis({process.env.REDIS_URL || 'redis://localhost:6379'});

const QUEUE_NAME = 'queue:emails';

app.post('/send-email', async(req, res) => {
    const job = {
        to : req.body.to,
        subject : req.body.subject || "No subject",
        body : req.body.body || "No body",
        createdAt : new Date().toISOString()
    }
    await redis.lpush(QUEUE_NAME, JSON.stringify(job));
    res.status(200).json({message: 'Email job added to queue', job});
})

app.get('/emails/process-one' , async(req, res) => {
    const rawjob = await redis.rpop(QUEUE_NAME);
    if(!rawjob) {
        return res.status(404).json({message: 'No email jobs in queue'});
    }

    const job = JSON.parse(rawjob);
    // Here you would normally send the email using a service like nodemailer or an external API.
    // For demonstration purposes, we'll just log the job to the console.   
    res.status(200).json({message: 'Processing email job', job});
})


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});