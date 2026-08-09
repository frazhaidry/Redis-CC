
import "dotenv/config";
import express from "express";
import Redis from "ioredis";

const app = express();

// ============================================================
// Configuration
// ============================================================

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Name of the Redis List used as our email queue.
const QUEUE_NAME = "queue:emails";

// Create Redis client.
const redis = new Redis(REDIS_URL);

// ============================================================
// Middleware
// ============================================================

// Allows Express to read JSON request bodies.
app.use(express.json());

// ============================================================
// Redis Connection Events
// ============================================================

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("ready", () => {
  console.log("Redis is ready");
});

redis.on("error", (error) => {
  console.error("Redis error:", error);
});

redis.on("close", () => {
  console.log("Redis connection closed");
});

// ============================================================
// Health Check
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "Redis Email Queue API is running",
  });
});

// ============================================================
// Add Email Job to Queue
// ============================================================

app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    // The recipient is required.
    if (!to) {
      return res.status(400).json({
        error: "Recipient email is required",
      });
    }

    /*
     * Create an email job.
     *
     * In a real application, this object could contain
     * additional information such as:
     *
     * - userId
     * - template
     * - attachments
     * - priority
     * - retryCount
     */
    const job = {
      to,
      subject: subject || "No subject",
      body: body || "No body",
      createdAt: new Date().toISOString(),
    };

    /*
     * Redis Lists store strings.
     *
     * JSON.stringify() converts our JavaScript object
     * into a string before storing it.
     *
     * LPUSH adds the job to the LEFT side of the list.
     *
     * Redis command:
     *
     * LPUSH queue:emails "<job>"
     */
    await redis.lpush(QUEUE_NAME, JSON.stringify(job));

    res.status(201).json({
      message: "Email job added to queue",
      job,
    });
  } catch (error) {
    console.error("Error adding email job:", error);

    res.status(500).json({
      error: "Failed to add email job to queue",
    });
  }
});

// ============================================================
// Process One Email Job
// ============================================================

app.get("/emails/process-one", async (req, res) => {
  try {
    /*
     * RPOP removes and returns the item from
     * the RIGHT side of the list.
     *
     * Since we use:
     *
     * LPUSH → add from LEFT
     * RPOP  → remove from RIGHT
     *
     * the oldest job is processed first.
     *
     * This gives us FIFO behavior:
     *
     * First In → First Out
     */
    const rawJob = await redis.rpop(QUEUE_NAME);

    // No jobs available.
    if (!rawJob) {
      return res.status(404).json({
        message: "No email jobs in queue",
      });
    }

    /*
     * Redis gives us a string.
     *
     * Convert it back into a JavaScript object.
     */
    const job = JSON.parse(rawJob);

    /*
     * In a real application, this is where you would
     * actually send the email using something like:
     *
     * - Nodemailer
     * - SendGrid
     * - Resend
     * - Amazon SES
     * - Mailgun
     *
     * For now, we simply log the job.
     */
    console.log("Processing email job:", job);

    res.status(200).json({
      message: "Processing email job",
      job,
    });
  } catch (error) {
    console.error("Error processing email job:", error);

    res.status(500).json({
      error: "Failed to process email job",
    });
  }
});

// ============================================================
// Check Queue Length
// ============================================================

app.get("/emails/queue-size", async (req, res) => {
  try {
    /*
     * LLEN returns the number of items
     * currently waiting in the queue.
     */
    const queueSize = await redis.llen(QUEUE_NAME);

    res.json({
      queue: QUEUE_NAME,
      size: queueSize,
    });
  } catch (error) {
    console.error("Error checking queue size:", error);

    res.status(500).json({
      error: "Failed to check queue size",
    });
  }
});

// ============================================================
// View Pending Jobs
// ============================================================

app.get("/emails/jobs", async (req, res) => {
  try {
    /*
     * LRANGE allows us to inspect items in a Redis List.
     *
     * 0 = first item
     * -1 = last item
     *
     * This returns the complete list without removing anything.
     */
    const rawJobs = await redis.lrange(QUEUE_NAME, 0, -1);

    const jobs = rawJobs.map((rawJob) => JSON.parse(rawJob));

    res.json({
      queue: QUEUE_NAME,
      size: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("Error retrieving email jobs:", error);

    res.status(500).json({
      error: "Failed to retrieve email jobs",
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
// Global Error Handler
// ============================================================

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  res.status(500).json({
    error: "Internal server error",
  });
});

// ============================================================
// Start Server
// ============================================================

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
