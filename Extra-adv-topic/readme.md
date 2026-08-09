# Redis — Beyond the Playlist

> Advanced and out-of-the-box Redis notes for concepts not covered in my Redis playlist/repository.

This document intentionally **does not repeat the basic Redis topics already covered in this repository**.

Covered elsewhere:

* Strings
* Hashes
* Lists
* Sets
* Sorted Sets
* `SET` / `GET` / `DEL` / `EXISTS`
* TTL / expiration basics
* OTP
* Basic queues
* BullMQ
* Pub/Sub
* Leaderboards
* Basic Node.js + Redis integration

This document focuses on what comes **after the basics**.

---

# 🧭 What Comes After Basic Redis?

The beginner mental model is:

```text
Redis
 │
 ├── Strings
 ├── Hashes
 ├── Lists
 ├── Sets
 └── Sorted Sets
```

The production mental model is much larger:

```text
                         Redis
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   Data Structures     Reliability         Security
        │                  │                  │
        ▼                  ▼                  ▼
    Streams            Persistence           ACL
    Bitmaps            Replication            TLS
    HyperLogLog        Sentinel              Users
    Geo                Cluster
        │
        ▼
   Advanced Execution
        │
   ┌────┼─────────┐
   ▼    ▼         ▼
 WATCH MULTI    Scripts
             Lua / Functions
```

And then:

```text
                    Production Redis
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  ▼
   Performance        Reliability         Operations
       │                  │                  │
       ▼                  ▼                  ▼
   Pipelining         Replication          Monitoring
   Memory             Persistence          Slowlog
   Big Keys            Failover            Latency
   Hot Keys            Cluster             Debugging
```

---

# 1. Redis Transactions

One of the first advanced concepts to learn is the Redis transaction model.

Redis provides:

```text
MULTI
EXEC
DISCARD
WATCH
```

A basic transaction looks like:

```text
MULTI
  command 1
  command 2
  command 3
EXEC
```

Conceptually:

```text
Application
     │
     ▼
   MULTI
     │
 ┌───┼─────────┐
 ▼   ▼         ▼
 C1  C2        C3
 └───┼─────────┘
     ▼
    EXEC
     │
     ▼
   Redis
```

The important idea is that commands queued inside `MULTI`/`EXEC` execute sequentially without another client's command being interleaved between them.

---

# 2. `WATCH` — Optimistic Concurrency

`WATCH` solves a different problem.

Imagine:

```text
balance = 100
```

Two application servers try to modify it.

```text
Server A ──────┐
               │
               ▼
             Redis
               ▲
               │
Server B ──────┘
```

Both might read the same old value.

`WATCH` allows you to say:

> "Only continue if these keys haven't changed since I read them."

Conceptually:

```text
WATCH balance
     │
     ▼
Read balance
     │
     ▼
Calculate new value
     │
     ▼
MULTI
SET balance ...
EXEC
```

If another client modifies the watched key:

```text
WATCH
  │
  ├── key changed
  │
  ▼
EXEC fails
```

This is called **optimistic concurrency control**.

---

# 3. Redis Transactions Are Not SQL Transactions

Don't think:

```text
Redis MULTI/EXEC
       =
SQL transaction
```

They are not identical.

Redis transactions do not provide the same rollback model you may know from relational databases.

A useful mental model is:

```text
MULTI
  ↓
Queue commands
  ↓
EXEC
  ↓
Execute queued commands sequentially
```

So learn Redis transactions according to Redis's own semantics rather than assuming PostgreSQL/MySQL behavior.

---

# 4. Pipelining

A Redis command normally involves network communication.

Imagine:

```text
Application
    │
    ├── GET
    │      ↓
    │    Redis
    │      ↓
    │   response
    │
    ├── GET
    │      ↓
    │    Redis
    │      ↓
    │   response
    │
    └── GET
```

This creates multiple network round trips.

With pipelining:

```text
Application
     │
     ├── GET
     ├── GET
     ├── GET
     ├── GET
     │
     ▼
   Redis
     │
     ▼
 Responses
```

The commands are sent together.

The important idea:

```text
Pipelining improves network efficiency.
```

It does **not** magically make every individual Redis command algorithmically faster.

---

# 5. Pipelining vs Transactions

These are often confused.

### Pipeline

Main goal:

```text
Reduce network round trips
```

### Transaction

Main goal:

```text
Group commands into a transactional execution sequence
```

They can be used together, depending on the client and use case.

Mental shortcut:

```text
Pipeline
→ Performance


MULTI / EXEC
→ Execution semantics
```

---

# 6. Lua Scripting

Redis can execute Lua scripts directly on the Redis server.

Why?

Imagine:

```text
GET key
↓
calculate
↓
SET key
↓
EXPIRE key
```

Doing this from the application involves network communication.

A Lua script can move the logic to Redis:

```text
Application
     │
     ▼
 Lua Script
     │
 ┌───┼────┐
 ▼   ▼    ▼
GET SET EXPIRE
     │
     ▼
   Redis
```

This is especially useful when several Redis operations must behave atomically.

---

# 7. Redis Functions

Redis also provides **Redis Functions**, which allow server-side functions to be stored and executed by Redis.

The conceptual difference:

```text
Lua script
→ send/evaluate script


Redis Function
→ function is registered on Redis
→ call it later
```

Think of Functions as a more organized way of managing reusable server-side logic.

This becomes interesting when an application has repeated server-side Redis operations.

---

# 8. When Should You Use Server-Side Logic?

Good candidates:

```text
Complex atomic operation
        ↓
Multiple Redis commands
        ↓
Must execute together
        ↓
Move logic closer to Redis
```

Examples:

* Advanced rate limiter
* Atomic inventory update
* Token bucket
* Conditional state transition
* Distributed coordination

But don't put your entire application's business logic into Redis.

Bad:

```text
Node.js
   ↓
Redis
   ↓
20,000 lines of business logic
```

Redis should remain part of the architecture, not become your entire application runtime.

---

# 9. Redis Streams

Streams deserve their own section because they solve a problem that basic Pub/Sub and simple queues don't solve well.

A Stream is an **append-only log-like data structure**.

Think:

```text
Stream
│
├── Event 1
├── Event 2
├── Event 3
├── Event 4
└── Event 5
```

Each entry receives an ID.

```text
1720000000000-0
1720000000010-0
1720000000025-0
```

Streams are useful for:

* Event processing
* Activity feeds
* Notifications
* Event sourcing
* Sensor data
* Background processing

