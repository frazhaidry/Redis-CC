# BullMQ Email Queue

A simple background email-processing system built with **Node.js, Express, Redis, and BullMQ**.

This project builds on the Redis Queue project and introduces **BullMQ**, a production-oriented job queue library built on top of Redis.

---

# Tech Stack

* Node.js
* Express
* Redis
* BullMQ
* ioredis indirectly through BullMQ
* dotenv

---

# What You'll Learn

This project demonstrates:

* BullMQ queues
* BullMQ workers
* Redis as a queue backend
* Adding jobs
* Processing jobs asynchronously
* Job names
* Job data
* Retry attempts
* Exponential backoff
* Completed jobs
* Failed jobs
* Background workers

---

# Why BullMQ?

Previously, we created a queue manually using Redis Lists:

```text
LPUSH
RPOP
```

That works for learning, but a real background-job system needs much more.

For example:

```text
Basic Redis List
       ↓
      Queue
       ↓
     Problem
       ↓
What happens if worker crashes?
What if job fails?
Should we retry?
How many times?
When should we retry?
What jobs are completed?
What jobs failed?
```

BullMQ provides these features for us.

---

# Architecture

The application has three main parts:

```text
                  ┌───────────────┐
                  │    Client     │
                  └───────┬───────┘
                          │
                          │ POST /welcome-email
                          ▼
                  ┌───────────────┐
                  │ Express API   │
                  │  server.js    │
                  └───────┬───────┘
                          │
                          │ emailQueue.add()
                          ▼
                  ┌───────────────┐
                  │     Redis     │
                  │               │
                  │ emails queue  │
                  └───────┬───────┘
                          │
                          │ Worker gets job
                          ▼
                  ┌───────────────┐
                  │ BullMQ Worker │
                  │   worker.js   │
                  └───────┬───────┘
                          │
                          ▼
                    Send Email
```

The important idea is:

```text
API Server ≠ Worker
```

The API receives requests.

The worker processes background jobs.

---

# Project Structure

```text
bullmq-email/
│
├── node_modules/
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
│
├── server.js
├── queue.js
├── worker.js
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
npm install express bullmq dotenv
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
    "start": "node server.js",
    "dev": "node --watch server.js",
    "worker": "node worker.js"
  }
}
```

---

# Environment Variables

Create `.env`:

```env
PORT=3000

REDIS_HOST=localhost
REDIS_PORT=6379
```

If you're using a cloud Redis provider, you'll need to configure the connection appropriately for that provider.

---

# Running the Project

You need **two Node processes**.

### Terminal 1 — API Server

```bash
npm run dev
```

You should see:

```text
API server running on http://localhost:3000
```

### Terminal 2 — Worker

```bash
npm run worker
```

You should see:

```text
Email worker is running...
```

This is important.

If you only start the API server:

```text
POST /welcome-email
        ↓
      Redis
        ↓
      Job waiting
```

Nothing processes the job because the worker isn't running.

Once the worker starts:

```text
Redis
  ↓
Worker
  ↓
Process job
```

---

# Add a Welcome Email Job

Send:

```http
POST /welcome-email
```

with:

```json
{
  "to": "user@example.com",
  "name": "Rahul"
}
```

The API responds:

```json
{
  "message": "Welcome email job added to queue",
  "jobId": "1"
}
```

The API does **not** send the email.

It only creates a job.

---

# What Happens Internally?

This:

```js
await emailQueue.add(
  "welcome-email",
  {
    to,
    name
  }
);
```

creates a BullMQ job.

Conceptually:

```text
Job
│
├── id
│
├── name
│     └── welcome-email
│
└── data
      ├── to
      └── name
```

BullMQ stores the necessary job information in Redis.

---

# Worker Processing

The worker listens to:

```text
emails
```

When a job arrives:

```js
async (job) => {
  // process job
}
```

BullMQ provides the job:

```js
job.id
job.name
job.data
```

For example:

```text
job.id   → 1
job.name → welcome-email

job.data:
{
  to: "user@example.com",
  name: "Rahul"
}
```

---

# Retry System

One of the biggest advantages of BullMQ over our simple Redis List queue is **retries**.

The job is configured with:

```js
{
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000
  }
}
```

This means BullMQ can retry the job when processing fails.

Conceptually:

```text
Attempt 1
   ↓
  FAIL
   ↓
Wait 1 second
   ↓
Attempt 2
   ↓
  FAIL
   ↓
Wait 2 seconds
   ↓
Attempt 3
   ↓
  FAIL
   ↓
Job failed
```

The delay increases exponentially.

---

# Why Retries Matter

Imagine your email provider temporarily goes down:

```text
Your Worker
     ↓
Email Provider
     ↓
   ERROR
```

Without retries:

```text
Job → Failed
```

