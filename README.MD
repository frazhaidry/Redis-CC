# Redis — Master Notes & Learning Guide

> A long-term Redis reference covering the concepts, data structures, commands, patterns, and practical lessons I have learned while studying Redis.

This repository contains my Redis learning journey, organized lecture-by-lecture.

The individual lecture folders contain detailed implementations and experiments. This README is the **master reference** — something I can come back to later for revision, interviews, system design, or when Redis appears in a real project.

---

# 📚 Repository Structure

```text
redis-cc/
│
├── README.md                  ← You are here
│
├── 01-<topic>/
│   └── README.md
│
├── 02-<topic>/
│   └── README.md
│
├── 03-<topic>/
│   └── README.md
│
├── 04-<topic>/
│   └── README.md
│
├── ...
│
└── 09-<topic>/
    └── README.md
```

The lecture folders contain **hands-on implementations**.

This file contains the **big picture**.

---

# 🧠 What Is Redis?

**Redis** is an in-memory data store commonly used as:

* Cache
* Database
* Message broker
* Pub/Sub system
* Queue backend
* Session store
* Rate limiter
* Leaderboard engine
* Distributed coordination system

Redis stores data primarily in memory, which makes many operations extremely fast.

A simplified mental model:

```text
Application
     │
     ▼
   Redis
     │
     ├── String
     ├── Hash
     ├── List
     ├── Set
     ├── Sorted Set
     ├── Stream
     └── Pub/Sub
```

Redis is not simply a "cache".

It is a **data structure server**.

That distinction is important.

---

# ⚡ Why Is Redis Fast?

One of the major reasons Redis is fast is that its working dataset is primarily kept in memory.

Traditional architecture might look like:

```text
Application
     │
     ▼
Disk-based Database
     │
     ▼
    Disk
```

Redis commonly works like:

```text
Application
     │
     ▼
    Redis
     │
     ▼
    RAM
```

Memory access is significantly faster than disk access.

However, Redis is not "fast because it is only RAM."

Its performance also comes from:

* Efficient data structures
* Efficient algorithms
* Simple command model
* Event-driven architecture
* Low network overhead
* Optimized implementation

---

# 🎯 The Most Important Redis Mental Model

Don't memorize Redis as a list of commands.

Think:

```text
Problem
   ↓
Choose the right Redis data structure
   ↓
Choose the appropriate Redis commands
   ↓
Design expiration / persistence / consistency
   ↓
Use Redis safely in the architecture
```

For example:

```text
Need temporary key-value data
        ↓
      String


Need user object / fields
        ↓
      Hash


Need queue
        ↓
      List
      or
      Streams / BullMQ


Need unique members
        ↓
       Set


Need ranking
        ↓
   Sorted Set


Need event history
        ↓
      Stream


Need broadcast
        ↓
     Pub/Sub
```

This way of thinking is much more useful than memorizing individual commands.

---

# 🗂️ Redis Data Types

The core Redis data structures you should know are:

| Data Structure | Typical Use                            |
| -------------- | -------------------------------------- |
| String         | Cache, counters, tokens, simple values |
| Hash           | Objects / records                      |
| List           | Queues, stacks, ordered collections    |
| Set            | Unique values, membership              |
| Sorted Set     | Leaderboards, ranking                  |
| Stream         | Event streams, durable messaging       |
| Bitmap         | Compact boolean/state tracking         |
| HyperLogLog    | Approximate unique counting            |
| Geospatial     | Location-based queries                 |

There are also advanced Redis features and modules, but these are the core concepts to understand first.

---

# 1. Strings

The simplest Redis data type.

```text
key → value
```

Example:

```text
user:name → Rahul
```

Set:

```redis
SET user:name Rahul
```

Get:

```redis
GET user:name
```

Delete:

```redis
DEL user:name
```

---

## Strings Can Store JSON

You can also store serialized objects:

```js
await redis.set(
  "user:123",
  JSON.stringify({
    name: "Rahul",
    age: 22
  })
);
```

Then:

```js
const data = await redis.get("user:123");

const user = JSON.parse(data);
```

This is simple and useful, but if you frequently need to update individual fields, a Redis Hash may be a better fit.

---

# 2. Hashes

Hashes are useful for representing objects.

Example:

```text
user:123

name → Rahul
age  → 22
city → Delhi
```

Redis:

```redis
HSET user:123 name Rahul age 22 city Delhi
```

Get one field:

```redis
HGET user:123 name
```

Get everything:

```redis
HGETALL user:123
```

Delete a field:

```redis
HDEL user:123 city
```

---

## Hash vs JSON String

### JSON String