Redis documents Streams as an append-only log with random access and multiple consumption strategies.

---

# 10. Streams vs Pub/Sub

This distinction is extremely important.

```text
PUB/SUB

Publisher
    │
    ▼
 Channel
 ┌──┼───┐
 ▼  ▼   ▼
 A  B   C

Live broadcast
```

If B is offline:

```text
Publisher
    │
    ▼
 Channel
 ┌──┼───┐
 ▼  X   ▼
 A      C

B misses the message
```

Streams:

```text
Producer
    │
    ▼
 ┌─────────────────┐
 │ Redis Stream    │
 ├─────────────────┤
 │ Event 1         │
 │ Event 2         │
 │ Event 3         │
 └─────────────────┘
      │
      ▼
 Consumers can read
 the history
```

So:

```text
Pub/Sub
→ live broadcast


Streams
→ persistent event log
```

---

# 11. Consumer Groups

Streams become much more powerful with consumer groups.

Imagine:

```text
                Stream
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
       C1        C2        C3
```

Without a consumer group, multiple consumers can independently read the same stream.

With a consumer group:

```text
              Stream
                 │
                 ▼
          Consumer Group
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
      C1        C2        C3
```

Messages are distributed among consumers in that group.

Example:

```text
Message 1 → C1
Message 2 → C2
Message 3 → C3
Message 4 → C1
Message 5 → C2
```

This is useful for horizontally scaling workers.

Redis consumer groups maintain pending message state and support explicit acknowledgements.

---

# 12. Stream Acknowledgements

A consumer reads:

```text
Message 42
```

but Redis doesn't automatically know whether your application successfully processed it.

So:

```text
XREADGROUP
     │
     ▼
Process message
     │
     ▼
XACK
```

`XACK` tells Redis:

> "I successfully processed this message."

---

# 13. Pending Entries

What happens if:

```text
Worker
  │
  ▼
Reads message
  │
  ▼
CRASH 💥
  │
  X
 XACK never happens
```

Redis tracks the message as pending.

Conceptually:

```text
Stream
  │
  ▼
Consumer Group
  │
  ▼
Pending Entries List
```

You can inspect pending work using:

```redis
XPENDING
```

This is extremely useful for diagnosing stuck consumers.

---

# 14. `XAUTOCLAIM`

Suppose:

```text
Worker A
   ↓
gets message
   ↓
CRASH 💥
```

The message remains pending.

Another worker can eventually claim it.

```text
Worker B
   │
   ▼
XAUTOCLAIM
   │
   ▼
stuck message
```

This provides a mechanism for recovering messages from failed consumers. Redis documents `XAUTOCLAIM` specifically for changing ownership of pending messages.

---

# 15. Stream Trimming

A stream can grow indefinitely:

```text
Event 1
Event 2
Event 3
...
Event 10,000,000
```

You usually need a retention strategy.

For example:

```text
Keep latest 10,000 events
```

Conceptually:

```text
Old events
   ↓
discard

┌─────────────────────┐
│ latest events       │
└─────────────────────┘
```

Redis supports stream trimming through `XTRIM` and trimming options on `XADD`.

---

# 16. Redis 8.2+ Stream Deletion Awareness

Modern Redis versions have additional stream controls around consumer-group references.

Concepts include:

```text
KEEPREF
DELREF
ACKED
XACKDEL
XDELEX
```

The important idea is that deleting a stream entry becomes more nuanced when multiple consumer groups have references to that entry.

`ACKED` can be used when you want trimming/deletion to consider acknowledgements across consumer groups.

You don't need to memorize these immediately.

Just know:

> Streams become considerably more sophisticated when multiple independent consumers and retention policies are involved.

---

# 17. Bitmaps

Redis can represent binary state compactly using bit operations.

Imagine:

```text
User 1 → online
User 2 → offline
User 3 → online
User 4 → online
```

Conceptually:

```text
1 0 1 1
```

Bitmaps are useful when you have huge numbers of boolean states.

Examples:

* Daily active users
* Feature flags
* Attendance
* Online/offline status
* User activity tracking

Commands include:

```redis
SETBIT
GETBIT
BITCOUNT
BITOP
```

---

# 18. Bitmap Example

Suppose:

```text
Day 0 → user active
Day 1 → user inactive
Day 2 → user active
```

You can represent:

```text
1 0 1
```

Instead of storing:

```text
day:0:user:123 → true
day:1:user:123 → false
day:2:user:123 → true
```

This can save substantial memory for suitable workloads.

The tradeoff is that bitmaps are less intuitive than normal Redis data structures.

---

# 19. HyperLogLog

Sometimes you don't need the exact number of unique users.

You need an **approximation**.

For example:

> How many unique visitors did my website receive today?

Instead of storing every visitor:

```text
user1
user2
user3
...
user50,000,000
```

Redis provides HyperLogLog.

```text
Millions of IDs
      │
      ▼
 HyperLogLog
      │
      ▼
Approximate cardinality
```

Commands:

```redis
PFADD
PFCOUNT
PFMERGE
```

The major advantage:

```text
Very low memory
```

The tradeoff:

```text
Approximate result
```

---

# 20. HyperLogLog Mental Model

Use it when:

```text
Need exact?
   │
   ├── YES → normal data structure
   │
   └── NO
        │
        ▼
   Approximate unique count
        │
        ▼
     HyperLogLog
```

Examples:

* Unique visitors
* Unique IPs
* Unique devices
* Approximate reach

---

# 21. Redis Geospatial

Redis can store geographic coordinates and perform location-based queries.

Conceptually:

```text
                  Store
                    ●

      ● User A

             ● User B


                    ● Restaurant
```

You can ask:

```text
"Find restaurants within 5 km."
```

Redis provides geospatial commands such as:

```redis
GEOADD
GEOSEARCH
GEODIST
```

This is useful for:

* Nearby stores
* Delivery systems
* Drivers
* Ride-sharing
* Location search

---

# 22. Geospatial Mental Model

```text
Coordinates
    │
    ▼
Redis GEO
    │
    ├── distance
    ├── radius
    └── nearby search
```

Redis's geospatial features are backed by sorted-set machinery internally, but the application interacts through GEO commands.

---

# 23. Redis Memory Is a First-Class Concern

When using Redis, always remember:

```text
Redis
  ↓
RAM
  ↓
Finite resource
```

Unlike a disk-based database where storage capacity can be enormous relative to RAM, Redis workloads are heavily constrained by memory.

