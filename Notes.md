# Redis — Extra Notes for SDE-1

> Topics beyond the lectures/projects in this repository.
> Use this file as a quick revision guide rather than a complete Redis manual.

---

## 📌 1. Redis Data Types You Should Know

You have already worked with Strings, Hashes and Lists. Two more important types are:

### Sets

A **Set** stores unique values.

```text
users:online

┌──────────────────────────┐
│ 101 │ 205 │ 309 │ 412   │
└──────────────────────────┘
       ↑
    No duplicates
```

Useful commands:

```bash
SADD users:online 101
SADD users:online 205
SISMEMBER users:online 101
SMEMBERS users:online
SREM users:online 101
SCARD users:online
```

### When to use Sets?

Good for:

* Unique users
* Tags
* Followers/following
* Online users
* Membership checking

Example:

```text
post:123:likes → Set(user IDs)
```

---

# 🏆 2. Sorted Sets — Important for Leaderboards

A Sorted Set stores:

```text
member + score
```

Redis automatically keeps members ordered by score.

```text
leaderboard

Alice   → 950
Bob     → 870
John    → 820
Sam     → 700
```

Basic commands:

```bash
ZADD leaderboard 950 Alice
ZADD leaderboard 870 Bob

ZINCRBY leaderboard 50 Alice

ZREVRANGE leaderboard 0 9 WITHSCORES

ZSCORE leaderboard Alice

ZRANK leaderboard Alice
```

### Why Sorted Sets?

Perfect for:

* Leaderboards
* Rankings
* Scores
* Priority systems
* Top-N queries

### Mental Model

```text
Set       → unique values

Sorted Set → unique values + score + ordering
```

---

# ⚡ 3. Atomic Operations

Redis commands are generally **atomic**.

For example:

```js
await redis.incr("views");
```

If 100 requests arrive simultaneously:

```text
Request 1 ─┐
Request 2 ─┤
Request 3 ─┤
Request 4 ─┤──→ Redis → INCR → correct final value
...        │
Request100 ┘
```

This makes Redis useful for:

* Counters
* Rate limiting
* Inventory counts
* Sequence numbers

### Important

Atomic does **not** mean that an entire group of separate commands automatically becomes atomic.

For example:

```js
const value = await redis.get("counter");
await redis.set("counter", value + 1);
```

This can suffer from a race condition.

Prefer:

```js
await redis.incr("counter");
```

---

# 🔄 4. Transactions

Redis supports transactions using:

```text
MULTI
EXEC
```

Example:

```js
const result = await redis
  .multi()
  .set("user:1:name", "John")
  .set("user:1:age", "25")
  .exec();
```

Conceptually:

```text
MULTI
  ↓
Command 1
Command 2
Command 3
  ↓
EXEC
  ↓
Redis executes the queued commands
```

### Remember

Redis transactions are **not the same as SQL transactions**.

They don't provide the same rollback behavior you might expect from a relational database.

---

# 🚀 5. Pipelining

Suppose your application needs to execute many Redis commands.

Without pipelining:

```text
Application → Redis
Application ← Redis

Application → Redis
Application ← Redis

Application → Redis
Application ← Redis
```

Many network round trips.

With pipelining:

```text
Application
     │
     │ command 1
     │ command 2
     │ command 3
     │ command 4
     ▼
   Redis
     │
     ▼
  Responses
```

Example:

```js
const pipeline = redis.pipeline();

pipeline.set("a", "1");
pipeline.set("b", "2");
pipeline.set("c", "3");

await pipeline.exec();
```

### Use when

You need to execute **many independent Redis commands efficiently**.

---

# ⏳ 6. Redis Key Expiration

You already used TTL, but remember the important concept:

```text
SET session:123 abc EX 3600
                  │
                  ▼
              1 hour TTL
                  │
                  ▼
                DELETE
```

Useful commands:

```bash
EXPIRE key 60
TTL key
PERSIST key
SET key value EX 60
```

Expiration is useful for:

* Sessions
* OTPs
* Cache entries
* Temporary tokens
* Rate-limit data

---

# 🧠 7. Cache-Aside Pattern