```text
user:123 → "{name:'Rahul',age:22}"
```

Good when:

* You usually read/write the entire object
* You want simple storage

### Hash

```text
user:123
   ├── name
   ├── age
   └── city
```

Good when:

* You frequently access individual fields
* You want partial updates

---

# 3. Lists

Redis Lists are ordered collections.

Common commands:

```redis
LPUSH
RPUSH
LPOP
RPOP
LRANGE
LLEN
```

Example:

```redis
LPUSH queue:emails email1
LPUSH queue:emails email2
LPUSH queue:emails email3
```

Conceptually:

```text
email3
email2
email1
```

A List can be used to implement simple queues.

```text
Producer
   │
   ▼
Redis List
   │
   ▼
Consumer
```

---

# 4. Sets

A Redis Set contains **unique members**.

Example:

```redis
SADD users:online user1
SADD users:online user2
SADD users:online user1
```

`user1` only exists once.

Useful commands:

```redis
SADD
SREM
SISMEMBER
SMEMBERS
SCARD
```

Example:

```redis
SISMEMBER users:online user1
```

Useful for:

* Unique users
* Tags
* Permissions
* Membership
* Unique IDs

---

# 5. Sorted Sets — ZSET

One of the most important Redis data structures for real applications.

A Sorted Set contains:

```text
member → score
```

Example:

```text
Rahul → 1500
Aman  → 1200
Priya → 1800
```

Redis keeps them ordered by score.

This makes Sorted Sets excellent for:

* Leaderboards
* Rankings
* Priority systems
* Time-based indexes
* Score-based ordering

---

## Important Commands

```redis
ZADD
ZSCORE
ZRANK
ZREVRANK
ZRANGE
ZREVRANGE
ZREM
ZCARD
```

Example:

```redis
ZADD leaderboard 1500 Rahul
ZADD leaderboard 1800 Priya
ZADD leaderboard 1200 Aman
```

Highest score first:

```redis
ZREVRANGE leaderboard 0 -1 WITHSCORES
```

---

## Leaderboard Mental Model

```text
Redis Sorted Set

leaderboard
│
├── Priya → 1800
├── Rahul → 1500
└── Aman  → 1200
```

Redis handles the ordering.

You don't need to fetch every player into Node.js and sort them manually.

---

# 6. Streams

Redis Streams are designed for **event streams and messaging**.

They are different from Pub/Sub.

Conceptually:

```text
Producer
   │
   ▼
Redis Stream
   │
   ├── Event 1
   ├── Event 2
   ├── Event 3
   └── Event 4
```

Unlike basic Pub/Sub, streams provide persistence and allow consumers to process messages later.

Important concepts include:

* Stream
* Entry ID
* Consumer
* Consumer Group
* Acknowledgement
* Pending messages

Important commands include:

```redis
XADD
XREAD
XGROUP
XREADGROUP
XACK
XPENDING
```

Streams are an important topic to learn after basic Redis.

---

# 7. Pub/Sub

Redis Pub/Sub is designed for broadcasting messages.

Architecture:

```text
Publisher
    │
    ▼
 Redis Channel
    │
 ┌──┼──────┐
 ▼  ▼      ▼
 S1 S2     S3
```

Publisher:

```redis
PUBLISH notifications "Hello"
```

Subscriber:

```redis
SUBSCRIBE notifications
```

---

## Important Pub/Sub Characteristic

Pub/Sub is **not a durable queue**.

If no subscriber is listening when a message is published, that subscriber will not receive it later.

Think:

```text
Pub/Sub = Live broadcast
```

rather than:

```text
Pub/Sub = Stored job queue
```

---

# 🆚 Pub/Sub vs Queue

This distinction is extremely important.

### Pub/Sub

```text
"Something happened."

        ↓

Broadcast to everyone listening
```

### Queue

```text
"Someone needs to do this work."

        ↓

Store job
        ↓
Worker processes it
```

---

# 🏗️ Redis as a Queue

Redis Lists can implement simple queues.

But production applications often use higher-level systems such as **BullMQ** on top of Redis.

Typical architecture:

```text
API
 │
 ▼
BullMQ
 │
 ▼
Redis
 │
 ▼
Worker
```

BullMQ provides features such as:

* Retries
* Backoff
* Delayed jobs
* Job states
* Concurrency
* Worker processing

Redis provides the underlying storage/infrastructure.

---

# ⏳ TTL — Time To Live

One of the most useful Redis features.

You can give a key an expiration time.

Example:

```redis
SET otp:123456 482193 EX 60
```

The key expires after 60 seconds.

Check TTL:

```redis
TTL otp:123456
```

