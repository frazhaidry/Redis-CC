
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

// Allows Express to parse JSON request bodies
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
 * Generates the Redis key for a JSON-based user profile.
 *
 * Example:
 * user:123:json
 */
function generateJSONKey(id) {
  return `user:${id}:json`;
}

/**
 * Generates the Redis key for a Hash-based user profile.
 *
 * Example:
 * user:123:hash
 */
function generateHashKey(id) {
  return `user:${id}:hash`;
}

// ============================================================
// Health Check
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "Redis User Profile API is running",
  });
});

// ============================================================
// Store User Profile as JSON
// ============================================================

app.post("/user/:id/json", async (req, res) => {
  try {
    const { id } = req.params;
    const userProfile = req.body;

    // Make sure the request body is not empty.
    if (!userProfile || Object.keys(userProfile).length === 0) {
      return res.status(400).json({
        error: "User profile is required",
      });
    }

    const key = generateJSONKey(id);

    /*
     * Redis stores strings.
     *
     * Therefore, we convert the JavaScript object
     * into a JSON string before storing it.
     *
     * Example:
     *
     * {
     *   name: "Rahul",
     *   age: 22
     * }
     *
     * becomes:
     *
     * '{"name":"Rahul","age":22}'
     */
    await redis.set(key, JSON.stringify(userProfile));

    res.status(201).json({
      message: `User profile for ${id} stored as JSON`,
    });
  } catch (error) {
    console.error("Error storing JSON profile:", error);

    res.status(500).json({
      error: "Failed to store user profile",
    });
  }
});

// ============================================================
// Get User Profile stored as JSON
// ============================================================

app.get("/user/:id/json", async (req, res) => {
  try {
    const { id } = req.params;

    const key = generateJSONKey(id);

    // Get the JSON string stored in Redis.
    const userProfileJSON = await redis.get(key);

    // Redis returns null when the key does not exist.
    if (!userProfileJSON) {
      return res.status(404).json({
        error: "User profile not found",
      });
    }

    /*
     * Convert the JSON string back into
     * a JavaScript object.
     */
    const userProfile = JSON.parse(userProfileJSON);

    res.json(userProfile);
  } catch (error) {
    console.error("Error getting JSON profile:", error);

    res.status(500).json({
      error: "Failed to retrieve user profile",
    });
  }
});

// ============================================================
// Store User Profile as Redis Hash
// ============================================================

app.post("/user/:id/hash", async (req, res) => {
  try {
    const { id } = req.params;
    const userProfile = req.body;

    // Make sure the request body is not empty.
    if (!userProfile || Object.keys(userProfile).length === 0) {
      return res.status(400).json({
        error: "User profile is required",
      });
    }

    const key = generateHashKey(id);

    /*
     * Redis Hash stores data as field-value pairs.
     *
     * Example:
     *
     * HSET user:123:hash
     *      name "Rahul"
     *      age "22"
     *      city "Patna"
     *
     * ioredis accepts an object directly with HSET.
     */
    await redis.hset(key, userProfile);

    res.status(201).json({
      message: `User profile for ${id} stored as hash`,
    });
  } catch (error) {
    console.error("Error storing hash profile:", error);

    res.status(500).json({
      error: "Failed to store user profile",
    });
  }
});

// ============================================================
// Get User Profile stored as Redis Hash
// ============================================================

app.get("/user/:id/hash", async (req, res) => {
  try {
    const { id } = req.params;

    const key = generateHashKey(id);

    /*
     * HGETALL returns every field and value
     * stored inside the Redis Hash.
     */
    const userProfile = await redis.hgetall(key);

    /*
     * ioredis returns an empty object when the
     * Hash does not exist.
     */
    if (Object.keys(userProfile).length === 0) {
      return res.status(404).json({
        error: "User profile not found",
      });
    }

    res.json(userProfile);
  } catch (error) {
    console.error("Error getting hash profile:", error);

    res.status(500).json({
      error: "Failed to retrieve user profile",
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