So eventually you need to ask:

```text
How much memory does my data consume?
```

---

# 24. `MEMORY USAGE`

Redis can tell you how much memory a key consumes.

Example:

```redis
MEMORY USAGE user:123
```

This is useful when investigating:

* Large keys
* Unexpected memory growth
* Cache problems
* Data modeling issues

---

# 25. Big Keys

A **big key** is a key whose value consumes an unusually large amount of memory or requires expensive operations.

Example:

```text
users:all
    │
    ├── user1
    ├── user2
    ├── user3
    ├── ...
    └── millions of users
```

Problems:

```text
Big key
   │
   ├── Large memory usage
   ├── Expensive operations
   ├── Network overhead
   └── Potential latency spikes
```

Avoid blindly putting huge collections behind one key.

---

# 26. Hot Keys

A hot key is different.

A hot key might be tiny:

```text
homepage:config
```

but millions of requests hit it.

```text
Request 1 ─┐
Request 2 ─┤
Request 3 ─┤
Request 4 ─┤
Request 5 ─┤
    ...    ┤
Request N ─┘
            ↓
      homepage:config
```

The problem is not necessarily memory.

The problem is **concentrated traffic**.

---

# 27. Big Key vs Hot Key

Remember:

```text
BIG KEY
→ Too much data in one key


HOT KEY
→ Too much traffic on one key
```

A key can be:

```text
Big but not hot
Hot but tiny
Both big and hot
Neither
```

---

# 28. Eviction Policies

What happens when Redis reaches its configured memory limit?

Redis can use an eviction policy.

Conceptually:

```text
Memory
████████████████████
████████████████████  ← limit
```

New data arrives:

```text
NEW WRITE
   │
   ▼
Memory full
   │
   ▼
Eviction policy
   │
   ▼
Remove eligible key
```

Policies include concepts such as:

```text
noeviction
allkeys-lru
volatile-lru
allkeys-lfu
volatile-lfu
```

---

# 29. LRU vs LFU

### LRU

Least Recently Used.

Question:

> Which key hasn't been accessed recently?

```text
A → accessed 1 sec ago
B → accessed 10 sec ago
C → accessed 1 hour ago

C is a candidate.
```

### LFU

Least Frequently Used.

Question:

> Which key is accessed least often?

```text
A → 1,000 accesses
B → 500 accesses
C → 2 accesses

C is a candidate.
```

Mental shortcut:

```text
LRU → recent usage
LFU → frequency of usage
```

---

# 30. Cache Stampede

Suppose millions of requests depend on:

```text
product:123
```

The key expires:

```text
Redis
  │
  ▼
MISS
```

Suddenly:

```text
Request 1 ─┐
Request 2 ─┤
Request 3 ─┤
Request 4 ─┤
Request 5 ─┤
    ...    ┘
       ↓
   Database
```

The database gets hammered.

This is a **cache stampede**.

---

# 31. Preventing Cache Stampede

Common strategies:

### Randomized TTL

Instead of:

```text
TTL = 60 seconds
```

use something like:

```text
TTL = 60 + random(0..10)
```

So many keys don't expire simultaneously.

---

### Locking

```text
Request
  ↓
Cache miss
  ↓
Acquire lock
  ↓
Fetch database
  ↓
Update cache
  ↓
Release lock
```

Other requests wait or use stale data.

---

### Background Refresh

Refresh the cache before it expires.

```text
Cache
 │
 ├── still valid
 │
 └── almost expired
        ↓
    background refresh
```

---

# 32. Cache Penetration

Suppose attackers repeatedly request:

```text
user:does-not-exist
```

Redis:

```text
MISS
 ↓
Database
 ↓
Not found
```

Every request reaches the database.

This is cache penetration.

Possible strategies:

```text
Negative caching
Bloom filters
Input validation
```

---

# 33. Cache Avalanche

Imagine thousands of cache entries have exactly:

```text
TTL = 3600
```

and were created at approximately the same time.

Then:

```text
Hour 1
 │
 ▼
Thousands expire
 │
 ▼
Huge database traffic
```

This is a cache avalanche.

TTL jitter/randomization can help distribute expiration.

---

# 34. Persistence

Now we move into production Redis.

Redis can persist data to disk.

Two major concepts:

```text
RDB
AOF
```

---

# 35. RDB

RDB is snapshot-based persistence.

Conceptually:

```text
Redis RAM
    │
    │ periodic snapshot
    ▼
┌──────────────┐
│ dump.rdb     │
└──────────────┘
```

The snapshot represents the dataset at a point in time.

Advantages:

```text
Compact
Fast to restore in many situations
Useful for backups
```

Tradeoff:

```text
Recent changes may be lost
depending on snapshot configuration
```

---

# 36. AOF

AOF means:

> Append Only File

Instead of primarily storing snapshots, Redis records write operations.

Conceptually:

```text
SET user:1 Rahul
INCR counter
DEL session:123
```

becomes a log:

```text
┌────────────────────────┐
│ write operation 1      │
│ write operation 2      │
│ write operation 3      │
└────────────────────────┘
```

Redis can use this log to reconstruct the dataset.

---

# 37. RDB vs AOF

```text
             Persistence
                  │
          ┌───────┴───────┐
          ▼               ▼
         RDB             AOF
          │               │
      snapshots       write log
          │               │
       compact       more detailed
```

A simplified comparison:

|                 | RDB             | AOF                     |
| --------------- | --------------- | ----------------------- |
| Model           | Snapshot        | Write log               |
| File size       | Usually smaller | Usually larger          |
| Backup friendly | Yes             | Yes                     |
| Recovery        | Snapshot-based  | Operation-based         |
| Recent data     | May be lost     | Depends on fsync policy |

For production, the correct choice depends on your durability requirements.

---

# 38. AOF Fsync Policies

AOF durability depends partly on how frequently writes are synchronized to disk.

Conceptually:

```text
Redis
  ↓
AOF
  ↓
Disk
```

More frequent syncing:

```text
Better durability
+
More I/O
```

Less frequent syncing:

```text
Better performance
+
Potentially more data loss
```

This is a classic engineering tradeoff.

---

# 39. Redis Is Not Automatically Durable

Important:

```text
Redis running in RAM
≠
permanent storage
```

If Redis is your source of truth, you need to understand:

```text
Persistence
Backups
Replication
Failover
Recovery
```

Do not assume:

> "Redis has persistence, therefore data can never be lost."