Possible values:

```text
positive number → seconds remaining
-1              → key exists but has no expiry
-2              → key doesn't exist
```

---

# 🔐 OTP Example

A common Redis use case:

```text
Generate OTP
    ↓
Store in Redis
    ↓
Expire after 60 seconds
    ↓
Verify OTP
    ↓
Delete OTP
```

Example:

```text
otp:9876543210 → 482193
                     │
                     └── expires in 60 seconds
```

This is a great example of where Redis is naturally useful.

---

# 🚦 Rate Limiting

Redis is commonly used for rate limiting.

Example:

```text
User
 ↓
Request
 ↓
Redis
 ↓
Check request count
 ↓
Allow / Reject
```

A simple conceptual model:

```text
rate:user:123 → 15
```

with a TTL.

For example:

```text
100 requests
per
60 seconds
```

Redis is particularly suitable because incrementing counters and setting expirations are fast.

---

# 💾 Caching

One of the most common Redis use cases.

Without caching:

```text
Client
  ↓
API
  ↓
Database
  ↓
Response
```

With Redis:

```text
Client
  ↓
API
  ↓
Redis
  │
  ├── Cache Hit → Response
  │
  └── Cache Miss
          ↓
       Database
          ↓
       Redis
          ↓
       Response
```

---

# 🔥 Cache-Aside Pattern

One common caching pattern is:

```text
1. Check Redis
       ↓
2. Found?
   ├── Yes → return data
   │
   └── No
        ↓
3. Query database
        ↓
4. Store result in Redis
        ↓
5. Return result
```

This is often called **Cache-Aside**.

---

# ⚠️ Cache Invalidation

One of the famous problems in software engineering:

> "There are only two hard things in Computer Science: cache invalidation and naming things."

If database data changes:

```text
Database
   ↓
Updated
```

but Redis still contains:

```text
Old data
```

your application may return stale information.

You therefore need an invalidation strategy.

For example:

```text
UPDATE database
      ↓
DELETE Redis cache
```

or update both carefully depending on the architecture.

---

# 🔑 Redis Key Design

Good key naming matters.

Avoid:

```text
user123
data1
temp
```

Prefer structured names:

```text
user:123
user:123:profile
session:abc123
otp:9876543210
leaderboard:global
leaderboard:game:123
rate-limit:user:123
```

A useful mental model:

```text
namespace:entity:identifier
```

Example:

```text
user:profile:123
```

Consistent key naming makes Redis much easier to manage.

---

# 🗑️ DEL vs Expiration

You can manually delete:

```redis
DEL user:123
```

or allow Redis to expire the key:

```redis
EXPIRE user:123 60
```

For temporary data, TTL is often much better than relying on manual cleanup.

Examples:

* OTP
* Session
* Temporary token
* Cache
* Rate-limit counter

---

# 🔢 Atomic Operations

Redis commands are often atomic.

For example:

```redis
INCR counter
```

is safer for concurrent increments than:

```text
GET counter
↓
increment in application
↓
SET counter
```

Why?

Imagine two requests:

```text
Request A → GET 10
Request B → GET 10

Request A → SET 11
Request B → SET 11
```

You expected:

```text
12
```

but got:

```text
11
```

Redis atomic operations help avoid these race conditions.

---

# 🔒 Transactions

Redis supports transactions using:

```redis
MULTI
EXEC
DISCARD
```

Conceptually:

```text
MULTI
  command 1
  command 2
  command 3
EXEC
```

Transactions are useful when multiple commands need to be grouped.

However, Redis transactions are not exactly the same as traditional SQL database transactions.

Understand the Redis transaction model before assuming ACID semantics identical to PostgreSQL/MySQL.

---

# ⚡ Pipelining

If your application needs to send many Redis commands, sending them individually can cause network overhead.

Without pipelining:

```text
Application → Redis
Application → Redis
Application → Redis
Application → Redis
```

With pipelining:

```text
Application
     │
     ├── command 1
     ├── command 2
     ├── command 3
     └── command 4
          ↓
        Redis
```

Pipelining can significantly reduce round trips.

---

# 🧠 Lua Scripts

Redis supports Lua scripting.

Useful when you need multiple operations to execute atomically on the Redis server.

Conceptually:

```text
Application
    ↓
Lua Script
    ↓
Redis
    ├── operation 1
    ├── operation 2
    └── operation 3
```

This becomes useful for advanced operations such as:

* Complex rate limiting
* Atomic state transitions
* Distributed coordination
* Multi-step Redis logic

---

# 🔌 Redis Connections

In Node.js, libraries such as `ioredis` allow you to connect to Redis.

