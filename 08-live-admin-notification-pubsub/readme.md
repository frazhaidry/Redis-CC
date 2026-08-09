# Redis Pub/Sub Notifications

A simple **Redis Pub/Sub** project using Node.js, Express, and ioredis.

This project demonstrates how one application can publish messages to a Redis channel while one or more subscribers listen for those messages.

---

# Tech Stack

* Node.js
* Express
* Redis
* ioredis
* dotenv

---

# What You'll Learn

This project demonstrates:

* Redis Pub/Sub
* `PUBLISH`
* `SUBSCRIBE`
* Redis channels
* Publishers
* Subscribers
* Real-time message delivery
* Separate Redis connections
* JSON serialization
* JSON parsing

---

# What Is Pub/Sub?

Pub/Sub means:

> **Publish / Subscribe**

Instead of putting data into a queue for one worker to process, a publisher sends a message to a **channel**.

Any subscriber listening to that channel receives the message.

The basic architecture is:

```text
                    Publisher
                        │
                        │ PUBLISH
                        ▼
                 ┌──────────────┐
                 │     Redis    │
                 │              │
                 │ notifications│
                 │    channel   │
                 └──────┬───────┘
                        │
              ┌─────────┼─────────┐
              │         │         │
              ▼         ▼         ▼
         Subscriber  Subscriber  Subscriber
             #1          #2          #3
```

This is different from a queue.

---

# Project Structure

```text
redis-pubsub/
│
├── node_modules/
├── .env
├── .gitignore
├── package.json
├── package-lock.json
│
├── publisher.js
├── subscriber.js
│
└── README.md
```

---

# Installation

## 1. Initialize the project

```bash
npm init -y
```

## 2. Install dependencies

```bash
npm install express ioredis dotenv
```

## 3. Enable ES Modules

Add this to `package.json`:

```json
{
  "type": "module"
}
```

You can also add scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "node --watch publisher.js",
    "publisher": "node publisher.js",
    "subscriber": "node subscriber.js"
  }
}
```

---

# Environment Variables

Create a `.env` file:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
```

If you're using a cloud Redis provider, replace `REDIS_URL` with your Redis connection URL.

---

# Running the Project

You need to run **two processes**.

## Terminal 1 — Subscriber

Start the subscriber first:

```bash
npm run subscriber
```

You should see something similar to:

```text
Redis subscriber connected
Redis subscriber is ready
Subscribed to notifications
```

---

## Terminal 2 — Publisher

Start the API:

```bash
npm run publisher
```

You should see:

```text
Publisher API running on http://localhost:3000
```

Now the two processes are connected through Redis.

---

# Sending a Notification

Send a POST request:

```http
POST /send-notification
```

with:

```json
{
  "title": "New Message",
  "message": "You have received a new message."
}
```

You can use Postman, Thunder Client, curl, or any API client.

---

# What Happens?

The publisher creates:

```json
{
  "title": "New Message",
  "message": "You have received a new message.",
  "createdAt": "2026-08-10T00:00:00.000Z"
}
```

Then it converts the object into a JSON string:

```js
JSON.stringify(payload)
```

and publishes it:

```js
await publisher.publish(
  "notifications",
  JSON.stringify(payload)
);
```

Redis then sends the message to all subscribers currently subscribed to:

```text
notifications
```

---

# Subscriber Output

The subscriber receives the message:

```text
------------------------------------------
Message received from: notifications

Notification: {
  title: 'New Message',
  message: 'You have received a new message.',
  createdAt: '2026-08-10T00:00:00.000Z'
}
------------------------------------------
```

The subscriber converts the JSON string back into an object using:

```js
JSON.parse(message)
```

---

# Redis Commands

Redis Pub/Sub mainly revolves around two commands.

## PUBLISH

The publisher sends a message:

```text
PUBLISH notifications "Hello"
```

---

## SUBSCRIBE

The subscriber listens to a channel:

```text
SUBSCRIBE notifications
```

The channel name is:

```text
notifications
```

The publisher and subscriber must use the **same channel name**.

---