Failure scenarios still matter.

---

# 40. Replication

Redis supports primary/replica architectures.

```text
             Primary
                │
        ┌───────┴───────┐
        ▼               ▼
     Replica 1       Replica 2
```

The primary handles writes.

Replicas maintain copies of the data.

Replication is generally asynchronous.

---

# 41. Why Replication?

Replication can help with:

### Read scaling

```text
             Primary
                │
        ┌───────┼───────┐
        ▼       ▼       ▼
       R1      R2      R3
```

Reads can potentially be distributed.

### High availability

If the primary fails, a replica may be promoted depending on the architecture.

### Disaster recovery

Replicas provide additional copies of data.

But:

```text
Replica ≠ Backup
```

They solve different problems.

---

# 42. Replication Lag

Because replication is asynchronous:

```text
Primary
   │
   │ write
   ▼
Updated immediately

Replica
   │
   │ network/processing delay
   ▼
Updated slightly later
```

So a replica can temporarily contain stale data.

This matters if your application does:

```text
WRITE primary
   ↓
READ replica immediately
```

You may not see the newest value.

---

# 43. `WAIT`

Redis provides `WAIT` to wait for writes to be propagated to a specified number of replicas.

Conceptually:

```text
WRITE
 │
 ▼
Primary
 │
 ├── Replica 1 ✓
 ├── Replica 2 ✓
 └── Replica 3 ...
      │
      ▼
    WAIT
```

Important:

`WAIT` can reduce the chance of losing acknowledged writes due to replication lag, but it does not turn asynchronous Redis replication into a fully synchronous distributed database or guarantee zero data loss across every failure scenario. Redis documents this nuance explicitly.

---

# 44. Redis Sentinel

Sentinel is designed for high availability of Redis deployments.

Conceptually:

```text
             Sentinel
          /      |      \
         ▼       ▼       ▼
     monitor  monitor  monitor

              Redis
                │
             Primary
             /     \
            ▼       ▼
        Replica   Replica
```

Sentinel can monitor instances and coordinate failover.

---

# 45. Sentinel Failover

Normal:

```text
Primary
  │
  ├── Replica A
  └── Replica B
```

Primary crashes:

```text
Primary 💥
```

Sentinel detects the failure and can coordinate promotion:

```text
Replica A
    │
    ▼
New Primary
```

Applications then need a way to discover the new primary.

---

# 46. Sentinel vs Cluster

Don't confuse them.

### Sentinel

Main focus:

```text
High availability
Monitoring
Failover
```

### Redis Cluster

Main focus:

```text
Horizontal scaling
Sharding
High availability
```

Simplified:

```text
Sentinel
→ "Which server is primary?"


Cluster
→ "Where does this data live?"
```

---

# 47. Redis Cluster

A single Redis server has limits.

Eventually:

```text
One Redis
   │
   ├── CPU limit
   ├── Memory limit
   └── Network limit
```

Cluster distributes data across multiple nodes.

```text
                 Redis Cluster

       ┌──────────┬──────────┬──────────┐
       │ Node A   │ Node B   │ Node C   │
       │          │          │          │
       │ shard 1  │ shard 2  │ shard 3  │
       └──────────┴──────────┴──────────┘
```

---

# 48. Hash Slots

Redis Cluster uses **16,384 hash slots**.

Conceptually:

```text
Keys
 │
 ▼
Hash function
 │
 ▼
Hash slot
 │
 ├── 0
 ├── 1
 ├── 2
 ├── ...
 └── 16383
        │
        ▼
    Cluster node
```

The important idea:

```text
key
 ↓
slot
 ↓
node
```

---

# 49. Why Hash Slots?

Suppose:

```text
user:1
user:2
user:3
...
```

The cluster determines which node owns each key.

```text
user:1 → Node A
user:2 → Node C
user:3 → Node B
```

This is **sharding**.

---

# 50. Cluster Resharding

Imagine:

```text
Node A → 60% data
Node B → 40% data
```

Add Node C:

```text
Node A → 40%
Node B → 30%
Node C → 30%
```

Slots can be moved between nodes.

This process is called **resharding**.

---

# 51. Hash Tags

Cluster introduces an interesting concept called **hash tags**.

Example:

```text
user:{123}:profile
user:{123}:orders
user:{123}:sessions
```

The portion inside `{}` can influence the hash slot.

So related keys can intentionally be placed on the same slot.

Conceptually:

```text
user:{123}:profile ─┐
user:{123}:orders  ─┼──► same slot
user:{123}:session ─┘
```

This matters because some multi-key operations require keys to be in the same hash slot.

---

# 52. Cluster Multi-Key Problem

Suppose:

```text
key A → Node 1
key B → Node 2
```

and you want an operation involving both.

The cluster has a problem:

```text
          Operation
          /       \
         ▼         ▼
      Node 1     Node 2
```

This is why hash tags matter.

You can intentionally colocate related keys:

```text
cart:{user123}
profile:{user123}
orders:{user123}
```

---

# 53. ACL — Access Control Lists

Redis supports users and permissions through ACLs.

Instead of:

```text
Everyone
   ↓
Everything
```

you can create restricted users:

```text
Application
   │
   ▼
Redis User
   │
   ├── GET ✓
   ├── SET ✓
   ├── DEL ✓
   ├── CONFIG ✗
   └── FLUSHALL ✗
```

ACLs are available from Redis 6 onward.

---

# 54. Principle of Least Privilege

Suppose your application only needs:

```text
GET
SET
DEL
```

Why give it permission to:

```text
FLUSHALL
CONFIG
SHUTDOWN
```

?

You shouldn't.

Instead:

```text
Application user
      │
      ├── GET ✓
      ├── SET ✓
      ├── DEL ✓
      └── dangerous commands ✗
```

This is the principle of least privilege.

---

# 55. ACL Concepts

Useful commands to learn:

```redis
ACL USERS
ACL GETUSER
ACL SETUSER
ACL DELUSER
ACL LIST
```

You should eventually understand:

```text
Users
Passwords
Commands
Key patterns
Channels
Permissions
```

Redis ACL documentation provides detailed control over command and resource permissions.

---

# 56. TLS

If Redis traffic crosses an untrusted network:

```text
Application ─────── Redis
```

you don't want credentials and data traveling unprotected.

TLS provides encrypted communication:

```text
Application
     │
     │ encrypted
     ▼
   Redis
```

In production, understand:

* TLS certificates
* Certificate validation
* Encrypted Redis connections
* Secure configuration