Example:

```js
import Redis from "ioredis";

const redis = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379"
);
```

---

# 📡 Important: Separate Pub/Sub Connections

For Pub/Sub, don't casually reuse one Redis connection for both normal operations and subscription handling.

A common pattern is:

```js
const publisher = new Redis(REDIS_URL);
const subscriber = new Redis(REDIS_URL);
```

Conceptually:

```text
Publisher Connection
        │
        └── PUBLISH


Subscriber Connection
        │
        └── SUBSCRIBE
```

Once a connection is in subscriber mode, it is dedicated to subscription-related operations.

---

# 🐳 Redis and Docker

Docker is a convenient way to run Redis locally.

Typical architecture:

```text
Node.js Application
       │
       ▼
   localhost:6379
       │
       ▼
   Redis Container
```

Docker is **not Redis itself**.

Docker is simply one way to run Redis.

You can also run Redis:

* Locally
* Through a managed cloud provider
* On a VM
* Through Kubernetes
* Through Docker

---

# ☁️ Managed Redis

In production, you may use a managed Redis service instead of maintaining the Redis server yourself.

Your application generally connects using a URL such as:

```text
redis://...
```

or a TLS connection depending on the provider.

The important application-side idea remains:

```text
Application
     ↓
Redis Connection URL
     ↓
Redis Server
```

---

# 💽 Persistence

Redis is often described as an in-memory database, but it also supports persistence mechanisms.

The two major concepts to know are:

### RDB

Periodic snapshots of the dataset.

```text
Redis
  ↓
Snapshot
  ↓
Disk
```

### AOF

Append-only logging of write operations.

```text
SET user:1 Rahul
INCR counter
DEL user:2
```

These operations can be recorded in an append-only log.

---

# 🧠 RDB vs AOF

Very simplified:

| RDB                                                  | AOF                                   |
| ---------------------------------------------------- | ------------------------------------- |
| Snapshots                                            | Write log                             |
| Compact                                              | Usually larger                        |
| Faster restart in some cases                         | More detailed recovery                |
| Can lose recent changes depending on snapshot timing | Can provide more frequent persistence |

The correct choice depends on the application's durability requirements.

---

# 🏗️ Redis Architecture

Redis can be used in several architectural roles.

### Cache

```text
Application
    ↓
 Redis
    ↓
Database
```

### Session Store

```text
Browser
   ↓
Application
   ↓
Redis
```

### Queue

```text
Producer
   ↓
Redis
   ↓
Worker
```

### Pub/Sub

```text
Publisher
   ↓
Redis
   ↓
Subscribers
```

### Leaderboard

```text
Application
    ↓
Sorted Set
    ↓
Ranked Players
```

---

# 🏆 Leaderboard Pattern

For a leaderboard:

```text
leaderboard

Player A → 1000
Player B → 1500
Player C → 1200
```

Use a Sorted Set.

Then Redis can efficiently answer questions such as:

```text
Who has the highest score?
What is Player B's score?
What is Player B's rank?
Who are the top 10 players?
How many players exist?
```

This is one of the best examples of choosing a data structure based on the problem.

---

# 🧵 Redis Streams vs Pub/Sub vs Queue

This is an important comparison.

|                    | Pub/Sub          | Queue                       | Streams          |
| ------------------ | ---------------- | --------------------------- | ---------------- |
| Main idea          | Broadcast        | Process work                | Event stream     |
| Durable            | No               | Depends on implementation   | Yes              |
| Offline consumer   | Misses message   | Job can remain              | Can read later   |
| Multiple consumers | All subscribers  | Usually one worker gets job | Consumer groups  |
| Replay             | No               | Depends                     | Yes              |
| Acknowledgement    | No               | Depends                     | Yes              |
| Use case           | Real-time events | Background jobs             | Event processing |

A good mental model:

```text
Pub/Sub
"Tell everyone now."


Queue
"Someone needs to process this."


Stream
"Record this event and let consumers process it."
```

---

# 🧮 Redis Command Categories

A useful way to organize commands:

## Key Commands

```redis
DEL
EXISTS
EXPIRE
TTL
PERSIST
RENAME
TYPE
KEYS
SCAN
```

---

## Strings

```redis
SET
GET
MSET
MGET
INCR
DECR
INCRBY
APPEND
```

---

## Hashes

```redis
HSET
HGET
HGETALL
HMGET
HDEL
HEXISTS
```

---

## Lists

```redis
LPUSH
RPUSH
LPOP
RPOP
LRANGE
LLEN
```

---

## Sets

```redis
SADD
SREM
SISMEMBER
SMEMBERS
SCARD
SINTER
SUNION
SDIFF
```

