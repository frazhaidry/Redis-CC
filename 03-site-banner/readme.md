# Redis Key Management — Banner API

A small Express + Redis project demonstrating the basic lifecycle of a Redis key using `SET`, `GET`, `EXISTS`, and `DEL`.

The application stores a single application banner in Redis and provides APIs to create, read, check, and delete it.

---

## 🎯 What This Project Teaches

This project focuses on four fundamental Redis commands:

```text
SET     → Create / Update
GET     → Read
EXISTS  → Check
DEL     → Delete
```

The Redis key used in this project is:

```text
app:banner
```

The overall lifecycle is:

```text
             SET
              │
              ▼
       ┌─────────────┐
       │ app:banner  │
       │             │
       │ "Welcome!"  │
       └─────────────┘
          │    │    │
          │    │    │
         GET EXISTS DEL
          │    │    │
          ▼    ▼    ▼
        Read Check Remove
```

---

# 🧠 Redis Concepts

## 1. SET

`SET` stores a value against a key.

```redis
SET app:banner "Welcome to my application"
```

If the key doesn't exist, Redis creates it.

If the key already exists, Redis replaces its value.

Therefore:

```text
SET = Create + Update
```

You don't need separate Redis commands for creating and updating a simple String value.

---

## 2. GET

`GET` retrieves the value associated with a key.

```redis
GET app:banner
```

If the key exists:

```text
"Welcome to my application"
```

If the key doesn't exist:

```text
(nil)
```

In Node.js using `ioredis`:

```js
const banner = await redis.get("app:banner");
```

If the key doesn't exist, `banner` will be `null`.

---

## 3. EXISTS

`EXISTS` checks whether a key exists.

```redis
EXISTS app:banner
```

Redis returns:

```text
1 → key exists
0 → key doesn't exist
```

In Node.js:

```js
const exists = await redis.exists("app:banner");

const result = exists === 1;
```

This is useful when you only need to know whether something exists without retrieving its value.

---

## 4. DEL

`DEL` removes a key.

```redis
DEL app:banner
```

Redis returns:

```text
1 → key was deleted
0 → key didn't exist
```

In Node.js:

```js
const deleted = await redis.del("app:banner");
```

---

# 🌐 API Endpoints

## `GET /`

Health check.

### Response

```json
{
  "message": "Redis Banner API is running"
}
```

---

## `GET /banner`

Retrieves the current banner.

### Example

```http
GET /banner
```

### Response

```json
{
  "banner": "Welcome to my application"
}
```

If the banner doesn't exist:

```json
{
  "banner": null
}
```

---

## `POST /banner`

Creates or updates the banner.

### Request

```http
POST /banner
Content-Type: application/json
```

```json
{
  "banner": "Welcome to my application"
}
```

### Response

```json
{
  "message": "Banner updated successfully",
  "banner": "Welcome to my application"
}
```

Internally:

```redis
SET app:banner "Welcome to my application"
```

---

## `DELETE /banner`

Deletes the banner.

### Request

```http
DELETE /banner
```

### Response

```json
{
  "success": true,
  "message": "Banner deleted successfully"
}
```

Internally:

```redis
DEL app:banner
```

---

## `GET /banner/exists`

Checks whether the banner exists.

### Request

```http
GET /banner/exists
```

### Response

```json
{
  "exists": true
}
```

Internally:

```redis
EXISTS app:banner
```

---

# 🔄 Complete Flow

### 1. Initially

Redis doesn't contain the key:

```text
app:banner
    ↓
doesn't exist
```

---

### 2. Create Banner

Send:

```http
POST /banner
```

```json
{
  "banner": "Welcome!"
}
```

Redis:

```redis
SET app:banner "Welcome!"
```

Now:

```text
app:banner → "Welcome!"
```

---

### 3. Read Banner

Send:

```http
GET /banner
```

Redis:

```redis
GET app:banner
```

Response:

```json
{
  "banner": "Welcome!"
}
```

---

### 4. Check Existence

Send:

```http
GET /banner/exists
```

Redis:

```redis
EXISTS app:banner
```

Response:

```json
{
  "exists": true
}
```

---

### 5. Delete Banner

Send:

```http
DELETE /banner
```

Redis:

```redis
DEL app:banner
```

Now:

```text
app:banner → doesn't exist
```

---

### 6. Check Again

```http
GET /banner/exists
```

Response:

```json
{
  "exists": false
}
```

---

# 🛠️ Technologies

* Node.js
* Express
* Redis
* ioredis
* JavaScript (ES Modules)

---

# 📦 Installation

Initialize the project:

```bash
npm init -y
```

Install dependencies:

```bash
npm install express ioredis dotenv
```

If you're using ES Modules, add this to `package.json`:

```json
{
  "type": "module"
}
```

---

# 🔐 Environment Variables

Create a `.env` file:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
```

The application also has a fallback:

```js
process.env.REDIS_URL || "redis://localhost:6379"
```

So it can work with a local Redis instance even without a `.env` file.

---

# ▶️ Run the Application

Start the server:

```bash
node index.js
```

You should see:

```text
Redis connected
Redis is ready
Server running on http://localhost:3000
```

---

# 🧪 Testing with cURL

### Create Banner

```bash
curl -X POST http://localhost:3000/banner \
  -H "Content-Type: application/json" \
  -d '{"banner":"Welcome to Redis!"}'
```

### Get Banner

```bash
curl http://localhost:3000/banner
```

### Check Existence

```bash
curl http://localhost:3000/banner/exists
```

### Delete Banner

```bash
curl -X DELETE http://localhost:3000/banner
```

### Check Again

```bash
curl http://localhost:3000/banner/exists
```

---

# 🧠 Important Things to Remember

## SET is Create + Update

```redis
SET key value
```

There isn't a separate basic `CREATE` and `UPDATE` operation.

---

## GET Returns Null for Missing Keys

```js
const value = await redis.get("does-not-exist");
```

Result:

```js
null
```

---

## EXISTS Returns a Number

Redis returns:

```text
1 → exists
0 → doesn't exist
```

So in JavaScript:

```js
const exists = (await redis.exists(key)) === 1;
```

---

## DEL Also Returns a Number

```js
const deleted = await redis.del(key);
```

Result:

```text
1 → deleted
0 → wasn't present
```

---

# 🔑 Key Naming

The project uses:

```text
app:banner
```

rather than:

```text
banner
```

The `:` convention is commonly used to create logical namespaces.

Examples:

```text
user:123
user:123:profile
session:abc123
otp:9876543210
leaderboard:global
app:banner
```

A useful pattern is:

```text
namespace:resource:identifier
```

---

# 📚 Redis Commands Practiced

| Command  | Purpose                    |
| -------- | -------------------------- |
| `SET`    | Create or update a String  |
| `GET`    | Retrieve a String          |
| `EXISTS` | Check whether a key exists |
| `DEL`    | Delete a key               |

---

# 🎯 What I Learned

This project helped me understand the basic lifecycle of a Redis String key:

```text
Create
  ↓
SET
  ↓
Read
  ↓
GET
  ↓
Check
  ↓
EXISTS
  ↓
Delete
  ↓
DEL
```

The important idea is that Redis operations are centered around **keys and values**.

For this project:

```text
Key:
app:banner

Value:
"Welcome to Redis!"
```

This is one of the simplest Redis patterns, but understanding it properly makes more advanced Redis data structures much easier to learn.

---

# 🚀 Possible Improvements

Ideas for extending this project:

* Add banner expiration using `EXPIRE`
* Add `TTL` endpoint
* Store multiple banners
* Add user-specific banners
* Add scheduled banner expiration
* Add Redis Hashes for banner metadata
* Add authentication
* Add request validation
* Add automated tests
* Add caching around a real database