One of the most important real-world Redis patterns.

```text
        Request
           │
           ▼
        Redis?
       /      \
     HIT      MISS
      │         │
      ▼         ▼
   Return     Database
               │
               ▼
             Redis
               │
               ▼
            Return
```

Example:

```js
let user = await redis.get(`user:${id}`);

if (!user) {
  user = await db.users.findById(id);

  await redis.set(
    `user:${id}`,
    JSON.stringify(user),
    "EX",
    300
  );
}

return user;
```

### Why?

Database:

```text
Slower + expensive
```

Redis:

```text
Very fast + in-memory
```

---

# 💥 8. Cache Invalidation

One of the hardest parts of caching.

Suppose:

```text
Database
name = John

Redis
name = John
```

User changes their name:

```text
Database
name = Mike

Redis
name = John   ❌
```

Now Redis contains stale data.

A common solution:

```text
Update Database
      │
      ▼
Delete Redis Cache
      │
      ▼
Next request → DB → Redis
```

Example:

```js
await db.users.update(...);

await redis.del(`user:${id}`);
```

> **Remember:** Whenever you cache database data, think about how that cache becomes stale.

---

# 🚦 9. Rate Limiting

Redis is commonly used to limit requests.

Example:

```text
IP: 192.168.1.10

Requests
  │
  ├── 1
  ├── 2
  ├── 3
  ├── ...
  └── 100

Limit = 100 requests / minute
```

Simple idea:

```js
const key = `rate:${ip}`;

const count = await redis.incr(key);

if (count === 1) {
  await redis.expire(key, 60);
}

if (count > 100) {
  // Too many requests
}
```

Used for:

* Login APIs
* OTP APIs
* Public APIs
* Preventing abuse

---

# 📡 10. Redis Streams

You learned Pub/Sub, but Streams solve a different problem.

### Pub/Sub

```text
Publisher
    │
    ▼
 Channel
   / \
  ▼   ▼
Sub1 Sub2
```

If a subscriber is offline:

```text
Message → LOST
```

### Streams

Streams store messages.

```text
Stream

ID       Message
────────────────────────
1-0      Order created
2-0      Payment received
3-0      Email requested
```

Consumers can read messages later.

Useful for:

* Event processing
* Background jobs
* Event-driven systems
* Reliable message processing

For serious production queues, tools like **BullMQ** can still be preferable depending on the use case.

---

# 💾 11. Redis Persistence

Redis is primarily an **in-memory database**, but it can persist data to disk.

Two important mechanisms:

### RDB

Periodic snapshots.

```text
Redis
  │
  ├── data
  │
  └── snapshot → disk
```

Advantages:

* Compact
* Fast recovery
* Good for backups

### AOF

Logs write operations.

```text
SET user:1 John
SET user:2 Bob
INCR views
```

These operations can be persisted.

### Simple comparison

| RDB              | AOF                 |
| ---------------- | ------------------- |
| Snapshots        | Operation log       |
| Smaller files    | Usually larger      |
| Faster recovery  | More durable        |
| Good for backups | Good for durability |

You don't need to master persistence at SDE-1 level yet. Just understand **why it exists**.

---

# 🛡️ 12. Redis Security Basics

Never expose Redis directly to the public internet.

Bad:

```text
Internet
   │
   ▼
Redis :6379
```

Better:

```text
Internet
    │
    ▼
Backend
    │
    ▼
Private Redis
```

Basic rules:

* Don't expose port `6379` publicly.
* Use authentication/access control.
* Use environment variables for credentials.
* Use TLS when required.
* Keep Redis inside a private network in production.

Example:

```env
REDIS_URL=redis://username:password@localhost:6379
```

Never commit secrets to GitHub.

---

# 📊 13. Redis Memory

Redis stores data primarily in RAM.

Therefore:

```text
More keys
   ↓
More memory
   ↓
Memory limit reached
```

Redis can use **eviction policies** when memory is full.

Common idea:

```text
New data
   ↓
Memory full?
   ↓
Evict old/unneeded keys
```

Some common policies include:

```text
allkeys-lru
volatile-lru
allkeys-lfu
noeviction
```

