
import "dotenv/config";
import express from "express";
import Redis from "ioredis";

const app = express();

// ============================================================
// Configuration
// ============================================================

const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const CHANNEL_NAME = "notifications";

// ============================================================
// Redis Publisher
// ============================================================

/*
 * This Redis connection is used ONLY for publishing messages.
 *
 * We keep publisher and subscriber connections separate.
 *
 * Why?
 *
 * Once a Redis connection enters subscriber mode, it is
 * dedicated to Pub/Sub commands and should not be used
 * for normal Redis operations.
 */
const publisher = new Redis(REDIS_URL);

// ============================================================
// Express Middleware
// ============================================================

app.use(express.json());

// ============================================================
// Redis Connection Events
// ============================================================

publisher.on("connect", () => {
  console.log("Redis publisher connected");
});

publisher.on("ready", () => {
  console.log("Redis publisher is ready");
});

publisher.on("error", (error) => {
  console.error("Redis publisher error:", error);
});

publisher.on("close", () => {
  console.log("Redis publisher connection closed");
});

// ============================================================
// Health Check
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "Redis Pub/Sub Publisher is running",
  });
});

// ============================================================
// Publish Notification
// ============================================================

app.post("/send-notification", async (req, res) => {
  try {
    const { title, message } = req.body;

    /*
     * Create the notification payload.
     */
    const payload = {
      title: title || "No title",
      message: message || "No message",
      createdAt: new Date().toISOString(),
    };

    /*
     * Publish the message to Redis.
     *
     * Redis command:
     *
     * PUBLISH notifications "<message>"
     *
     * The message is converted into JSON because
     * Redis Pub/Sub messages are strings.
     */
    const receivers = await publisher.publish(
      CHANNEL_NAME,
      JSON.stringify(payload)
    );

    /*
     * `publish()` returns the number of subscribers
     * that received the message.
     *
     * IMPORTANT:
     *
     * This is NOT the number of messages stored.
     * Pub/Sub does not store messages for later.
     */
    res.status(200).json({
      message: "Notification published",
      payload,
      receivers,
    });
  } catch (error) {
    console.error("Error publishing notification:", error);

    res.status(500).json({
      error: "Failed to publish notification",
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
  console.log(`Publisher API running on http://localhost:${PORT}`);
});



// ============================================================
// Redis Subscriber
// ============================================================

import "dotenv/config";
import Redis from "ioredis";

// ============================================================
// Configuration
// ============================================================

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const CHANNEL_NAME = "notifications";

// ============================================================
// Redis Subscriber
// ============================================================

/*
 * Create a separate Redis connection for the subscriber.
 *
 * Do NOT use the same Redis connection as the publisher.
 */
const subscriber = new Redis(REDIS_URL);

// ============================================================
// Redis Connection Events
// ============================================================

subscriber.on("connect", () => {
  console.log("Redis subscriber connected");
});

subscriber.on("ready", () => {
  console.log("Redis subscriber is ready");
});

subscriber.on("error", (error) => {
  console.error("Redis subscriber error:", error);
});

subscriber.on("close", () => {
  console.log("Redis subscriber connection closed");
});

// ============================================================
// Subscribe to Channel
// ============================================================

/*
 * Subscribe to the "notifications" channel.
 *
 * Redis command:
 *
 * SUBSCRIBE notifications
 */
subscriber.subscribe(CHANNEL_NAME, (error, count) => {
  if (error) {
    console.error("Failed to subscribe:", error);
    return;
  }

  console.log(`Subscribed to ${CHANNEL_NAME}`);
  console.log(`Total subscribed channels: ${count}`);
});

// ============================================================
// Receive Messages
// ============================================================

/*
 * Whenever somebody publishes a message to the
 * "notifications" channel, this event runs.
 */
subscriber.on("message", (channel, message) => {
  console.log("------------------------------------------");
  console.log(`Message received from: ${channel}`);

  try {
    /*
     * Redis gives us the message as a string.
     *
     * Convert JSON string back into a JavaScript object.
     */
    const notification = JSON.parse(message);

    console.log("Notification:", notification);

    /*
     * In a real application, this is where you could:
     *
     * - Send a push notification
     * - Send an email
     * - Send a WebSocket event
     * - Update another service
     * - Trigger some application logic
     */
  } catch (error) {
    console.error("Invalid notification JSON:", error);
  }

  console.log("------------------------------------------");
});

