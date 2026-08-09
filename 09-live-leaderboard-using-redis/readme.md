# Redis Live Leaderboard

A real-time leaderboard application built using **Node.js, Express, and Redis**.

The goal of this assignment is to understand how Redis **Sorted Sets (ZSETs)** can be used to efficiently store player scores and retrieve players according to their rankings.

---

## 📌 Assignment Objective

Build a live leaderboard where users/players can:

* Register or be added to the leaderboard
* Submit/update their score
* View the leaderboard
* View the top players
* Find a specific player's rank
* Find a specific player's score
* Handle score updates efficiently using Redis

The leaderboard should update immediately whenever a player's score changes.

---

# 🧠 Core Redis Concept

The main Redis data structure you should use for this assignment is:

```text
Sorted Set (ZSET)
```

A Redis Sorted Set stores:

```text
member → score
```

For example:

```text
player:rahul → 1500
player:aman  → 1200
player:priya → 1800
player:rohit → 950
```

Redis automatically keeps the members ordered according to their scores.

Conceptually:

```text
Score
  ↑

1800  priya
1500  rahul
1200  aman
 950  rohit
```

This makes Sorted Sets extremely useful for leaderboards.

---

# 🚀 Features

Your application should support the following operations.

## 1. Add / Update Player Score

An endpoint should allow you to submit a player's score.

Example:

```http
POST /score
```

Request:

```json
{
  "playerId": "rahul",
  "score": 1500
}
```

If the player doesn't exist, they should be added.

If the player already exists, their score should be updated.

---

## 2. Get Leaderboard

Create an endpoint that returns players sorted by their ranking.

Example:

```http
GET /leaderboard
```

Possible response:

```json
{
  "leaderboard": [
    {
      "rank": 1,
      "playerId": "priya",
      "score": 1800
    },
    {
      "rank": 2,
      "playerId": "rahul",
      "score": 1500
    },
    {
      "rank": 3,
      "playerId": "aman",
      "score": 1200
    }
  ]
}
```

The highest score should appear first.

---

# 🥇 Top N Players

Your leaderboard should ideally support requesting only the top N players.

For example:

```http
GET /leaderboard?limit=10
```

This should return only the top 10 players.

You can experiment with:

```text
limit=3
limit=5
limit=10
limit=100
```

---

# 🔎 Find a Player's Rank

Create an endpoint that allows you to find the rank of a particular player.

Example:

```http
GET /leaderboard/rahul
```

Possible response:

```json
{
  "playerId": "rahul",
  "score": 1500,
  "rank": 2
}
```

The rank should be calculated from the Redis Sorted Set rather than manually sorting all players in JavaScript.

---

# 📊 Find a Player's Score

The same endpoint can return the player's current score.

For example:

```json
{
  "playerId": "rahul",
  "score": 1500,
  "rank": 2
}
```

Redis should be responsible for retrieving the score.

---

# 🔄 Updating Scores

A player might submit a new score:

```text
Rahul → 1000
```

Later:

```text
Rahul → 1500
```

The leaderboard should automatically reflect the new ranking.

For example:

```text
Before:

1. Priya   1800
2. Aman    1600
3. Rahul   1000


Rahul scores 1700


After:

1. Priya   1800
2. Rahul   1700
3. Aman    1600
```

You should not manually sort the entire leaderboard in JavaScript.

Let Redis handle the ordering.

---

# 🗃️ Suggested Redis Key

Use a dedicated Redis key for the leaderboard.

For example:

```text
leaderboard
```

or:

```text
game:leaderboard
```

Then the Sorted Set can conceptually look like:

```text
game:leaderboard

playerA → 1000
playerB → 1500
playerC → 2000
playerD → 1200
```

Choose a naming convention and use it consistently.

---

# 🔑 Redis Commands You Should Explore

You should implement the project using Redis Sorted Set commands.

The most important commands to understand are:

### Add / Update Score

```text
ZADD
```

Used to add a player or update their score.

---

### Get Score

```text
ZSCORE
```

Used to retrieve a player's score.

---

### Get Ranking

Explore:

```text
ZRANK
```

and:

```text
ZREVRANK
```

Think carefully about which one you need for a leaderboard where the **highest score should have rank 1**.

---

### Get Top Players

Explore:

```text
ZRANGE
```

and:

```text
ZREVRANGE
```

Again, think about which direction you need.

---

### Remove Player

Explore:

```text
ZREM
```

This can be useful if your application supports removing players from the leaderboard.

---

### Number of Players

Explore:

```text
ZCARD
```

This can tell you how many players currently exist in the leaderboard.

---

# ⚠️ Important Challenge

One thing you should think about carefully is **rank numbering**.

Redis ranks are zero-based:

```text
0
1
2
3
```

But users expect:

```text
1st
2nd
3rd
4th
```

Therefore, you'll need to convert the Redis rank into a user-facing rank.

Don't blindly return the Redis value.

---

# 🧩 Suggested API

A clean API could look like:

```text
GET    /
POST   /score
GET    /leaderboard
GET    /leaderboard/:playerId
DELETE /leaderboard/:playerId
```

You don't necessarily need all of these.

The minimum useful version is:

```text
POST /score
GET  /leaderboard
GET  /leaderboard/:playerId
```

---

# 📁 Suggested Project Structure

Keep the project simple initially:

```text
redis-leaderboard/
│
├── node_modules/
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
│
├── server.js
│
└── README.md
```

Once the project works, you can refactor into:

```text
redis-leaderboard/
│
├── src/
│   ├── server.js
│   ├── redis.js
│   ├── routes/
│   │   └── leaderboard.routes.js
│   └── controllers/
│       └── leaderboard.controller.js
│
├── .env
├── .gitignore
├── package.json
└── README.md
```

For an assignment, **don't over-engineer it initially**.

Get the Redis logic working first.

---

# ⚙️ Setup

## 1. Initialize Project

```bash
npm init -y
```

---

## 2. Install Dependencies

```bash
npm install express ioredis dotenv
```

---

## 3. Enable ES Modules

In `package.json`:

```json
{
  "type": "module"
}
```

---

# 🔐 Environment Variables

Create:

```text
.env
```

Example:

```env
PORT=3000
REDIS_URL=redis://localhost:6379
```

Make sure `.env` is included in `.gitignore`.

```text
node_modules/
.env
```

---

# ▶️ Running the Project

Start the server:

```bash
node server.js
```

Or if you add a development script:

```bash
npm run dev
```

The server should run on:

```text
http://localhost:3000
```

---

# 🧪 Testing

You can use:

* Postman
* Thunder Client
* Insomnia
* curl

---

## Example Test Flow

### Step 1 — Add Rahul

```http
POST /score
```

```json
{
  "playerId": "rahul",
  "score": 1000
}
```

---

### Step 2 — Add Priya

```json
{
  "playerId": "priya",
  "score": 1800
}
```

---

### Step 3 — Add Aman

```json
{
  "playerId": "aman",
  "score": 1500
}
```

---

### Step 4 — Check Leaderboard

```http
GET /leaderboard
```

Expected ordering:

```text
1. Priya  → 1800
2. Aman   → 1500
3. Rahul  → 1000
```

---

### Step 5 — Update Rahul

```json
{
  "playerId": "rahul",
  "score": 2000
}
```

Now the leaderboard should become:

```text
1. Rahul  → 2000
2. Priya  → 1800
3. Aman   → 1500
```

Notice that you didn't manually move Rahul.

Redis Sorted Sets handle the ordering.

---

# 🧠 Questions You Should Be Able to Answer

Before considering the assignment complete, make sure you understand:

### 1. Why use a Sorted Set?

Why isn't a normal Redis Set enough?

---

### 2. What is the member?

For example:

```text
rahul
```

What does this represent?

---

### 3. What is the score?

For example:

```text
2000
```

What does Redis use this number for?

---

### 4. What happens when `ZADD` is called twice?

For example:

```text
ZADD leaderboard 1000 rahul
```

then:

```text
ZADD leaderboard 2000 rahul
```

Does Redis create two Rahul entries?

