# Ticket Booking API with Concurrency Handling

A production-ready Node.js API that handles high-concurrency ticket bookings using **MongoDB Transactions** and **Redis Distributed Locking** to strictly prevent overselling.

## 🚀 Features

- **Concurrency Control**: Prevents overselling even with 100+ concurrent requests.
- **Distributed Locking**: Uses Redis to lock specific seat sections during booking.
- **ACID Transactions**: Uses MongoDB multi-document transactions for data integrity.
- **Scalable Architecture**: Stateless API design ready for horizontal scaling.
- **Docker Ready**: Includes `docker-compose.yml` for instant local setup.

---

## 🛠️ Tech Stack

- **Node.js** & **Express** - API Server
- **MongoDB** (Replica Set) - Primary Database with Transaction support
- **Redis** - Distributed Locking & Caching
- **Mongoose** - ODM & Schema Validation
- **Winston** - Structured Logging

---

## ⚡ Quick Start

### 1. Prerequisites
- Docker & Docker Compose
- Node.js (v18+)

### 2. Clone & Install
```bash
git clone https://github.com/yourusername/ticket-booking-api.git
cd ticket-booking-api
npm install
```

### 3. Start Infrastructure (MongoDB & Redis)
This starts a MongoDB Replica Set (required for transactions) and Redis.
```bash
docker-compose up -d
```

### 4. Configure Environment
Create a `.env` file:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ticket-booking?replicaSet=rs0
REDIS_NODES=localhost:6379
REDIS_TTL=60000
LOG_LEVEL=debug
```

### 5. Run the Server
```bash
npm run dev
```
Server will start at `http://localhost:3000`

---

## 🧪 Testing Concurrency

We included a robust test script to simulate race conditions.

### Run the Concurrency Test
This script creates an event with **5 seats** and launches **20 concurrent booking requests**.
```bash
npm run test:concurrency
```

### Expected Output
You should see exactly **5 successes** and **15 failures**:
```
✅ User 0: SUCCESS
✅ User 1: SUCCESS
✅ User 2: SUCCESS
✅ User 3: SUCCESS
✅ User 4: SUCCESS
❌ User 5: FAILED - Only 0 seats available
...
============================================================
📊 RESULTS: 5 successful, 15 failed
✅ Overselling prevented: YES
============================================================
```

---

## 📚 API Endpoints

### 1. Create Event
`POST /api/events`
```json
{
  "name": "Coldplay Concert",
  "sections": [
    { "name": "VIP", "price": 5000, "capacity": 100 }
  ]
}
```

### 2. Book Ticket (Concurrency Safe)
`POST /bookings`
```json
{
  "eventId": "65ebd...",
  "sectionId": "65ebd...",
  "qty": 1,
  "userId": "user-123"
}
```

### 3. Get Bookings
`GET /bookings?userId=user-123`

---

## 📂 Project Structure

```
├── src
│   ├── config      # DB, Redis, Logger config
│   ├── models      # Mongoose Models (Event, Booking)
│   ├── services    # Business Logic (Locking, Booking)
│   └── utils       # Helper functions
├── tests
│   └── concurrencyTest.js  # Race condition simulation
├── server.js       # App entry point
└── docker-compose.yml
```

## 🛡️ How It Works 

1. **Request**: User requests 1 seat.
2. **Lock**: API acquires a **Redis Lock** on the specific `eventId` + `sectionId`.
   - If locked, other requests wait (spin-lock) or fail safely.
3. **Transaction**: Starts a **MongoDB Transaction**.
   - Reads current remaining seats.
   - Checks if `remaining >= qty`.
   - Decrements `remaining`.
   - Inserts `Booking` record.
4. **Commit**: Commits the transaction.
5. **Unlock**: Releases the Redis lock.

This ensures that **no two requests** can modify the seat count at the exact same microsecond.

---