For SDE-1, remember:

> **Redis memory is limited, so caching everything forever is a bad idea.**

---

# 🔥 14. Common Redis Architecture

A typical backend might look like:

```text
             ┌─────────────┐
             │   Client    │
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │   Express   │
             │   Backend   │
             └──────┬──────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
     ┌─────────┐         ┌─────────┐
     │  Redis  │         │ MongoDB │
     └─────────┘         └─────────┘
          │
          ├── Cache
          ├── Sessions
          ├── Counters
          ├── Rate limits
          ├── Queues
          └── Pub/Sub
```

Redis usually **complements** your primary database rather than replacing it.

---

# 🧩 15. When Should You Use Redis?

Think Redis when you need:

```text
                 ┌───────────────┐
                 │ Need very fast │
                 │ temporary data?│
                 └───────┬───────┘
                         │
                        YES
                         │
                         ▼
                       Redis
```

Typical use cases:

| Problem          | Redis Feature    |
| ---------------- | ---------------- |
| Cache            | Strings          |
| User session     | Strings / Hashes |
| OTP              | Strings + TTL    |
| Unique users     | Sets             |
| Leaderboard      | Sorted Sets      |
| Counter          | INCR             |
| Rate limiting    | INCR + TTL       |
| Queue            | Lists / BullMQ   |
| Notifications    | Pub/Sub          |
| Event processing | Streams          |
| Temporary data   | TTL              |

---

# ⚠️ 16. Redis Mistakes to Avoid

### ❌ Don't store everything permanently

Use TTL where appropriate.

### ❌ Don't treat Redis as your only database

Unless your architecture specifically requires it.

### ❌ Don't expose Redis publicly

Keep it behind your backend/private network.

### ❌ Don't ignore cache invalidation

Stale cache can produce incorrect application behavior.

### ❌ Don't create unlimited keys

Think about memory usage.

### ❌ Don't use Redis commands blindly inside loops

For many operations, consider pipelining.

### ❌ Don't store huge objects unnecessarily

Redis is memory-based.

---

# 🧠 Quick Revision Sheet

```text
STRING
→ cache, counters, tokens

HASH
→ object-like data

LIST
→ queue / ordered collection

SET
→ unique values

SORTED SET
→ ranking / leaderboard

PUB/SUB
→ real-time messaging, no message history

STREAM
→ persistent event/message stream

TTL
→ automatic expiration

INCR
→ atomic counter

MULTI/EXEC
→ transaction-style command grouping

PIPELINE
→ reduce network round trips

CACHE-ASIDE
→ Redis → DB fallback → Redis

RDB
→ snapshots

AOF
→ operation log
```

---

# 🎯 What to Learn Next

After completing your current Redis learning, an SDE-1-friendly progression would be:

```text
Redis Basics
     │
     ├── Data Types
     │
     ├── TTL
     │
     ├── Caching
     │
     ├── Queues
     │
     ├── Pub/Sub
     │
     ├── Sorted Sets
     │
     ├── Rate Limiting
     │
     ├── Transactions
     │
     ├── Pipelines
     │
     ├── Streams
     │
     └── Persistence
              │
              ▼
       Production Redis
              │
              ├── Security
              ├── Monitoring
              ├── Replication
              └── Redis Cluster
```

You **do not need to master Redis Cluster, Sentinel, Lua scripting, distributed locking, or advanced Redis internals immediately**.

First become comfortable building small backend features with Redis. Then learn the distributed/production concepts when your projects require them.

---

## 🔑 Final Mental Model

Think of Redis as:

> **A very fast in-memory data store that can be used for much more than caching.**

```text
                 REDIS
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
    CACHE       DATA        MESSAGING
       │           │           │
       ▼           ▼           ▼
    Sessions     Sets       Pub/Sub
    API Cache    Hashes     Streams
    Tokens       SortedSet  Queues
       │           │           │
       └───────────┼───────────┘
                   ▼
              FAST BACKEND
```

If you understand **data types + TTL + atomic operations + caching + queues + Pub/Sub + Sorted Sets + rate limiting**, you already have a strong Redis foundation for an SDE-1 backend role.