---

# 57. Redis Exposure

Never casually expose Redis directly to the public internet.

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
Application
   │
 private network
   ▼
Redis
```

Redis should generally live inside an appropriately protected network.

---

# 58. `FLUSHALL` Is Dangerous

This command:

```redis
FLUSHALL
```

removes all keys from all databases on the Redis server.

Conceptually:

```text
Redis
 ├── user:1
 ├── user:2
 ├── session:1
 ├── cache:1
 └── ...
       │
       ▼
   FLUSHALL 💥
       │
       ▼
      EMPTY
```

Treat destructive commands with extreme care.

---

# 59. `KEYS` vs `SCAN`

You may already know `KEYS`, but the production concept is important.

Avoid:

```redis
KEYS *
```

on a large production dataset.

It can scan the entire keyspace in one operation.

Prefer:

```redis
SCAN
```

which allows incremental iteration.

Mental model:

```text
KEYS
 ↓
"Give me everything now."


SCAN
 ↓
"Give me the next batch."
```

---

# 60. Redis Latency

Redis is fast, but latency can still happen.

Possible causes:

```text
Large commands
Large values
Network latency
Slow disk operations
CPU pressure
Big keys
Hot keys
Blocking commands
Client-side issues
```

Think:

```text
Request
  │
  ▼
Application
  │
  ▼
Network
  │
  ▼
Redis
  │
  ▼
Command execution
```

Latency can originate at multiple points.

---

# 61. Slow Log

Redis can record commands that take longer than a configured threshold.

Useful concept:

```text
Application
   │
   ▼
Redis
   │
   ▼
Slow command
   │
   ▼
Slowlog
```

Commands worth knowing:

```redis
SLOWLOG GET
SLOWLOG LEN
SLOWLOG RESET
```

This can help identify problematic commands.

---

# 62. `MONITOR`

Redis also provides:

```redis
MONITOR
```

which shows commands being processed.

Conceptually:

```text
Client
 │
 ├── GET user:1
 ├── SET cache:1 ...
 ├── DEL session:1
 │
 ▼
MONITOR
```

This can be useful for debugging, but it should be used carefully because monitoring every command can itself have performance implications.

---

# 63. `INFO`

Redis exposes server information through:

```redis
INFO
```

You can inspect areas such as:

```text
server
clients
memory
stats
replication
cpu
keyspace
```

This is one of the most useful operational commands to learn.

---

# 64. Observability

Production Redis should not be a black box.

You should monitor things such as:

```text
Memory usage
CPU
Connected clients
Command latency
Operations/sec
Cache hit rate
Evictions
Expired keys
Replication lag
Blocked clients
Keyspace size
Errors
```

Architecture:

```text
                 Redis
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
     Metrics      Logs      Traces
        │          │          │
        └──────────┼──────────┘
                   ▼
              Monitoring
```

---

# 65. Cache Hit Rate

For caching systems, an important metric is:

```text
Cache Hit Rate
```

Conceptually:

```text
        Cache hits
---------------------------
Cache hits + cache misses
```

For example:

```text
900 hits
100 misses

Hit rate = 90%
```

If your cache hit rate is terrible, Redis may not be providing much benefit.

---

# 66. Cache Invalidation Strategies

Caching introduces a synchronization problem.

Suppose:

```text
Database
   │
   ├── price = 100
   │
Redis
   │
   └── price = 100
```

Database changes:

```text
Database → price = 120
```

Redis still says:

```text
Redis → price = 100
```

Now you need an invalidation strategy.

Common approaches:

```text
Write-through
Cache-aside
Write-behind
Explicit invalidation
TTL-based expiration
Event-driven invalidation
```

---

# 67. Write-Through Cache

```text
Application
    │
    ▼
  Cache
    │
    ▼
 Database
```

Write goes through the cache layer.

The application doesn't simply update the database and forget the cache.

---

# 68. Write-Behind Cache

```text
Application
    │
    ▼
  Redis
    │
    │ later
    ▼
 Database
```

The cache receives the write first and persistence happens asynchronously.

Potential advantage:

```text
Very fast writes
```

Potential risk:

```text
More complex durability
```

---

# 69. Cache-Aside

The application manages the cache.

Read:

```text
Application
    │
    ▼
 Redis?
   / \
 YES  NO
 │     │
 ▼     ▼
Return Database
       │
       ▼
      Redis
```

This is one of the most common caching architectures.

---

# 70. Client-Side Caching

Redis also supports mechanisms that allow clients to cache values locally.

Architecture:

```text
Application
   │
   ├── local memory
   │
   └── Redis
```

Instead of:

```text
Every request
   ↓
Network
   ↓
Redis
```

some frequently used values can be served locally.

The challenge becomes:

```text
How do we know local data is still valid?
```

This introduces invalidation/tracking mechanisms.

This is an advanced optimization, not something to reach for immediately.

---

# 71. RESP — Redis Serialization Protocol

When your Node.js application communicates with Redis, there is a protocol underneath.

Redis clients communicate using **RESP**.

Conceptually:

```text
Node.js
   │
   │ RESP
   ▼
 Redis
```

RESP is the wire protocol used for Redis communication.

You don't normally write RESP manually, but understanding that:

```text
Redis client
     ↓
Protocol
     ↓
Redis server
```

helps explain networking, latency, and client behavior.

---

# 72. Blocking Commands

Some Redis commands intentionally wait for something to happen.

For example, queue-like patterns can use blocking operations.

Conceptually:

```text
Worker
  │
  ▼
"Give me work"
  │
  │ no work
  │
  └──────── waits
             │
             │ new job
             ▼
           return
```

Blocking operations can be useful for workers, but you should understand their effect on connections and concurrency.

---

# 73. Connection Pools

Your application may have many requests:

```text
Request 1 ─┐
Request 2 ─┤
Request 3 ─┤
Request 4 ─┤
    ...    │
Request N ─┘
```

You don't want every request to repeatedly create a new Redis TCP connection.

Instead, Redis clients/connections should be managed appropriately.

Learn:

```text
Connection reuse
Connection pooling
Maximum connections
Connection limits
Timeouts
```

---

# 74. Redis Client Failure Handling

Production code should assume Redis can fail.

For example:

```text
Application
    │
    ▼
Redis
    X
 Redis unavailable