---

## Sorted Sets

```redis
ZADD
ZSCORE
ZRANK
ZREVRANK
ZRANGE
ZREVRANGE
ZREM
ZCARD
```

---

## Pub/Sub

```redis
PUBLISH
SUBSCRIBE
UNSUBSCRIBE
PSUBSCRIBE
```

---

## Streams

```redis
XADD
XREAD
XGROUP
XREADGROUP
XACK
XPENDING
```

---

# 🔍 KEYS vs SCAN

Be careful with:

```redis
KEYS *
```

`KEYS` can be dangerous on a large production Redis instance because it can scan a huge keyspace in one operation.

Prefer:

```redis
SCAN
```

for incremental iteration.

This is an important production lesson.

---

# 🚨 Common Redis Mistakes

## 1. Treating Redis only as a cache

Redis can do much more.

---

## 2. Using the wrong data structure

Don't automatically store everything as strings.

Ask:

```text
What operations do I need?
```

Then choose the structure.

---

## 3. Using Pub/Sub for critical durable jobs

Pub/Sub does not provide durable message storage.

Use a proper queue or Streams when reliability matters.

---

## 4. Forgetting TTL

Temporary data without expiration can accumulate indefinitely.

Examples:

```text
OTP
Session
Cache
Rate-limit data
Temporary locks
```

Consider expiration where appropriate.

---

## 5. Poor key naming

Avoid random key names.

Use namespaces.

```text
user:123
session:abc
otp:9876543210
```

---

## 6. Fetching Everything and Sorting in Node.js

Bad:

```text
Redis
 ↓
10 million records
 ↓
Node.js
 ↓
sort()
```

If Redis already provides a structure designed for the operation, use Redis.

---

## 7. Using KEYS in Production

Prefer:

```redis
SCAN
```

over:

```redis
KEYS *
```

for large datasets.

---

## 8. Assuming Redis Data Is Automatically Permanent

Understand:

* Persistence
* RDB
* AOF
* Replication
* Backups
* Recovery

before treating Redis as your only source of truth.

---

# 🔐 Redis Security

Never expose Redis publicly without proper security controls.

Important areas include:

* Authentication
* TLS
* Network restrictions
* Firewalls
* Access control
* Strong credentials
* Protected infrastructure

Do not commit secrets such as:

```text
REDIS_URL
password
API keys
```

to GitHub.

Use:

```text
.env
```

and add it to:

```text
.gitignore
```

---

# 📈 Redis Performance

Redis can be extremely fast, but performance still depends on architecture.

Pay attention to:

* Network latency
* Command complexity
* Memory usage
* Dataset size
* Serialization
* Number of round trips
* Connection management
* Large values
* Blocking commands

Don't assume:

```text
Redis = automatically fast
```

Instead think:

```text
Efficient data structure
+
Efficient command
+
Low network overhead
+
Good architecture
=
Good Redis performance
```

---

# 🧠 Big-O Thinking

You don't need to memorize the complexity of every Redis command immediately.

But you should develop the habit of asking:

```text
What is the complexity of this operation?
```

Especially for:

* Large lists
* Large sets
* Sorted sets
* Range operations
* Key scanning
* Large values

Redis documentation provides the complexity of individual commands.

---

# 📊 Memory Management

Redis stores data primarily in memory, so memory is a critical resource.

You should eventually learn:

```text
MEMORY USAGE
INFO MEMORY
maxmemory
maxmemory-policy
```

Important concepts:

* Memory limits
* Eviction
* Cache policies
* Fragmentation
* Large keys
* Memory-efficient data modeling

For a cache, eviction policies become particularly important.

---

# 🧹 Eviction

If Redis reaches its configured memory limit, it may need to remove keys according to the configured policy.

Common concepts include:

```text
noeviction
allkeys-lru
volatile-lru
allkeys-lfu
volatile-lfu
```

You should learn when each policy makes sense.

---

# 🔄 Replication

Redis supports replication.

Conceptually:

```text
              Primary
                 │
          ┌──────┴──────┐
          ▼             ▼
       Replica 1     Replica 2
```

The replicas can maintain copies of the primary dataset.

Replication can help with:

* High availability
* Read scaling
* Failover architectures

But replication alone does not solve every availability problem.

---

# 🛡️ Redis Sentinel

Redis Sentinel is used for monitoring and automatic failover in certain Redis deployments.

Conceptually:

```text
             Sentinel
             /      \
            /        \
       Primary      Replica
```

If the primary fails, Sentinel can help coordinate failover.

Sentinel is a topic to learn when moving from local Redis to production infrastructure.