# What Is a Channel?

A channel is simply a named communication path.

For example:

```text
notifications
```

You could have:

```text
notifications
chat
orders
payments
system-events
```

For example:

```text
PUBLISH chat "Hello"
```

would only be received by subscribers listening to:

```text
chat
```

A subscriber listening to:

```text
notifications
```

would not receive it.

---

# Multiple Subscribers

This is where Pub/Sub becomes interesting.

Suppose you have:

```text
Subscriber #1
Subscriber #2
Subscriber #3
```

and all three subscribe to:

```text
notifications
```

Then:

```text
                 Publisher
                     │
                     ▼
                  Redis
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Client #1  Client #2  Client #3
```

All three receive the message.

For example:

```text
PUBLISH notifications "Hello"
```

results in:

```text
Subscriber #1 → Hello
Subscriber #2 → Hello
Subscriber #3 → Hello
```

This is called **fan-out**.

---

# Very Important: Pub/Sub Is Not a Queue

This is one of the most important concepts to understand.

You previously built a Redis queue and then learned BullMQ.

A queue behaves roughly like:

```text
Producer
   ↓
Queue
   ↓
Worker
```

The job waits until a worker processes it.

Pub/Sub is different:

```text
Publisher
   ↓
Redis Channel
   ↓
Subscribers
```

Messages are delivered to subscribers that are listening **at that moment**.

---

# Messages Are Not Stored

This is extremely important.

Imagine the subscriber is offline:

```text
Publisher
    ↓
Redis
    ↓
Subscriber ❌ offline
```

The message is not sitting in a queue waiting for the subscriber.

When the subscriber comes back:

```text
Subscriber
    ↓
SUBSCRIBE notifications
```

it will only receive **new messages**.

It does not automatically receive the old message.

---

# Queue vs Pub/Sub

The difference can be summarized like this:

```text
Redis Queue

Producer
   ↓
Queue
   ↓
Worker
   ↓
Process Job
```

The job waits.

Whereas:

```text
Redis Pub/Sub

Publisher
   ↓
Channel
   ↓
Subscribers
```

The message is delivered immediately to active subscribers.

---

# When Should You Use Pub/Sub?

Pub/Sub is useful when you want to broadcast events.

Examples:

### Real-time notifications

```text
User performs action
       ↓
Publisher
       ↓
Redis
       ↓
Notification subscribers
```

### Chat systems

```text
User A sends message
       ↓
Publisher
       ↓
Redis channel
       ↓
All relevant subscribers
```

### Live dashboards

```text
Backend event
     ↓
Redis Pub/Sub
     ↓
Dashboard
     ↓
Update UI
```

### WebSocket systems

A backend can use Redis Pub/Sub to communicate events between multiple server instances.

For example:

```text
             Redis
               │
       ┌───────┼───────┐
       ▼       ▼       ▼
    Server 1 Server 2 Server 3
       │       │       │
       ▼       ▼       ▼
    Clients Clients Clients
```

This becomes particularly useful when your application is running on multiple servers.

---

# Why Do We Need Two Redis Connections?

This is an important Redis concept.

We create:

```js
const publisher = new Redis(REDIS_URL);
```

and separately:

```js
const subscriber = new Redis(REDIS_URL);
```

You might wonder:

> Why not use one Redis connection?

Because once a Redis connection is put into subscriber mode using:

```text
SUBSCRIBE
```

it becomes dedicated to Pub/Sub subscription handling.

Therefore, keep them separate:

```text
Publisher Connection
       │
       └── PUBLISH


Subscriber Connection
       │
       └── SUBSCRIBE
```

---

# What Does `publish()` Return?

This line:

```js
const receivers = await publisher.publish(
  CHANNEL_NAME,
  JSON.stringify(payload)
);
```

returns the number of subscribers that received the message.

For example:

```text
receivers = 3
```

means:

```text
3 subscribers received the message
```

It does **not** mean:

```text
3 messages were stored
```

and it does not mean:

```text
3 subscribers will receive it later
```

If nobody is subscribed:

```text
receivers = 0
```

The message is effectively gone.

---

# Experiment 1 — One Subscriber

Start:

```bash
npm run subscriber
```

Then send:

```http
POST /send-notification
```

You should see:

```text
receivers: 1
```

---

# Experiment 2 — Multiple Subscribers

Open another terminal and run:

```bash
npm run subscriber
```

Now you have:

```text
Subscriber #1
Subscriber #2
```

Both are listening to:

```text
notifications
```

Send another notification.

You should see the message appear in **both subscriber terminals**.

The API should report:

```json
{
  "receivers": 2
}
```

This is the best experiment to understand Pub/Sub.

---

# Experiment 3 — Stop the Subscribers

Stop all subscriber processes.

Then send a notification.

You will likely see:

```json
{
  "receivers": 0
}
```

Now start the subscriber again.

You will **not** receive the previous notification.

Send another notification.

The subscriber receives the new one.

This demonstrates the most important Pub/Sub characteristic:

```text
No active subscriber
        ↓
No delivery
```

---

# Pub/Sub Mental Model

Think of Redis Pub/Sub like a radio station.

```text
Radio Station
     ↓
Broadcast
     ↓
Radio Channel
     ↓
Listeners
```

If your radio is turned off when the broadcast happens:

```text
Radio OFF
   ↓
You miss the broadcast
```

When you turn it on later, you don't automatically hear the old broadcast.

That's very similar to Redis Pub/Sub.

---

# Queue Mental Model

A queue is more like a mailbox:

```text
Producer
   ↓
Mailbox
   ↓
Worker
```

The message stays there until somebody processes it.

So:

```text
Pub/Sub
   ↓
Broadcast
```

while:

```text
Queue
   ↓
Work waiting to be processed
```

---

# Pub/Sub vs BullMQ

You have now learned both concepts, so remember this distinction:

| Feature                              | Redis Pub/Sub           | BullMQ                   |
| ------------------------------------ | ----------------------- | ------------------------ |
| Main purpose                         | Broadcasting events     | Background jobs          |
| Message stored?                      | No                      | Yes                      |
| Offline subscriber gets old message? | No                      | Job can wait             |
| Multiple consumers                   | All subscribers receive | Jobs are distributed     |
| Retry system                         | No built-in job retry   | Yes                      |
| Job state                            | No                      | Yes                      |
| Best for                             | Real-time events        | Reliable background work |

---

# Important Limitation

Do not use basic Redis Pub/Sub when losing a message would be unacceptable.

For example, imagine:

```text
Payment completed
       ↓
Redis Pub/Sub
       ↓
Notification service
```

If the notification service is offline at that exact moment, it won't receive the event.

For critical background work, a durable queue such as BullMQ is usually a better fit.

---

# The Three Redis Patterns You've Learned

At this point, you have seen three different approaches.

## 1. Redis List

```text
LPUSH + RPOP
```

Used to understand basic queues.

```text
Producer
   ↓
Redis List
   ↓
Consumer
```

---

## 2. BullMQ

Built on Redis.

```text
API
 ↓
BullMQ Queue
 ↓
Redis
 ↓
BullMQ Worker
```

Provides:

* Retries
* Backoff
* Job states
* Delayed jobs
* Worker management
* Concurrency

---

## 3. Redis Pub/Sub

Used for real-time broadcasting.

```text
Publisher
     ↓
Redis Channel
     ↓
┌────┼────┐
▼    ▼    ▼
S1   S2   S3
```

Every active subscriber receives the message.

---

# Final Mental Model

Keep this picture in your head:

```text
                    REDIS


     QUEUE                         PUB/SUB
       │                              │
       ▼                              ▼

  "Do this work"                "Something happened"
       │                              │
       ▼                              ▼
   BullMQ                        Channel
       │                              │
       ▼                         ┌────┼────┐
    Worker                       ▼    ▼    ▼
       │                         S1   S2   S3
       ▼
    Process
```

**Queue/BullMQ = "Someone needs to do this."**

**Pub/Sub = "Everyone listening should know this happened."**