```

What should your application do?

Possible strategies:

```text
Retry
Fallback
Return degraded response
Use stale cache
Fail fast
Queue work elsewhere
```

The correct strategy depends on whether Redis is:

```text
Cache
Source of truth
Queue
Session store
Critical dependency
```

---

# 75. Redis as a Dependency

This is an important system-design question.

Suppose Redis is only a cache:

```text
Application
  │
  ├── Redis ❌
  │
  └── Database ✓
```

The application may continue operating, although slower.

But if Redis stores:

```text
Authentication sessions
```

or:

```text
Critical job state
```

then Redis failure may be much more serious.

So ask:

> What happens to my system if Redis disappears for five minutes?

That question reveals whether your architecture is resilient.

---

# 76. Distributed Locks

Suppose two servers try to process the same resource:

```text
Server A ──┐
           │
           ▼
         Resource
           ▲
           │
Server B ──┘
```

You might need:

```text
Only one server can perform this operation.
```

A distributed lock can coordinate this.

A basic conceptual pattern involves an atomic conditional key creation with an expiration.

```text
SET lock:key random-token NX EX 30
```

Conceptually:

```text
Server A
   │
   ▼
Acquire lock ✓
   │
   ▼
Work


Server B
   │
   ▼
Acquire lock ✗
   │
   ▼
Wait / retry
```

---

# 77. Why Lock Expiration Matters

Never create an infinite lock casually.

Bad:

```text
lock:resource = locked
```

What if the server crashes?

```text
Server
  ↓
LOCK
  ↓
💥 CRASH
```

Now:

```text
lock remains forever
```

TTL provides a safety mechanism:

```text
LOCK
 │
 └── expires automatically
```

But distributed locking is subtle. Learn failure scenarios before using Redis locks for critical correctness.

---

# 78. Redlock

You may eventually encounter **Redlock**, a distributed locking algorithm using multiple Redis instances.

You don't need to implement it immediately.

The important lesson is:

```text
Distributed locking
≠
simple SET command
```

There are difficult failure scenarios involving:

* Network partitions
* Process pauses
* Clock assumptions
* Failover
* Lease expiration
* Delayed clients

Learn the theory before relying on a distributed lock for critical business correctness.

---

# 79. Fencing Tokens

A more advanced distributed-systems concept is **fencing tokens**.

Imagine:

```text
Client A
   ↓
gets lock
   ↓
pauses for a long time
```

The lock expires.

```text
Client B
   ↓
gets new lock
```

Now A wakes up.

Without additional protection:

```text
A thinks:
"I still own the resource."
```

Fencing tokens provide monotonically increasing ownership numbers:

```text
A → token 41
B → token 42
```

The resource can reject:

```text
token 41
```

because:

```text
42 > 41
```

This is a powerful distributed-systems concept beyond basic Redis.

---

# 80. Redlock vs Fencing

The broader lesson is:

```text
Lock
  ↓
Lease ownership
  ↓
But ownership can become stale
  ↓
Fencing tokens protect the resource
```

This is why distributed locks require more thought than:

```text
SET lock NX EX
```

---

# 81. Redis Modules / Extended Capabilities

Redis can be extended beyond its traditional data structures.

Depending on your Redis distribution/service, you may encounter capabilities such as:

```text
JSON
Search
Vector similarity
Time series
Bloom filters
```

The important concept is:

```text
Redis
  │
  ├── Core data structures
  │
  └── Extended capabilities
```

You don't need these for core Redis, but they can make Redis useful for specialized workloads.

---

# 82. RedisJSON

JSON-oriented functionality allows structured JSON documents to be manipulated without always serializing/deserializing the entire object in your application.

Instead of:

```text
GET entire JSON
      ↓
JSON.parse()
      ↓
modify
      ↓
JSON.stringify()
      ↓
SET entire JSON
```

JSON-aware operations can work with parts of the document.

This becomes useful for document-like workloads.

---

# 83. Redis Search

Search capabilities can provide indexing and querying over Redis data.

Instead of:

```text
GET everything
     ↓
Node.js
     ↓
filter()
```

you can have Redis maintain indexes.

Conceptually:

```text
Documents
    │
    ▼
 Redis Index
    │
    ▼
 Search Query
    │
    ▼
 Matching documents
```

Useful for:

* Full-text search
* Filtering
* Faceted queries
* Document retrieval

---

# 84. Vector Search

Modern Redis deployments can also be used for vector similarity search.

Conceptually:

```text
Text
 │
 ▼
Embedding
 │
 ▼
Vector
 │
 ▼
Redis
 │
 ▼
Similarity Search
 │
 ▼
Nearest vectors
```

This can support applications such as:

* Semantic search
* Recommendation systems
* Retrieval-augmented generation
* Similarity matching

The important idea:

```text
Traditional search
→ keyword matching


Vector search
→ semantic similarity
```

---

# 85. Bloom Filters

A Bloom filter answers:

> "Is this item possibly present?"

It has:

```text
False positives → possible
False negatives → normally no
```

Conceptually:

```text
              Bloom Filter
            ┌───────────────┐
item ──────►│ bits          │
            │ 010110101... │
            └───────────────┘
```

Useful for:

```text
"Have I probably seen this ID?"
```

Examples:

* Preventing cache penetration
* Checking whether a username might exist
* Duplicate detection
* Large membership tests

---

# 86. Approximate Data Structures

This introduces a useful Redis principle:

Sometimes:

```text
Exact answer
```

is unnecessarily expensive.

You may instead use:

```text
Approximate answer
```

Examples:

```text
HyperLogLog → approximate cardinality

Bloom Filter → approximate membership

Count-Min Sketch → approximate frequency
```

The broader lesson:

> In large-scale systems, approximation can dramatically reduce memory and computation.

---

# 87. Time Series

Redis can also be used for time-series workloads through Redis time-series capabilities.

Conceptually:

```text
Time
 │
 ├── 10:00 → 72
 ├── 10:01 → 73
 ├── 10:02 → 75
 ├── 10:03 → 74
 └── ...
```

Potential use cases:

* IoT metrics
* Sensor readings
* Application metrics
* Financial measurements

This is a specialized capability rather than something you need for basic Redis.

---

# 88. Data Modeling in Redis

At an advanced level, stop asking:

> "What data do I have?"

Start asking:

> "What queries do I need?"

For example:

```text
Requirement:
Find top 100 players.
```

This leads to:

```text
Sorted Set
```

Another:

```text
Requirement:
Check whether user has permission.
```

Could lead to:

```text
Set
```

Another:

```text
Requirement:
Get latest events.
```

Could lead to:

```text
Stream
```

Redis data modeling is **access-pattern driven**.

---

# 89. Denormalization

Unlike relational database design, Redis often benefits from storing data in the shape required by the application.

For example:

```text
Database:

