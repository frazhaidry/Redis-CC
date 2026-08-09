# Redis User Profile API

A simple Express API demonstrating how to store user profile data in Redis using two different approaches:

1. **JSON stored as a Redis String**
2. **Redis Hash**

This project is designed for learning Redis data structures and understanding when to use `SET/GET` versus `HSET/HGETALL`.

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

* Redis Strings
* Redis Hashes
* `SET`
* `GET`
* `HSET`
* `HGETALL`
* JSON serialization
* JSON deserialization
* Redis key naming
* Using Redis with Express
* Difference between storing an entire object and storing individual fields

---

# Project Structure

```text
redis-user-profile/
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

You can also add useful scripts:

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

If you're using a cloud Redis provider:

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

Start the development server:

```bash
npm run dev
```

Or:

```bash
npm start
```

You should see something similar to:

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
  "message": "Redis User Profile API is running"
}
```

---

# JSON Approach

The first approach stores the entire user object as a JSON string.

## 2. Store User Profile as JSON

### Request

```http
POST /user/123/json
```

### Body

```json
{
  "name": "Rahul",
  "age": 22,
  "city": "Patna"
}
```

### Response

```json
{
  "message": "User profile for 123 stored as JSON"
}
```

---

## What Redis Stores

The application essentially performs:

```text
SET user:123:json '{"name":"Rahul","age":22,"city":"Patna"}'
```

The entire JavaScript object becomes **one string**.

Conceptually:

```text
user:123:json
       ↓
"{\"name\":\"Rahul\",\"age\":22,\"city\":\"Patna\"}"
```

---

## 3. Get User Profile as JSON

### Request

```http
GET /user/123/json
```

### Response

```json
{
  "name": "Rahul",
  "age": 22,
  "city": "Patna"
}
```

Internally, the application does:

```text
Redis GET
    ↓
JSON string
    ↓
JSON.parse()
    ↓
JavaScript object
```

---

# Redis Hash Approach

The second approach uses a Redis Hash.

A Hash is useful when you want to store an object as individual **field-value pairs**.

---

## 4. Store User Profile as Hash

### Request

```http
POST /user/123/hash
```

### Body

```json
{
  "name": "Rahul",
  "age": 22,
  "city": "Patna"
}
```

### Response

```json
{
  "message": "User profile for 123 stored as hash"
}
```

---

## What Redis Stores

The application essentially performs:

```text
HSET user:123:hash
     name "Rahul"
     age "22"
     city "Patna"
```

Conceptually:

```text
user:123:hash
│
├── name → Rahul
├── age  → 22
└── city → Patna
```

The data is stored as separate fields rather than one large JSON string.

---

## 5. Get User Profile as Hash

### Request

```http
GET /user/123/hash
```

### Response

```json
{
  "name": "Rahul",
  "age": "22",
  "city": "Patna"
}
```

---

# JSON vs Redis Hash

This is the most important concept in this project.

| Feature                     | JSON String     | Redis Hash      |
| --------------------------- | --------------- | --------------- |
| Redis type                  | String          | Hash            |
| Store command               | `SET`           | `HSET`          |
| Read command                | `GET`           | `HGETALL`       |
| Data representation         | One JSON string | Multiple fields |
| Requires `JSON.stringify()` | Yes             | No              |
| Requires `JSON.parse()`     | Yes             | No              |
| Individual field access     | Not convenient  | Easy            |
| Good for complete objects   | Yes             | Yes             |
| Good for individual fields  | Less convenient | Excellent       |

---

# Important Difference in Data Types

There is an important difference between the two approaches.

With JSON:

```json
{
  "age": 22
}
```

After `JSON.parse()`, the value is a JavaScript number:

```js
22
```

With a Redis Hash:

```text
age → "22"
```

Redis Hash values are strings.

So the API will return:

```json
{
  "age": "22"
}
```

rather than:

```json
{
  "age": 22
}
```

This is an important Redis behavior to understand.

---

# Redis Commands Used

## SET

Stores a value against a key.

```text
SET user:123:json "some value"
```

---

## GET

Retrieves a string value.

```text
GET user:123:json
```

---

## HSET

Stores fields inside a Hash.

```text
HSET user:123:hash name "Rahul" age "22"
```

---

## HGETALL

Retrieves all fields and values from a Hash.

```text
HGETALL user:123:hash
```

---

# Why Different Keys?

Notice that the project uses:

```text
user:123:json
```

and:

```text
user:123:hash
```

instead of using:

```text
user:123
```

for both.

This is important because Redis keys are unique.

If both approaches used:

```text
user:123
```

one implementation could overwrite data belonging to the other.

Using clear key names makes the data easier to understand and debug.

---

# Redis Key Naming

A common Redis pattern is:

```text
resource:id:type
```

For this project:

```text
user:123:json
user:123:hash
```

For other applications, you might see:

```text
user:123
session:abc123
otp:9876543210
cart:456
product:789
```

The exact naming convention depends on the application, but **consistent key naming is extremely important** when working with Redis.

---

# Try These Experiments

Don't just run the API. Experiment with Redis.

After storing the JSON profile, try:

```text
GET user:123:json
```

Then store the Hash and try:

```text
HGETALL user:123:hash
```

You can also inspect the keys:

```text
KEYS user:*
```

You should see something like:

```text
1) "user:123:json"
2) "user:123:hash"
```

> `KEYS` is useful while learning, but avoid using `KEYS *` on a large production Redis database because it can block Redis while scanning a large keyspace.

---

# Useful Hash Commands to Learn Next

Once you understand `HSET` and `HGETALL`, experiment with:

### Get one field

```text
HGET user:123:hash name
```

Result:

```text
Rahul
```

### Check whether a field exists

```text
HEXISTS user:123:hash name
```

### Get all fields

```text
HKEYS user:123:hash
```

### Get all values

```text
HVALS user:123:hash
```

### Delete one field

```text
HDEL user:123:hash city
```

These commands will help you understand why Redis Hashes can be useful when you need to work with individual fields.

---

# Mental Model

The easiest way to remember the difference:

## JSON String

Think:

```text
Redis
└── user:123:json
       └── "entire object as one string"
```

Operations:

```text
SET → entire object
GET → entire object
```

---

## Redis Hash

Think:

```text
Redis
└── user:123:hash
       ├── name
       ├── age
       └── city
```

Operations:

```text
HSET → individual fields
HGET → one field
HGETALL → all fields
HDEL → remove a field
```

---

# When Would You Use Which?

### JSON String

A JSON string can be convenient when:

* You usually read/write the entire object at once.
* You don't need to update individual fields frequently.
* Your application already works naturally with JSON objects.

Example:

```text
Cache an entire API response
```

---

### Redis Hash

A Hash can be useful when:

* The object naturally consists of fields.
* You frequently read or update individual fields.
* You want Redis commands specifically for individual fields.

Example:

```text
User profile
Session data
Counters/metadata
```

---

# Important Learning Point

Redis is **not just one type of database structure**.

Redis provides different data structures for different problems.

You have now started working with:

```text
Redis
│
├── String
│   ├── SET
│   └── GET
│
└── Hash
    ├── HSET
    ├── HGET
    ├── HGETALL
    └── HDEL
```

The next useful Redis concepts to learn are:

```text
Lists
Sets
Sorted Sets
Expiration / TTL
Transactions
Pub/Sub
Caching
Rate Limiting
```

The important thing is to learn **why you would choose each data structure**, not just memorize the commands.