---

# 🌐 Redis Cluster

Redis Cluster distributes data across multiple Redis nodes.

Conceptually:

```text
             Redis Cluster

        ┌────────┬────────┬────────┐
        │ Node 1 │ Node 2 │ Node 3 │
        └────────┴────────┴────────┘
              Data distributed
```

Cluster is useful when a single Redis instance is not enough for the workload.

Important concepts:

* Sharding
* Hash slots
* Cluster nodes
* Replicas
* Failover

---

# 🔐 Distributed Locks

Redis can also participate in distributed locking.

Conceptually:

```text
Server A ─────┐
              │
              ▼
            Redis
              ▲
              │
Server B ─────┘
```

Only one server should acquire the lock.

A basic Redis lock concept involves setting a key only if it doesn't already exist and giving it an expiration.

This area becomes more advanced quickly.

Before implementing distributed locks in production, study the Redis locking documentation and understand failure scenarios carefully.

---

# 🏗️ Redis in System Design

Redis frequently appears in system-design interviews.

Common architectures include:

### Caching

```text
Client
  ↓
API
  ↓
Redis
  ↓
Database
```

### Rate Limiting

```text
Client
  ↓
API Gateway
  ↓
Redis Counter
  ↓
Allow / Reject
```

### Leaderboard

```text
Game Server
     ↓
Redis ZSET
     ↓
Ranking
```

### Session Management

```text
Client
  ↓
Backend
  ↓
Redis Session Store
```

### Background Jobs

```text
API
 ↓
Queue
 ↓
Redis
 ↓
Worker
```

### Real-Time Events

```text
Service A
   ↓
Redis Pub/Sub
   ↓
Service B / C / D
```

---

# 🧭 How to Choose the Right Redis Feature

When you face a new problem, ask:

### Do I need a simple value?

Use:

```text
String
```

### Do I need object-like fields?

Use:

```text
Hash
```

### Do I need FIFO/LIFO behavior?

Consider:

```text
List
```

### Do I need uniqueness?

Use:

```text
Set
```

### Do I need ranking/order by score?

Use:

```text
Sorted Set
```

### Do I need real-time broadcasting?

Consider:

```text
Pub/Sub
```

### Do I need durable event processing?

Consider:

```text
Streams
```

### Do I need background jobs?

Consider:

```text
BullMQ / queue system
```

---

# 🧪 Projects I Have Built / Practiced

The following projects represent my hands-on Redis learning.

## OTP with Redis

Concepts:

```text
SET
EX
TTL
GET
DEL
```

Use case:

```text
OTP storage + expiration
```

---

## JSON / Hash User Profiles

Concepts:

```text
SET
GET
JSON.stringify()
JSON.parse()

HSET
HGETALL
```

Use case:

```text
Comparing Redis Strings/JSON with Hashes
```

---

## Redis Queue

Concepts:

```text
LPUSH
RPOP
```

Use case:

```text
Simple background job queue
```

---

## BullMQ Email Queue

Concepts:

```text
Queue
Worker
Retry
Backoff
Job processing
```

Use case:

```text
Background email processing
```

---

## Redis Pub/Sub Notifications

Concepts:

```text
PUBLISH
SUBSCRIBE
Publisher
Subscriber
Channels
```

Use case:

```text
Real-time notifications
```

---

## Live Leaderboard

Concepts:

```text
Sorted Sets
ZADD
ZSCORE
ZREVRANK
ZREVRANGE
```

Use case:

```text
Ranking players by score
```

---

# 🧩 Things I Should Learn Next

Completing a Redis playlist gives a foundation, but Redis is much larger than the basics.

The following topics are worth learning progressively.

## Level 1 — Core Redis

* [x] Strings
* [x] JSON-like storage
* [x] Hashes
* [x] Lists
* [x] Sets
* [x] Sorted Sets
* [x] TTL / Expiration
* [x] Basic Pub/Sub
* [x] Basic queues
* [x] BullMQ
* [x] Leaderboards

---

## Level 2 — Important Intermediate Concepts

* [ ] Redis Streams
* [ ] Consumer Groups
* [ ] Transactions
* [ ] WATCH / optimistic locking
* [ ] Pipelines
* [ ] Lua scripting
* [ ] Atomic operations
* [ ] Rate limiting
* [ ] Cache-aside pattern
* [ ] Cache invalidation
* [ ] Key naming strategies
* [ ] Memory management
* [ ] Eviction policies

---

## Level 3 — Production Redis

