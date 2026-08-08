# Redis OTP API

A simple OTP verification API built with **Node.js, Express, and Redis**.

This project is mainly for learning how Redis can be used to store temporary data with an expiration time.

---

## Tech Stack

* Node.js
* Express
* Redis
* ioredis
* dotenv

---

## What This Project Teaches

This project demonstrates some important Redis commands and concepts:

* `SET`
* `GET`
* `DEL`
* `TTL`
* Key expiration using `EX`
* Temporary data storage
* Redis key naming
* Using Redis with an Express API

The main idea is:

```text
Generate OTP
     ↓
Store OTP in Redis
     ↓
Expire after 60 seconds
     ↓
User submits OTP
     ↓
Get OTP from Redis
     ↓
Compare OTP
     ↓
Delete OTP
     ↓
Verification successful
```

---

# Project Setup

## 1. Initialize the project

```bash
npm init -y
```

## 2. Install dependencies

```bash
npm install express ioredis dotenv
```

---

# Package Configuration

Because this project uses ES Modules, add the following to `package.json`:

```json
{
  "type": "module"
}
```

You can also add a start script:

```json
{
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  }
}
```

Then you can run:

```bash
npm run dev
```

---

# Environment Variables

Create a `.env` file in the root of the project.

```env
PORT=3000
REDIS_URL=redis://localhost:6379
```

If you're using a cloud Redis provider, replace the Redis URL:

```env
REDIS_URL=rediss://your-redis-connection-string
```

### Important

Never commit your `.env` file to Git.

Add this to `.gitignore`:

```gitignore
node_modules/
.env
```

---

# Redis Setup

This project expects Redis to be running at:

```text
localhost:6379
```

or at the URL provided in:

```env
REDIS_URL
```

You can verify that your Redis connection is working by starting the application.

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
  "message": "Redis OTP API is running"
}
```

---

# 2. Generate OTP

### Request

```http
POST /otp
```

### Body

```json
{
  "phone": "9876543210"
}
```

### Response

```json
{
  "message": "OTP sent to 9876543210"
}
```

For development purposes, the OTP is printed in the server console:

```text
OTP for 9876543210: 482193
```

> In a real application, the OTP should be sent through an SMS service instead of being logged.

---

# 3. Verify OTP

### Request

```http
POST /otp/9876543210/verify
```

### Body

```json
{
  "otp": "482193"
}
```

### Successful Response

```json
{
  "message": "OTP verified successfully"
}
```

Once the OTP is successfully verified, it is deleted from Redis.

This means the same OTP cannot be used again.

---

# 4. Check OTP TTL

TTL means **Time To Live**.

It tells us how many seconds are left before the Redis key expires.

### Request

```http
GET /otp/9876543210/ttl
```

### Response

```json
{
  "phone": "9876543210",
  "ttl": 42
}
```

This means the OTP has approximately 42 seconds remaining.

---

# Understanding Redis

When an OTP is generated, the application stores something similar to this in Redis:

```text
Key:
otp:9876543210

Value:
482193

TTL:
60 seconds
```

The Redis command being executed is essentially:

```text
SET otp:9876543210 482193 EX 60
```

`EX 60` tells Redis to automatically delete the key after 60 seconds.

---

## Redis GET

When the user submits the OTP:

```text
GET otp:9876543210
```

Redis returns:

```text
482193
```

The application compares it with the OTP submitted by the user.

---

## Redis DEL

After successful verification:

```text
DEL otp:9876543210
```

This prevents the OTP from being reused.

---

## Redis TTL

The application can check the remaining lifetime using:

```text
TTL otp:9876543210
```

Possible results:

| Value | Meaning                          |
| ----: | -------------------------------- |
|  `42` | 42 seconds remaining             |
|  `10` | 10 seconds remaining             |
|  `-1` | Key exists but has no expiration |
|  `-2` | Key does not exist               |

---

# Project Structure

A simple version of the project can look like this:

```text
redis-otp/
│
├── node_modules/
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

---

# Important Learning Concepts

## 1. Redis is excellent for temporary data

OTP is a good example because an OTP should not remain valid forever.

Instead of manually checking whether an OTP is older than 60 seconds, Redis handles expiration for us.

```text
SET key value EX 60
```

After 60 seconds:

```text
key → automatically deleted
```

---

## 2. Redis keys should be predictable

This project uses:

```text
otp:<phone>
```

For example:

```text
otp:9876543210
otp:9123456789
otp:9000012345
```

This makes it easy to retrieve the OTP later.

---

## 3. OTP should be one-time use

After successful verification:

```text
GET → compare → DEL
```

The OTP is immediately deleted.

---

# Production Considerations

This project is designed for **learning Redis**, not production use.

A production OTP system should additionally consider:

### Secure OTP generation

`Math.random()` is fine for learning, but security-sensitive OTP generation should use Node.js's cryptographic APIs.

### Rate limiting

Users should not be able to repeatedly request OTPs:

```text
POST /otp
POST /otp
POST /otp
POST /otp
...
```

Redis itself can be used to build rate limiting.

### SMS provider

A real application would send the OTP through an SMS provider.

The flow would be:

```text
User
 ↓
POST /otp
 ↓
Backend
 ↓
Generate OTP
 ↓
Redis
 ↓
SMS Provider
 ↓
User's Phone
```

### Don't log OTPs

The current project logs the OTP for development:

```js
console.log(`OTP for ${phone}: ${otp}`);
```

This should not be done in production.

### Don't expose sensitive information

The API should not return the actual OTP to the client.

---

# What You Should Learn From This Project

Don't just memorize the code.

Focus on understanding this Redis flow:

```text
SET
 ↓
EX
 ↓
GET
 ↓
TTL
 ↓
DEL
```

These are some of the fundamental Redis operations you'll encounter repeatedly.

Once you understand this project, a great next Redis project is a **rate limiter**, because it will show you another very practical use of Redis.