With retries:

```text
Job
 ↓
Attempt 1 → Failed
 ↓
Retry
 ↓
Attempt 2 → Failed
 ↓
Retry
 ↓
Attempt 3 → Success
```

This makes background processing much more reliable.

---

# Completed Jobs

BullMQ emits a `completed` event after successful processing.

```js
worker.on("completed", (job) => {
  console.log("Job completed");
});
```

This lets you monitor successful jobs.

---

# Failed Jobs

BullMQ also emits a `failed` event:

```js
worker.on("failed", (job, error) => {
  console.error(error);
});
```

This is useful for debugging and monitoring.

The `error` parameter tells you why the job failed.

---

# Simulating a Failure

To understand retries, temporarily change your worker:

```js
async (job) => {
  throw new Error("Something went wrong");
}
```

Now send a job.

You'll see BullMQ retry the job according to:

```js
attempts: 3
```

and:

```js
backoff: {
  type: "exponential",
  delay: 1000
}
```

This is a very useful experiment.

---

# Remove Completed Jobs

The project uses:

```js
removeOnComplete: 100
```

This tells BullMQ to keep only a limited number of completed jobs.

Otherwise, completed jobs could accumulate in Redis indefinitely.

Similarly:

```js
removeOnFail: 500
```

keeps a limited number of failed jobs.

---

# Important Concept: Queue vs Worker

This distinction is very important.

## Queue

```js
const emailQueue = new Queue("emails");
```

The Queue is responsible for **adding/managing jobs**.

Think:

```text
Queue
  ↓
"Here is a job that needs to be done."
```

---

## Worker

```js
const worker = new Worker("emails", async (job) => {
  // process job
});
```

The Worker is responsible for **doing the work**.

Think:

```text
Worker
  ↓
"I'll process that job."
```

---

# Why Separate Them?

You can run:

```text
API Server
```

and:

```text
Worker
```

as completely separate processes.

For example:

```text
                    ┌───────────────┐
                    │ API Server #1 │
                    └───────┬───────┘
                            │
                            ▼
                       ┌─────────┐
                       │  Redis  │
                       └────┬────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        Worker #1       Worker #2      Worker #3
```

This allows you to scale workers independently.

If you have thousands of emails to send, you can run more workers.

---

# The Most Important Difference From Your Previous Project

Previously:

```text
Express
   ↓
Redis List
   ↓
RPOP
   ↓
Process Job
```

You had to manually call:

```http
GET /emails/process-one
```

With BullMQ:

```text
Express
   ↓
BullMQ Queue
   ↓
Redis
   ↓
BullMQ Worker
   ↓
Automatically process job
```

You don't need to manually call an endpoint to process every job.

The worker is continuously listening for work.

---

# Things to Experiment With

## 1. Add multiple jobs

Send:

```json
{
  "to": "user1@example.com",
  "name": "Rahul"
}
```

Then:

```json
{
  "to": "user2@example.com",
  "name": "Aman"
}
```

Then:

```json
{
  "to": "user3@example.com",
  "name": "Priya"
}
```

Watch the worker process them.

---

## 2. Stop the worker

Send several jobs while the worker is stopped.

You'll notice:

```text
API
 ↓
Redis
 ↓
Jobs waiting
```

Start the worker again:

```bash
npm run worker
```

The worker will start processing the waiting jobs.

This demonstrates the main benefit of a background queue.

---

## 3. Test retries

Change the worker to:

```js
throw new Error("Testing retry system");
```

Then send a job and watch the retry behavior.

---

# Important Production Concepts to Learn Later

BullMQ gives you many features beyond this basic example.

Eventually learn about:

* Job priorities
* Delayed jobs
* Repeatable/scheduled jobs
* Concurrency
* Rate limiting
* Retries
* Backoff strategies
* Job progress
* Failed jobs
* Job cleanup
* Dead-letter patterns
* Graceful worker shutdown

Don't try to learn all of these at once.

First understand:

```text
Queue
  ↓
Job
  ↓
Redis
  ↓
Worker
  ↓
Success / Failure
  ↓
Retry
```

Once this flow is clear, the other BullMQ features become much easier to understand.

---

# Key Mental Model

Remember these three things:

```text
Queue
  ↓
Puts work into the system
```

```text
Redis
  ↓
Stores/manages the queue state
```

```text
Worker
  ↓
Does the actual work
```

So your complete application becomes:

```text
Client
   │
   │ POST /welcome-email
   ▼
Express API
   │
   │ emailQueue.add()
   ▼
BullMQ
   │
   ▼
Redis
   │
   │ job available
   ▼
BullMQ Worker
   │
   ▼
Send Email
   │
   ├── Success → completed
   │
   └── Failure → retry
```

That is the core idea behind the BullMQ project.
