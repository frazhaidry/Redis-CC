
import "dotenv/config";
import express from "express";
import Redis from "ioredis";

const app = express();

// ============================================================
// Configuration
// ============================================================

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create Redis client
const redis = new Redis(REDIS_URL);

// ============================================================
// Middleware
// ============================================================

// Allows Express to read JSON request bodies
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
// Helper Functions
// ============================================================

/**
 * Generates the Redis key used to store an OTP.
 *
 * Example:
 * phone: 9876543210
 * key:   otp:9876543210
 */
function generateOTPKey(phone) {
  return `otp:${phone}`;
}

/**
 * Generates a random 6-digit OTP.
 *
 * Example:
 * 482193
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================================
// Health Check
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "Redis OTP API is running",
  });
});

// ============================================================
// Generate OTP
// ============================================================

app.post("/otp", async (req, res) => {
  try {
    const { phone } = req.body;

    // Make sure the phone number was provided.
    if (!phone) {
      return res.status(400).json({
        error: "Phone number is required",
      });
    }

    // Generate a new 6-digit OTP.
    const otp = generateOTP();

    // Generate the Redis key.
    const key = generateOTPKey(phone);

    /*
     * Store the OTP in Redis.
     *
     * EX 60 means the key will automatically
     * expire after 60 seconds.
     *
     * Redis command:
     *
     * SET otp:9876543210 482193 EX 60
     */
    await redis.set(key, otp, "EX", 60);

    /*
     * In a real application, the OTP would be
     * sent using an SMS service.
     *
     * We log it here only for learning/testing.
     */
    console.log(`OTP for ${phone}: ${otp}`);

    res.status(201).json({
      message: `OTP sent to ${phone}`,
    });
  } catch (error) {
    console.error("Error generating OTP:", error);

    res.status(500).json({
      error: "Failed to generate OTP",
    });
  }
});

// ============================================================
// Verify OTP
// ============================================================

app.post("/otp/:phone/verify", async (req, res) => {
  try {
    const { phone } = req.params;
    const { otp } = req.body;

    // Make sure the OTP was provided.
    if (!otp) {
      return res.status(400).json({
        error: "OTP is required",
      });
    }

    // Generate the Redis key for this phone number.
    const key = generateOTPKey(phone);

    /*
     * Get the OTP stored in Redis.
     *
     * If the key has expired, Redis returns null.
     */
    const storedOTP = await redis.get(key);

    // OTP doesn't exist or has expired.
    if (!storedOTP) {
      return res.status(404).json({
        error: "OTP expired or not found",
      });
    }

    // Compare the user's OTP with the stored OTP.
    if (storedOTP !== otp) {
      return res.status(400).json({
        error: "Invalid OTP",
      });
    }

    /*
     * OTP is correct.
     *
     * Delete it immediately so the same OTP
     * cannot be used again.
     */
    await redis.del(key);

    res.json({
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);

    res.status(500).json({
      error: "Failed to verify OTP",
    });
  }
});

// ============================================================
// Check OTP TTL
// ============================================================

app.get("/otp/:phone/ttl", async (req, res) => {
  try {
    const { phone } = req.params;

    const key = generateOTPKey(phone);

    /*
     * TTL tells us how many seconds are remaining
     * before the Redis key expires.
     *
     * Possible values:
     *
     * positive number -> seconds remaining
     * -1              -> key exists but has no expiry
     * -2              -> key does not exist
     */
    const ttl = await redis.ttl(key);

    res.json({
      phone,
      ttl,
    });
  } catch (error) {
    console.error("Error checking OTP TTL:", error);

    res.status(500).json({
      error: "Failed to check OTP TTL",
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

