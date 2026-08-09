import { Worker } from "bullmq";
import { connection} from './queue.js';


const worker  = new Worker(
    "emails",
    async (job) => {
        console.log(`Processing job ${job.id} with data:`,job.name,  job.data);
        (await new Promise((resolve) => setTimeout(resolve, 1000)));
        console.log("Email job completed" , job.id , job.name , job.data);
    },

    {connection}
);


worker.on("completed", (job) => {
    console.log("Job completed" , job.id, job.name, job.data);
})

worker.on("failed" , (job, arr) => {
    console.log("Job failed" , job.id, job.name , job.data , err)
})