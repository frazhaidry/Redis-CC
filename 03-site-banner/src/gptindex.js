
import express from "express";
import Redis from "ioredis";

const app = express();

app.use(express.json());

// ============================================================
// Configuration
// ============================================================

const PORT = process.env.PORT || 3000;

const REDIS_URL =
  process.env.REDIS_URL || "redis://localhost:6379";

// Redis key used to store the application banner
const BANNER_KEY = "app:banner";

// ============================================================
// Redis Connection
// ============================================================

const redis = new Redis(REDIS_URL);

// Redis connection events are useful for
// monitoring and debugging.

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
    message: "Redis Banner API is running",
  });
});

// ============================================================
// GET /banner
// ============================================================
// Retrieves the banner stored in Redis.
//
// Redis command:
// GET app:banner
// ============================================================

app.get("/banner", async (req, res) => {
  try {
    const banner = await redis.get(BANNER_KEY);

    res.json({
      banner,
    });
  } catch (error) {
    console.error("Error fetching banner:", error);

    res.status(500).json({
      error: "Failed to fetch banner",
    });
  }
});

// ============================================================
// POST /banner
// ============================================================
// Creates or updates the application banner.
//
// Redis command:
// SET app:banner "Welcome to my application"
// ============================================================

app.post("/banner", async (req, res) => {
  try {
    const { banner } = req.body;

    // Validate the request body.
    if (!banner || typeof banner !== "string") {
      return res.status(400).json({
        error: "Banner must be a non-empty string",
      });
    }

    // SET creates the key if it doesn't exist.
    // If the key already exists, SET updates its value.
    await redis.set(BANNER_KEY, banner);

    res.status(201).json({
      message: "Banner updated successfully",
      banner,
    });
  } catch (error) {
    console.error("Error updating banner:", error);

    res.status(500).json({
      error: "Failed to update banner",
    });
  }
});

// ============================================================
// DELETE /banner
// ============================================================
// Deletes the banner from Redis.
//
// Redis command:
// DEL app:banner
//
// Redis returns:
// 1 → key was deleted
// 0 → key did not exist
// ============================================================

app.delete("/banner", async (req, res) => {
  try {
    const deleted = await redis.del(BANNER_KEY);

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    res.json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting banner:", error);

    res.status(500).json({
      error: "Failed to delete banner",
    });
  }
});

// ============================================================
// GET /banner/exists
// ============================================================
// Checks whether the banner key exists in Redis.
//
// Redis command:
// EXISTS app:banner
//
// Redis returns:
// 1 → key exists
// 0 → key does not exist
// ============================================================

app.get("/banner/exists", async (req, res) => {
  try {
    const exists = await redis.exists(BANNER_KEY);

    res.json({
      exists: exists === 1,
    });
  } catch (error) {
    console.error("Error checking banner:", error);

    res.status(500).json({
      error: "Failed to check banner",
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
  console.log(`Server running on http://localhost:${PORT}`);
});