users
orders
products
```

Redis might have:

```text
homepage:products
user:123:summary
user:123:recent-orders
```

These may contain derived data optimized for fast reads.

This is called **denormalization**.

---

# 90. Redis as a Materialized View

Imagine your database contains:

```text
Orders
Products
Users
```

but your frontend needs:

```text
Homepage:
- top products
- user recommendations
- recent activity
```

You can precompute:

```text
Database
   │
   ▼
Processing
   │
   ▼
Redis
   │
   ├── homepage:products
   ├── user:123:recommendations
   └── activity:global
```

Redis becomes a fast **materialized view**.

---

# 91. Event-Driven Cache Invalidation

Instead of waiting for TTL:

```text
Database updated
      │
      ▼
Publish event
      │
      ▼
Cache invalidation
```

Architecture:

```text
Database
   │
   ▼
Event
   │
   ▼
Redis / Consumer
   │
   ▼
Delete stale cache
```

This can reduce stale data windows.

---

# 92. Idempotency

A very important distributed-systems concept.

Suppose a payment request is retried:

```text
Request
   ↓
Payment
   ↓
Network timeout
   ↓
Client retries
```

Now the server sees:

```text
same operation
twice
```

You don't want:

```text
₹500
+
₹500
=
₹1000 charged
```

You want one logical operation.

Redis can help store idempotency keys:

```text
idempotency:abc123
       ↓
   processed
```

Then:

```text
Request 1 → process
Request 2 → detect existing key
           → don't process again
```

This is a powerful real-world Redis pattern.

---

# 93. Token Bucket Rate Limiting

A basic counter is not the only rate-limiting algorithm.

One advanced algorithm is the **Token Bucket**.

Imagine a bucket:

```text
        ┌───────────────┐
        │ ● ● ● ● ●     │
        │               │
        │   TOKENS      │
        └───────────────┘
```

Tokens are added over time.

Each request consumes a token:

```text
Request
   │
   ▼
Take token
   │
 ┌─┴────────┐
 ▼          ▼
Token      No token
exists     ↓
 │         Reject
 ▼
Allow
```

Redis's atomic operations and scripting capabilities make it suitable for implementing such algorithms.

---

# 94. Sliding Window Rate Limiting

Another algorithm tracks requests over a moving time window.

Example:

```text
Last 60 seconds
────────────────────────────
│ request │ request │ ... │
────────────────────────────
```

Redis Sorted Sets can be useful because timestamps can act as scores.

Conceptually:

```text
rate:user:123

timestamp → request
timestamp → request
timestamp → request
```

Then:

```text
remove old timestamps
count recent timestamps
add current timestamp
```

The challenge is making the sequence atomic, which is where Lua/functions or carefully designed commands become useful.

---

# 95. Exactly-Once Processing Is Hard

You will often hear:

```text
"Exactly once"
```

Be skeptical.

Distributed systems frequently deal with:

```text
At-most-once
At-least-once
Effectively-once / idempotent processing
```

A worker might:

```text
receive job
↓
perform external action
↓
crash before ACK
```

The message may be delivered again.

Therefore:

```text
Retry
   ↓
Duplicate possibility
```

This is why **idempotency** is so important.

---

# 96. At-Most-Once vs At-Least-Once

### At-most-once

```text
Message
 ↓
Process once
 ↓
Failure?
 ↓
May be lost
```

### At-least-once

```text
Message
 ↓
Process
 ↓
Failure before acknowledgement
 ↓
Retry
```

Potential result:

```text
Duplicate processing
```

Many reliable systems prefer at-least-once delivery plus idempotent consumers.

---

# 97. Redis Failure Modes

When designing a Redis-backed system, ask:

```text
What if...
```

### Redis crashes?

```text
Redis 💥
```

### Network disappears?

```text
Application ──X── Redis
```

### Primary fails?

```text
Primary 💥
```

### Replica is stale?

```text
Primary → new value
Replica → old value
```

### Cache disappears?

```text
Cache MISS
```

### Worker crashes?

```text
Job pending
```

### Key expires unexpectedly?

```text
GET → null
```

Production engineering is about handling these cases intentionally.

---

# 98. Redis Failure Strategy Depends on the Role

This is one of the most important architecture lessons.

### Redis as cache

```text
Redis failure
     ↓
Database fallback
```

### Redis as session store

```text
Redis failure
     ↓
Authentication problems
```

### Redis as queue

```text
Redis failure
     ↓
Background jobs affected
```

### Redis as primary data store

```text
Redis failure
     ↓
Potential data loss / outage
```

The same Redis technology can therefore have completely different reliability requirements.

---

# 99. Disaster Recovery

Production Redis should have a recovery plan.

Ask:

```text
If Redis disappears completely,
how quickly can we recover?
```

Important concepts:

```text
Backup
Restore
Replication
Snapshots
AOF
Failover
RPO
RTO
```

---

# 100. RPO and RTO

### RPO

**Recovery Point Objective**

> How much data can we afford to lose?

Example:

```text
RPO = 1 minute
```

means losing the last minute of data might be acceptable.

### RTO

**Recovery Time Objective**

> How quickly must the system recover?

Example:

```text
RTO = 30 seconds
```

means the service should recover within approximately 30 seconds.

---

# 101. Redis Architecture Decision

When adding Redis to a system, ask:

```text
Why Redis?
   │
   ▼
What data?
   │
   ▼
What access pattern?
   │
   ▼
How much data?
   │
   ▼
How much traffic?
   │
   ▼
What happens if Redis fails?
   │
   ▼
What durability is required?
   │
   ▼
Single instance / Sentinel / Cluster?
```

This is much more valuable than simply knowing commands.

---

# 102. A Practical Redis Production Checklist

Before deploying Redis seriously:

```text
[ ] Authentication configured
[ ] ACLs considered
[ ] Network access restricted
[ ] TLS considered
[ ] Persistence configured appropriately
[ ] Backup strategy defined
[ ] Recovery tested
[ ] Memory limit understood
[ ] Eviction policy chosen
[ ] TTL strategy reviewed
[ ] Big keys monitored
[ ] Hot keys monitored
[ ] Slow commands monitored
[ ] Replication understood
[ ] Failover tested
[ ] Monitoring configured
[ ] Alerts configured
[ ] Client reconnect behavior tested
[ ] Application fallback behavior defined
[ ] Dangerous commands protected
[ ] Capacity planning performed
```

---

# 103. Redis Mental Models to Remember

Instead of memorizing hundreds of commands, remember these models.

### Model 1 — Data structure

```text
Problem
  ↓
