
import "dotenv/config";
import express from "express";

import { emailQueue } from "./queue.js";

const app = express();

// ============================================================
// Configuration
// ============================================================

const PORT = process.env.PORT || 3000;

// ============================================================
// Middleware
// ============================================================

app.use(express.json());

// ============================================================
// Health Check
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "BullMQ Email Queue API is running",
  });
});

// ============================================================
// Add Welcome Email Job
// ============================================================

app.post("/welcome-email", async (req, res) => {
  try {
    const { to, name } = req.body;

    // Basic validation
    if (!to) {
      return res.status(400).json({
        error: "Recipient email is required",
      });
    }

    /*
     * Add a job to the BullMQ queue.
     *
     * "welcome-email" -> job name
     *
     * The second argument contains the data
     * that the worker will receive.
     */
    const job = await emailQueue.add(
      "welcome-email",
      {
        to,
        name: name || "User",
      },
      {
        /*
         * If the job fails, BullMQ will retry it
         * up to 3 times.
         */
        attempts: 3,

        /*
         * Exponential backoff means the delay
         * increases after every failed attempt.
         *
         * Attempt 1 fails → wait 1 second
         * Attempt 2 fails → wait 2 seconds
         * Attempt 3 fails → wait 4 seconds
         */
        backoff: {
          type: "exponential",
          delay: 1000,
        },

        /*
         * Keep completed jobs for a limited time.
         * This prevents Redis from filling up forever.
         */
        removeOnComplete: 100,

        /*
         * Keep the latest 500 failed jobs so
         * they can be inspected later.
         */
        removeOnFail: 500,
      }
    );

    res.status(201).json({
      message: "Welcome email job added to queue",
      jobId: job.id,
    });
  } catch (error) {
    console.error("Error adding email job:", error);

    res.status(500).json({
      error: "Failed to add email job",
    });
  }
});

// ============================================================
// 404 Handler
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

// ============================================================
// Start Server
// ============================================================

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});





// queue.js


import { Queue } from "bullmq";

// ============================================================
// Redis Connection
// ============================================================

/*
 * BullMQ uses Redis as its backend.
 *
 * For local Redis:
 *
 * localhost:6379
 *
 * Later, you can replace these values with
 * your cloud Redis configuration.
 */
const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
};

// ============================================================
// Email Queue
// ============================================================

/*
 * Create a BullMQ queue named "emails".
 *
 * The queue itself does not process jobs.
 *
 * It only adds and manages jobs.
 *
 * The Worker in worker.js is responsible
 * for actually processing them.
 */
const emailQueue = new Queue("emails", {
  connection,
});

// Export both so other files can use them.
export { emailQueue, connection };





// worker.js


import "dotenv/config";
import { Worker } from "bullmq";

import { connection } from "./queue.js";

// ============================================================
// Email Worker
// ============================================================

/*
 * The Worker listens to the "emails" queue.
 *
 * Whenever a job is available, this function runs.
 */
const worker = new Worker(
  "emails",

  async (job) => {
    console.log("==========================================");
    console.log(`Processing job: ${job.id}`);
    console.log(`Job name: ${job.name}`);
    console.log("Job data:", job.data);

    /*
     * In a real application, this is where you
     * would call an email service such as:
     *
     * - Nodemailer
     * - Resend
     * - SendGrid
     * - Amazon SES
     *
     * We use a timeout to simulate email sending.
     */
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    console.log(`Email job completed: ${job.id}`);
    console.log("==========================================");
  },

  {
    connection,
  }
);

// ============================================================
// Worker Events
// ============================================================

/*
 * Fired when a job is successfully processed.
 */
worker.on("completed", (job) => {
  console.log(
    `Job completed successfully: ${job.id} (${job.name})`
  );
});

/*
 * Fired when a job fails.
 *
 * error contains information about why
 * the job failed.
 */
worker.on("failed", (job, error) => {
  console.error(
    `Job failed: ${job?.id} (${job?.name})`
  );

  console.error("Error:", error.message);
});

/*
 * Fired when the worker encounters
 * a general error.
 */
worker.on("error", (error) => {
  console.error("Worker error:", error);
});

console.log("Email worker is running...");

