Ticket Booking API (Concurrency-Safe)
Production-ready Node.js API for high-concurrency ticket booking using MongoDB transactions and Redis RedLock to prevent overselling under heavy load.

Features
Prevents overselling seats under concurrent load using distributed locking.

Uses MongoDB for strong consistency with multi-document transactions.

Uses Redis + RedLock for distributed locks across instances.

Includes concurrency test script (npm run test:concurrency).

Health and metrics endpoints for basic observability.

Tech Stack
Node.js + Express

MongoDB (transactions)

Redis (RedLock-based distributed locking)

Winston (logging)

Axios (for test scripts)

Getting Started
1. Prerequisites
Node.js (LTS recommended)

Docker + Docker Compose

2. Clone & Install
bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

npm install
3. Environment Setup
Create .env from the example:

bash
cp .env.example .env
Default .env values assume:

MongoDB on localhost:27017 (via Docker)

Redis on localhost:6379 (via Docker)

4. Start MongoDB & Redis (Docker)
bash
docker compose up -d
Containers:

ticket-mongo → MongoDB

ticket-redis → Redis

5. Run the API
bash
npm run dev
Endpoints:

GET /health – basic health check

GET /metrics – simple in-memory metrics

API Overview
Create Event
text
POST /api/events
Content-Type: application/json
Body:

json
{
  "name": "Test Concert",
  "sections": [
    { "name": "VIP", "price": 5000, "capacity": 5 }
  ]
}
Response (simplified):

json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Test Concert",
    "sections": [
      {
        "_id": "...",
        "name": "VIP",
        "price": 5000,
        "capacity": 5,
        "remaining": 5
      }
    ]
  }
}
Create Booking (Concurrency-Safe)
text
POST /bookings
Content-Type: application/json
Body:

json
{
  "eventId": "<event-id>",
  "sectionId": "<section-id>",
  "qty": 1,
  "userId": "user-123"
}
Behavior:

Acquires a Redis RedLock on booking:<eventId>:<sectionId>.

Runs a MongoDB transaction to:

Decrement sections[n].remaining.

Insert a Booking document.

Ensures remaining never goes below 0.

List Bookings
text
GET /bookings?eventId=<event-id>&userId=<user-id>&page=1&limit=20
Concurrency Test
A test script simulates 20 concurrent users trying to book 1 seat each when only 5 seats are available.

Run:

bash
npm run test:concurrency
Expected behavior:

Exactly 5 bookings succeed.

15 fail with validation/lock errors.

No overselling (total confirmed bookings ≤ capacity, remaining ≥ 0).

Project Structure
text
.
├── server.js                 # API entrypoint
├── docker-compose.yml        # MongoDB + Redis
├── .env / .env.example       # Configuration
├── src
│   ├── config
│   │   ├── database.js       # MongoDB connection
│   │   ├── redis.js          # Redis + RedLock setup
│   │   └── logger.js         # Winston logger
│   ├── models
│   │   ├── Event.js          # Event & sections schema
│   │   └── Booking.js        # Booking schema
│   ├── services
│   │   ├── lockService.js    # Lock acquisition/release
│   │   └── bookingService.js # Booking business logic
│   └── utils
│       └── metrics.js        # In-memory metrics
└── tests
    └── concurrencyTest.js    # High-concurrency test script
How It Prevents Overselling
Redis RedLock ensures only one instance holds the lock for a given eventId + sectionId at a time.

MongoDB transaction validates and updates seat counts atomically.

If a lock cannot be acquired within the configured TTL, the booking fails with a lock timeout instead of risking inconsistent state.

Running in Production (High Level)
Point MONGODB_URI and REDIS_NODES to your production services.

Run multiple Node.js instances behind a load balancer; all share the same Redis cluster.

Use proper monitoring on MongoDB, Redis, and Node.js logs.