Access pattern
  ↓
Data structure
```

---

### Model 2 — Reliability

```text
Data
 ↓
Persistence
 ↓
Replication
 ↓
Failover
 ↓
Backup
 ↓
Recovery
```

Each solves a different problem.

---

### Model 3 — Performance

```text
Performance
    │
    ├── CPU
    ├── Memory
    ├── Network
    ├── Command complexity
    ├── Big keys
    ├── Hot keys
    └── Round trips
```

---

### Model 4 — Distributed systems

```text
Request
  ↓
Network
  ↓
Redis
  ↓
Network
  ↓
Application
```

Networks fail.

Processes crash.

Messages can be duplicated.

Replicas can lag.

Locks can expire.

Design for those realities.

---

# 104. What I Should Learn Next

After completing the beginner Redis playlist, this is a good progression:

```text
                 Redis Basics ✓
                       │
                       ▼
                Transactions
                       │
                       ▼
                 Pipelining
                       │
                       ▼
              Lua / Functions
                       │
                       ▼
                  Streams
                       │
                       ▼
             Consumer Groups
                       │
                       ▼
              Rate Limiting
                       │
                       ▼
               Caching Patterns
                       │
                       ▼
             Memory Management
                       │
                       ▼
                Persistence
                       │
                       ▼
                Replication
                       │
                       ▼
                 Sentinel
                       │
                       ▼
                  Cluster
                       │
                       ▼
                  Security
                       │
                       ▼
                Monitoring
                       │
                       ▼
             Production Redis
```

---

# 🧪 Projects to Build From These Concepts

Instead of only reading these topics, build small systems.

## Project 1 — Redis Stream Worker

Build:

```text
API
 ↓
XADD
 ↓
Redis Stream
 ↓
Consumer Group
 ↓
Worker
 ↓
XACK
```

Add:

* Retry
* Pending messages
* `XPENDING`
* `XAUTOCLAIM`
* Stream trimming

---

## Project 2 — Distributed Rate Limiter

Implement:

```text
Token Bucket
```

Then:

```text
Sliding Window
```

Compare both.

---

## Project 3 — Cache System

Build:

```text
Node.js
  │
  ▼
Redis Cache
  │
  ▼
MongoDB/PostgreSQL
```

Implement:

* Cache-aside
* TTL
* Cache miss
* Cache hit
* Invalidation
* Stampede protection

---

## Project 4 — Idempotent Payment API

Build:

```text
Client
  │
  ▼
Payment API
  │
  ▼
Redis idempotency key
  │
  ▼
Database
```

Simulate duplicate requests.

---

## Project 5 — Redis Cluster Lab

Learn:

```text
Hash slots
   ↓
Multiple nodes
   ↓
Replication
   ↓
Failover
   ↓
Resharding
```

---

# 🧠 Final "Out of the Box" Lessons

These are the things worth remembering years later.

### Redis isn't just about commands.

It is about:

```text
Data modeling
+
Access patterns
+
Latency
+
Concurrency
+
Failure handling
+
Memory
+
Distributed systems
```

---

### Redis isn't automatically reliable.

Reliability comes from architecture:

```text
Persistence
+
Replication
+
Failover
+
Backups
+
Monitoring
+
Recovery
```

---

### Redis isn't automatically a cache.

It can be:

```text
Cache
Queue
Stream
Session store
Counter
Lock coordinator
Leaderboard
Search engine
Vector store
Geospatial engine
Event-processing system
```

---

### The hardest Redis problems aren't `GET` and `SET`.

The interesting problems are:

```text
What happens when Redis crashes?

What happens when a worker crashes?

What happens when a message is processed twice?

What happens when a replica is stale?

What happens when 1 million requests hit one key?

What happens when 1 key consumes 5 GB?

What happens when the cache expires for everyone at once?

What happens when two servers think they own the same resource?

What happens when the network fails halfway through an operation?
```

These are **distributed-systems questions**, and this is where Redis becomes much more interesting.

---

# 📌 Ultimate Redis Learning Map

```text
                           REDIS
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   DATA MODELING        EXECUTION             MESSAGING
        │                    │                    │
        ├─ Strings           ├─ MULTI             ├─ Streams
        ├─ Hashes            ├─ EXEC              ├─ Groups
        ├─ Lists             ├─ WATCH             ├─ ACK
        ├─ Sets              ├─ Pipeline          ├─ Pending
        ├─ ZSET              ├─ Lua               └─ Claim
        ├─ Bitmap            └─ Functions
        ├─ HyperLogLog
        └─ GEO
                             │
                             ▼
                       RELIABILITY
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
          Persistence     Replication     Failover
              │              │              │
              ├─ RDB         │          Sentinel
              └─ AOF         │          Cluster
                             │
                             ▼
                         SECURITY
                             │
                    ┌────────┼────────┐
                    ▼        ▼        ▼
                   ACL       TLS     Network
                             │
                             ▼
                       PERFORMANCE
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
         Memory           Latency          Network
            │                │                │
         Eviction         Slowlog         Pipelining
         Big Keys         Hot Keys
                             │
                             ▼
                       SYSTEM DESIGN
                             │
       ┌─────────────────────┼──────────────────────┐
       ▼                     ▼                      ▼
     Cache                Queues                 Events
       │                     │                      │
       ▼                     ▼                      ▼
   Invalidation           Workers                Streams
   Stampede               Retries                Pub/Sub
   Penetration            Idempotency             ACK
   Avalanche
```

---

# 🏁 The One Sentence to Remember

> **Redis is not primarily a collection of commands to memorize; it is a toolkit of data structures and distributed-system primitives that you choose according to your application's access patterns, performance requirements, and failure model.**

---

# 📚 Official Documentation

For deeper learning, use the official Redis documentation as the source of truth:

* [Redis Documentation](https://redis.io/docs/latest/?utm_source=chatgpt.com)
* [Redis Commands Reference](https://redis.io/docs/latest/commands/?utm_source=chatgpt.com)
* [Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/?utm_source=chatgpt.com)
* [Redis ACL](https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/?utm_source=chatgpt.com)
* [Redis Sentinel](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/?utm_source=chatgpt.com)