* [ ] Persistence
* [ ] RDB
* [ ] AOF
* [ ] Replication
* [ ] Redis Sentinel
* [ ] Redis Cluster
* [ ] Sharding
* [ ] High availability
* [ ] Failover
* [ ] Backups
* [ ] Monitoring
* [ ] Observability
* [ ] Security
* [ ] TLS
* [ ] ACLs
* [ ] Production memory management

---

## Level 4 — Advanced Redis

* [ ] Distributed locks
* [ ] Redlock and its tradeoffs
* [ ] Advanced rate limiting
* [ ] Lua scripts
* [ ] Redis Functions
* [ ] Streams at scale
* [ ] Cluster-aware clients
* [ ] Hot keys
* [ ] Big keys
* [ ] Cache stampede
* [ ] Cache penetration
* [ ] Cache avalanche
* [ ] Consistency strategies

---

## Level 5 — Redis Ecosystem

Eventually explore:

* [ ] Redis Stack
* [ ] RedisJSON
* [ ] RediSearch
* [ ] RedisTimeSeries
* [ ] RedisBloom
* [ ] Redis Vector Search
* [ ] Redis Streams in distributed systems

These aren't necessary to understand basic Redis, but they become useful depending on the projects you work on.

---

# 🚨 Production Problems Worth Knowing

When Redis is used seriously, several problems appear repeatedly.

## Cache Stampede

Many requests miss the cache simultaneously:

```text
        Redis MISS
            │
    ┌───────┼───────┐
    ▼       ▼       ▼
 Request  Request  Request
    │       │       │
    └───────┼───────┘
            ▼
        Database
```

This can overload the database.

Learn techniques such as:

* Locking
* Request coalescing
* TTL jitter
* Background refresh

---

# 🔥 Hot Keys

A single Redis key receives a huge number of requests.

Example:

```text
trending:homepage
```

If millions of requests hit the same key, it can become a bottleneck.

Learn how to identify and handle hot keys.

---

# 🐘 Big Keys

A single Redis key may contain an extremely large value or collection.

Example:

```text
users:all
```

containing millions of members.

Large keys can create:

* Memory problems
* Slow operations
* Network overhead
* Operational difficulty

Learn to identify and avoid problematic key designs.

---

# 🧱 Cache Penetration

Requests repeatedly ask for data that does not exist.

Example:

```text
GET user:999999999999
```

If every request reaches the database because Redis has no cached value, the database can suffer.

Possible techniques include:

* Negative caching
* Bloom filters
* Validation

---

# 🌊 Cache Avalanche

Large numbers of cached keys expire around the same time.

```text
Redis
 │
 ├── key A expires
 ├── key B expires
 ├── key C expires
 ├── key D expires
 └── key E expires
          ↓
       Database
```

A large burst of database requests can follow.

TTL randomization/jitter and other cache strategies can help.

---

# 🧠 Redis Doesn't Replace Your Primary Database

A common architectural mistake is thinking:

```text
Redis is fast
↓
Therefore use Redis for everything
```

Not necessarily.

A common architecture is:

```text
                 Application
                     │
             ┌───────┴───────┐
             ▼               ▼
           Redis          PostgreSQL
          / Cache          / MongoDB
```

Redis may contain:

```text
Temporary
Cached
Derived
Fast-access
Coordination
```

data.

Your primary database may contain:

```text
Persistent
Authoritative
Business-critical
```

data.

The correct architecture depends on the application.

---

# 🧠 The Question to Ask in System Design

Whenever you see Redis in a design, ask:

> **Why Redis?**

Possible answers:

```text
Need very low latency
Need caching
Need TTL
Need atomic counters
Need ranking
Need temporary state
Need Pub/Sub
Need queue infrastructure
Need distributed coordination
```

Don't use Redis just because:

```text
"Redis is fast."
```

Choose it because its data structures and behavior fit the problem.

---

# 📝 Redis Cheat Sheet

## Strings

```redis
SET key value
GET key
DEL key
INCR key
EXPIRE key 60
TTL key
```

## Hash

```redis
HSET user:1 name Rahul age 22
HGET user:1 name
HGETALL user:1
HDEL user:1 age
```

## List

```redis
LPUSH queue item
RPUSH queue item
LPOP queue
RPOP queue
LRANGE queue 0 -1
```

## Set

```redis
SADD users Rahul
SISMEMBER users Rahul
SMEMBERS users
SREM users Rahul
```

## Sorted Set

```redis
ZADD leaderboard 100 Rahul
ZSCORE leaderboard Rahul
ZREVRANK leaderboard Rahul
ZREVRANGE leaderboard 0 9 WITHSCORES
ZREM leaderboard Rahul
```

## Pub/Sub

```redis
PUBLISH notifications "Hello"
SUBSCRIBE notifications
```

