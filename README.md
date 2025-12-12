# Ticket Booking API (Concurrency-Safe)

A production-ready Node.js API for high-concurrency ticket booking using **MongoDB transactions** and **Redis RedLock** to prevent overselling under heavy load.

## Features

- Prevents overselling seats under concurrent load using distributed locking  
- Uses MongoDB transactions for strong consistency  
- Uses Redis + RedLock for distributed locks across instances  
- Includes concurrency test script (`npm run test:concurrency`)  
- Health and metrics endpoints for observability  

## Tech Stack

- Node.js + Express  
- MongoDB (transactions)  
- Redis (RedLock)  
- Winston (logging)  
- Axios (test scripts)

## Getting Started

### 1. Prerequisites
- Node.js (LTS recommended)  
- Docker + Docker Compose  

### 2. Clone & Install

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
```

Defaults assume:
- MongoDB → localhost:27017  
- Redis → localhost:6379  

### 4. Start MongoDB & Redis (Docker)

```bash
docker compose up -d
```

Containers:
- ticket-mongo → MongoDB  
- ticket-redis → Redis  

### 5. Run the API

```bash
npm run dev
```

Endpoints:
- `GET /health`  
- `GET /metrics`  

## API Overview

### Create Event

**POST /api/events**

**Body:**
```json
{
  "name": "Test Concert",
  "sections": [
    { "name": "VIP", "price": 5000, "capacity": 5 }
  ]
}
```

**Response:**
```json
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
```

### Create Booking (Concurrency-Safe)

**POST /bookings**

**Body:**
```json
{
  "eventId": "<event-id>",
  "sectionId": "<section-id>",
  "qty": 1,
  "userId": "user-123"
}
```

**Process:**
- Acquires a Redis RedLock on `booking:<eventId>:<sectionId>`  
- Runs a MongoDB transaction:  
  - Decrements remaining seats  
  - Inserts a Booking document  
- Ensures remaining never goes below 0  

### List Bookings

```
GET /bookings?eventId=<event-id>&userId=<user-id>&page=1&limit=20
```

## Concurrency Test

Simulates 20 users booking 1 seat each when only 5 seats exist.

Run:

```bash
npm run test:concurrency
```

Expected:
- 5 successful bookings  
- 15 failures (lock/validation errors)  
- No overselling  

## Project Structure

```
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
```

## How It Prevents Overselling

- Redis RedLock ensures only one instance modifies a section's stock at a time  
- MongoDB transaction atomically updates seat counts  
- Lock timeouts prevent inconsistent state under heavy load  

## Running in Production

- Set `MONGODB_URI` and `REDIS_NODES` to production values  
- Run multiple Node.js instances behind a load balancer  
- All instances must share the same Redis cluster  
- Monitor MongoDB, Redis, and application logs  