Or does it update Rahul's score?

You should understand why.

---

### 5. Why use `ZREVRANK`?

If higher scores should rank higher, which Redis ranking direction makes sense?

---

### 6. Why shouldn't JavaScript sort everything?

Imagine:

```text
10 players
```

Sorting in JavaScript is easy.

But imagine:

```text
10 million players
```

Would it make sense to retrieve every player from Redis and sort them inside your Node.js application?

Think about why Redis Sorted Sets exist.

---

# ⭐ Bonus Challenges

Once the basic leaderboard works, try these yourself.

## Bonus 1 — Player Count

Create:

```http
GET /leaderboard/count
```

Return:

```json
{
  "players": 1250
}
```

Use Redis to calculate the number.

---

## Bonus 2 — Remove Player

Create:

```http
DELETE /leaderboard/:playerId
```

Example:

```http
DELETE /leaderboard/rahul
```

---

## Bonus 3 — Player's Rank

Return:

```json
{
  "playerId": "rahul",
  "score": 2000,
  "rank": 1
}
```

---

## Bonus 4 — Top 3

Create:

```http
GET /leaderboard?limit=3
```

---

## Bonus 5 — Pagination

Try supporting:

```text
GET /leaderboard?page=2&limit=10
```

This will force you to think about Redis range queries and offsets.

---

## Bonus 6 — Multiple Games

Instead of one global leaderboard, support different games:

```text
game:football:leaderboard
game:chess:leaderboard
game:quiz:leaderboard
```

Now a player can have different scores in different games.

---

# 🚀 Advanced Challenge — Live Updates

The assignment is called a **live leaderboard**, so once the basic version works, think about how you could make the leaderboard update in real time.

One possible architecture is:

```text
Player
   │
   │ Update score
   ▼
Express API
   │
   ├──────────────► Redis Sorted Set
   │
   │
   └──────────────► Redis Pub/Sub
                         │
                         ▼
                    WebSocket Server
                         │
                 ┌───────┼───────┐
                 ▼       ▼       ▼
              Browser Browser Browser
```

When a score changes:

```text
Score updated
     ↓
Redis ZSET updated
     ↓
Event published
     ↓
WebSocket server
     ↓
Connected clients
     ↓
Leaderboard updates
```

**This is optional.** First make the Redis Sorted Set leaderboard work correctly.

---

# 🧪 Suggested Development Order

Don't try to build everything at once.

Follow this order:

```text
1. Connect Node.js to Redis
          ↓
2. Create leaderboard Sorted Set
          ↓
3. Add/update player score
          ↓
4. Get leaderboard
          ↓
5. Get player's score
          ↓
6. Get player's rank
          ↓
7. Remove player
          ↓
8. Add limit/top-N support
          ↓
9. Add pagination
          ↓
10. Add real-time updates
```

The first seven steps are enough for a solid Redis-focused assignment.

---

# 📚 Redis Concepts Used

By completing this project, you should understand:

```text
Redis
 │
 └── Sorted Sets
       │
       ├── ZADD
       ├── ZSCORE
       ├── ZRANK
       ├── ZREVRANK
       ├── ZRANGE
       ├── ZREVRANGE
       ├── ZCARD
       └── ZREM
```

The most important concept is:

> **Redis Sorted Sets maintain members ordered by score, making them a natural data structure for leaderboards.**

---

# 🎯 Final Goal

At the end, you should be able to demonstrate:

```text
Player A → 1200
Player B → 1800
Player C → 1500
Player D → 2000
```

and Redis should allow your application to efficiently produce:

```text
🏆 Leaderboard

1. Player D → 2000
2. Player B → 1800
3. Player C → 1500
4. Player A → 1200
```

Then when:

```text
Player A → 2200
```

the leaderboard automatically becomes:

```text
🏆 Leaderboard

1. Player A → 2200
2. Player D → 2000
3. Player B → 1800
4. Player C → 1500
```

The key learning objective is not just making the API work.

You should understand **why Redis Sorted Sets are particularly well-suited for this problem** and which Redis commands make the leaderboard operations efficient.
