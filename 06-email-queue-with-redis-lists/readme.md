# Redis Email Queue

A simple email job queue built with **Node.js, Express, Redis, and ioredis**.

This project demonstrates how Redis **Lists** can be used to create a basic FIFO (First In, First Out) queue.

The application does not actually send emails. Instead, it creates email jobs, stores them in Redis, and provides an endpoint to process those jobs.

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

* Redis Lists
* `LPUSH`
* `RPOP`
* `LLEN`
* `LRANGE`
* FIFO queues
* Producer/consumer architecture
* JSON serialization
* JSON deserialization
* Redis key naming

---

# How the Queue Works

The basic architecture is:

```text
              Producer
                 │
                 │ POST /send-email
                 ▼
        ┌───────────────────┐
        │       Redis       │
        │                   │
        │  queue:emails     │
        │                   │
        │  Job 1            │
        │  Job 2            │
        │  Job 3            │
        └───────────────────┘
                 │
                 │ RPOP
                 ▼
              Consumer
                 │
                 ▼
            Send Email
```

The API that adds jobs is the **producer**.

The API that processes jobs is acting as the **consumer**.

---

# Project Structure

```text
redis-email-queue/
│
├── node_modules/
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js
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

You can also add:

```json
{
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
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

If you're using Redis Cloud:

```env
REDIS_URL=rediss://your-redis-connection-string
```

Never commit `.env` to Git.

Add this to `.gitignore`:

```gitignore
node_modules/
.env
```

---

# Running the Application

Start the server:

```bash
npm run dev
```

You should see:

```text
Redis connected
Redis is ready
Server running on http://localhost:3000
```

---

# API Endpoints

## 1. Health Check

### Request

```http
GET /
```

### Response

```json
{
  "message": "Redis Email Queue API is running"
}
```

---

# 2. Add Email Job

This endpoint acts as the **producer**.

### Request

```http
POST /send-email
```

### Body

```json
{
  "to": "user@example.com",
  "subject": "Welcome!",
  "body": "Welcome to our application."
}
```

### Response

```json
{
  "message": "Email job added to queue",
  "job": {
    "to": "user@example.com",
    "subject": "Welcome!",
    "body": "Welcome to our application.",
    "createdAt": "2026-08-09T12:00:00.000Z"
  }
}
```

---

# What Happens in Redis?

The application creates a job:

```json
{
  "to": "user@example.com",
  "subject": "Welcome!",
  "body": "Welcome to our application.",
  "createdAt": "2026-08-09T12:00:00.000Z"
}
```

Then converts it into a string:

```js
JSON.stringify(job)
```

and executes:

```text
LPUSH queue:emails "<job>"
```

The Redis List looks conceptually like:

```text
queue:emails

LEFT                         RIGHT
 ↓                             ↓

[ Job 3 ][ Job 2 ][ Job 1 ]
```

---

# 3. Process One Email

This endpoint acts as the **consumer**.

### Request

```http
GET /emails/process-one
```

The application executes:

```text
RPOP queue:emails
```

The oldest job is removed from the queue.

### Response

```json
{
  "message": "Processing email job",
  "job": {
    "to": "user@example.com",
    "subject": "Welcome!",
    "body": "Welcome to our application.",
    "createdAt": "2026-08-09T12:00:00.000Z"
  }
}
```

For this learning project, the job is simply printed to the console.

In a real application, this is where you would send the email.

---

# Why LPUSH + RPOP?

This is one of the most important concepts in this project.

We add jobs using:

```text
LPUSH
```

and remove jobs using:

```text
RPOP
```

Imagine these jobs arrive in this order:

```text
Job A
Job B
Job C
```

After `LPUSH` operations, the Redis List looks like:

```text
[ Job C ][ Job B ][ Job A ]
```

Then `RPOP` removes:

```text
Job A
```

Then:

```text
Job B
```

Then:

```text
Job C
```

Therefore:

```text
First In
   ↓
First Out
```

This is called a **FIFO queue**.

---

# 4. Check Queue Size

### Request

```http
GET /emails/queue-size
```

### Response

```json
{
  "queue": "queue:emails",
  "size": 3
}
```

The application uses:

```text
LLEN queue:emails
```

`LLEN` tells you how many items are currently inside the Redis List.

---

# 5. View Pending Jobs

### Request

```http
GET /emails/jobs
```

### Response

```json
{
  "queue": "queue:emails",
  "size": 2,
  "jobs": [
    {
      "to": "user2@example.com",
      "subject": "Hello",
      "body": "Second email"
    },
    {
      "to": "user3@example.com",
      "subject": "Welcome",
      "body": "Third email"
    }
  ]
}
```

This uses:

```text
LRANGE queue:emails 0 -1
```

Unlike `RPOP`, `LRANGE` **does not remove anything**.

It only allows us to inspect the List.

---

# Redis List Commands

This project uses four important Redis List commands.

## LPUSH

Adds an item to the left side.

```text
LPUSH queue:emails "Job"
```

---

## RPOP

Removes and returns an item from the right side.

```text
RPOP queue:emails
```

---

## LLEN

Returns the number of items in the List.

```text
LLEN queue:emails
```

---

## LRANGE

Reads items from a specific range.

```text
LRANGE queue:emails 0 -1
```

`0` means the first item.

`-1` means the last item.

Therefore:

```text
LRANGE queue:emails 0 -1
```

means:

> Give me all the items in this List.

---

# Producer and Consumer

This project introduces an important backend architecture pattern.

## Producer

The producer creates jobs.

In this project:

```http
POST /send-email
```

The flow is:

```text
Client
  ↓
POST /send-email
  ↓
Express
  ↓
Redis List
```

---

## Consumer

The consumer processes jobs.

In this project:

```http
GET /emails/process-one
```

The flow is:

```text
Redis List
  ↓
RPOP
  ↓
Consumer
  ↓
Email Service
```

---

# Real-World Example

Imagine your application has 10,000 users.

You need to send a welcome email to every user.

You don't necessarily want your API request to wait while your server sends all those emails.

Instead:

```text
User signs up
     ↓
Create email job
     ↓
Put job in Redis
     ↓
Return response immediately
```

Then a worker can process the jobs separately:

```text
Redis Queue
    ↓
Worker
    ↓
Send Email
    ↓
Next Job
    ↓
Send Email
    ↓
Next Job
```

This is called **background job processing**.

---

# Important Problem With This Simple Queue

There is an important limitation with:

```text
RPOP
```

Imagine:

```text
Redis
  ↓
RPOP
  ↓
Job removed
  ↓
Worker crashes
  ↓
Email never sent
```

The job has already been removed from Redis.

Therefore, the job could be **lost**.

This simple project intentionally doesn't solve that problem because the goal is to understand Redis Lists first.

In production systems, you would want a more reliable queue design with features such as:

* Acknowledgements
* Retries
* Failed-job handling
* Dead-letter queues
* Multiple workers
* Job timeouts
* Persistent job state

Libraries such as BullMQ are commonly used when you need a more complete Redis-backed job queue.

---

# Important Redis Concept

A Redis List is not automatically a "queue."

It becomes a queue because of **how you use the List operations**.

For example:

```text
LPUSH + RPOP
```

creates FIFO behavior.

You could also use:

```text
LPUSH + LPOP
```

which gives you:

```text
Last In
   ↓
First Out
```

That behaves more like a **stack**.

So remember:

```text
LPUSH + RPOP
      ↓
     FIFO
      ↓
    Queue
```

and:

```text
LPUSH + LPOP
      ↓
     LIFO
      ↓
    Stack
```

---

# Experiments to Try

After adding a few jobs, try inspecting Redis directly.

### Check the entire queue

```text
LRANGE queue:emails 0 -1
```

### Check the queue size

```text
LLEN queue:emails
```

### Remove one job manually

```text
RPOP queue:emails
```

### Add a job manually

```text
LPUSH queue:emails "hello"
```

Then check:

```text
LRANGE queue:emails 0 -1
```

Experiment with `LPUSH`, `RPUSH`, `LPOP`, and `RPOP`.

Try to predict the order in which jobs will come out.

---

# Mental Model

Think of a Redis List as a real queue:

```text
                 Redis List

LEFT                                      RIGHT
 ↓                                           ↓

[ Job C ][ Job B ][ Job A ]

   ↑                                      ↑
 LPUSH                                    RPOP
 Add new job                         Process oldest job
```

So the application works like this:

```text
POST /send-email
       ↓
    LPUSH
       ↓
queue:emails
       ↓
     RPOP
       ↓
/emails/process-one
       ↓
   Process Job
```

---

# What You Should Learn From This Project

The key concepts are:

```text
Redis List
    ↓
LPUSH
    ↓
RPOP
    ↓
FIFO
    ↓
Producer / Consumer
    ↓
Background Jobs
```

Once you understand this, the next useful step is to learn how a **real worker continuously waits for jobs** instead of manually calling:

```http
GET /emails/process-one
```

That will introduce you to Redis blocking operations such as `BRPOP`, which makes this queue much more interesting.

```
```
