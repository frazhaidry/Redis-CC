import express from 'express';
import { emailQueue} from './queue.js';
import { type } from 'node:os';

const app = express();

app.use(express.json());

app.post('/welcome-email', async( req, res) => {
    const job = emailQueue.add("welcome-email", {
        to: req.body.to,
        name: req.body.name || "User",
    },{
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000
        }
    })
})


app.listen(3000, () => {
    console.log('Server is running on port 3000');
})