## Streams

```redis
XADD events * type login
XREAD COUNT 10 STREAMS events 0
```

---

# 🧭 Redis Learning Roadmap

My Redis learning path:

```text
                     Redis
                       │
                       ▼
              Basic Data Types
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
     Strings         Hashes         Lists
        │              │              │
        └──────────────┼──────────────┘
                       ▼
                 Sets / ZSETs
                       │
                       ▼
                TTL / Expiration
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
       Pub/Sub                    Queues
                                    │
                                  BullMQ
                                    │
                                    ▼
                                Streams
                                    │
                                    ▼
                           Advanced Redis
                                    │
              ┌─────────────────────┼──────────────────┐
              ▼                     ▼                  ▼
          Persistence          Replication          Cluster
              │                     │                  │
              └─────────────────────┼──────────────────┘
                                    ▼
                              Production Redis
```

---

# 🎯 What I Want to Remember

When revisiting Redis years later, these are the concepts I should remember first:

### 1. Redis is a data structure server.

Not just a cache.

### 2. Choose the data structure based on the problem.

```text
String     → simple values
Hash       → objects
List       → ordered queue-like data
Set        → uniqueness
ZSET       → ranking
Stream     → durable event stream
Pub/Sub    → live broadcast
```

### 3. TTL is powerful.

Temporary data should often expire automatically.

### 4. Redis operations can be atomic.

This is useful for counters, rate limits, locks, and concurrency.

### 5. Pub/Sub is not a durable queue.

Messages can be missed.

### 6. BullMQ is a higher-level job queue built around Redis.

It solves a different problem than Pub/Sub.

### 7. Redis performance doesn't mean infinite scalability.

Memory, network, hot keys, big keys, and architecture still matter.

### 8. Production Redis requires more than basic commands.

Eventually learn:

```text
Persistence
Replication
Sentinel
Cluster
Security
Monitoring
Memory management
Failure handling
```

---

# 🔗 Lecture Notes

The detailed lecture-specific notes and implementations live in the folders below.

> Update these links as the folder names evolve.

```text
01 → [Lecture 01](./01-...)
02 → [Lecture 02](./02-...)
03 → [Lecture 03](./03-...)
04 → [Lecture 04](./04-...)
05 → [Lecture 05](./05-...)
06 → [Lecture 06](./06-...)
07 → [Lecture 07](./07-...)
08 → [Lecture 08](./08-...)
09 → [Lecture 09](./09-...)
```

The individual folders should contain the **implementation details**.

This README should remain the **high-level Redis reference**.

---

# 🏁 Final Perspective

Redis is much more than:

```text
SET
GET
```

The real skill is understanding how Redis data structures map to real-world problems.

For example:

```text
OTP
 ↓
String + TTL


Cache
 ↓
String / Hash + TTL


User profile
 ↓
Hash


Simple queue
 ↓
List


Unique users
 ↓
Set


Leaderboard
 ↓
Sorted Set


Real-time broadcast
 ↓
Pub/Sub


Background jobs
 ↓
BullMQ


Durable event processing
 ↓
Streams


High availability
 ↓
Replication / Sentinel / Cluster
```

The goal is not to memorize every Redis command.

The goal is to look at a problem and think:

> **"Which Redis data structure and behavior fit this problem best?"**

That is the Redis skill I want to carry forward from this repository.

---

# 📌 Personal Revision Checklist

Before considering my Redis knowledge "production ready", I should be comfortable explaining and implementing:

* [x] Redis basics
* [x] Redis connection from Node.js
* [x] Strings
* [x] Hashes
* [x] Lists
* [x] Sets
* [x] Sorted Sets
* [x] TTL
* [x] OTP system
* [x] Simple Redis queue
* [x] BullMQ
* [x] Pub/Sub
* [x] Leaderboard
* [ ] Streams
* [ ] Consumer Groups
* [ ] Transactions
* [ ] WATCH
* [ ] Pipelines
* [ ] Lua scripting
* [ ] Rate limiting
* [ ] Caching strategies
* [ ] Cache invalidation
* [ ] Memory management
* [ ] Eviction policies
* [ ] Persistence
* [ ] Replication
* [ ] Sentinel
* [ ] Cluster
* [ ] Security / ACL
* [ ] Monitoring
* [ ] Distributed locks
* [ ] Production failure scenarios

---

## ⭐ Final Rule

```text
Don't ask:

"What Redis command should I use?"

Ask:

"What problem am I solving,
what operations do I need,
and which Redis data structure
is designed for those operations?"
```

That mindset is more valuable than memorizing the Redis command list.
