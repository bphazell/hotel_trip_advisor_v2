# Hotel Trip Advisor

## About The Project

A back-end REST API that emulates core TripAdvisor functionality: guest accounts, member accounts, hotel listings, reservations, reviews, and review likes. Built with **Flask** and **PostgreSQL**, containerised with **Docker Compose**.

To view the cloud-hosted version, switch to the `azure_cloud_hosted` branch.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or another Docker engine)

## Quick Start

```bash
./scripts/launch-local.sh
```

This single script will:

1. Build the Flask app image
2. Start Postgres and the Flask API (Gunicorn on port **5002**)
3. Create the `hotel_trip_advisor` database if it doesn't exist
4. Generate and apply Alembic migrations
5. Health-check the API

To also start **PgAdmin** (port 5433):

```bash
PROFILES="--profile tools" ./scripts/launch-local.sh
```

### Manual steps (if you prefer)

```bash
docker compose up -d --build
docker exec pg_container psql -U postgres -c 'CREATE DATABASE hotel_trip_advisor;'
docker exec hoteltripadvisor flask db migrate -m "initial"
docker exec hoteltripadvisor flask db upgrade
```

### Stopping

```bash
docker compose down
```

## API Documentation

**Base URL:** `http://localhost:5002/`

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Returns `{"status": "ok"}` |

### Guests

| Method | Path | Description |
|--------|------|-------------|
| GET | `/guests` | List all guests |
| GET | `/guests/{guest_id}` | Show a specific guest |
| POST | `/guests` | Create a new guest |

**POST body example:**

```json
{
    "first_name": "Sarah",
    "last_name": "Filgert",
    "date_of_birth": "1988-02-23",
    "email": "sfs@gmail.com",
    "phone": "222-111-2323"
}
```

### Members

| Method | Path | Description |
|--------|------|-------------|
| GET | `/members` | List all members |
| GET | `/members/{member_id}` | Show a specific member |
| POST | `/members` | Create a new member account |
| PUT | `/members/{member_id}` | Update member credentials |
| POST | `/members/{member_id}/review_likes` | Like a review |
| DELETE | `/members/{member_id}/review_likes/{review_id}` | Unlike a review |
| GET | `/members/{member_id}/liked_reviews` | List reviews a member liked |

**POST body example:**

```json
{
    "guest_id": 3,
    "username": "user3",
    "password": "temppass123"
}
```

### Hotels

| Method | Path | Description |
|--------|------|-------------|
| GET | `/hotels` | List all hotels |
| GET | `/hotels/{hotel_id}` | Show a specific hotel |
| POST | `/hotels` | Create a new hotel |

**POST body example:**

```json
{
    "name": "Downtown Marriot",
    "address": "3434 5th, San Diego, CA",
    "star_rating": 4.6,
    "number_of_rooms": 35
}
```

### Reservations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reservations` | List all reservations |
| GET | `/reservations/{reservation_id}` | Show a specific reservation |
| POST | `/reservations` | Create a new reservation |
| DELETE | `/reservations/{reservation_id}` | Cancel a reservation |

**POST body example:**

```json
{
    "room_number": 12,
    "hotel_id": 6,
    "arrival_date": "2022-11-03",
    "departure_date": "2022-11-05",
    "number_of_nights": 2,
    "guest_id": 2
}
```

### Reviews

| Method | Path | Description |
|--------|------|-------------|
| GET | `/reviews` | List all reviews |
| POST | `/reviews` | Create a new review |
| GET | `/reviews/{review_id}/liking_members` | List members who liked a review |

**POST body example:**

```json
{
    "content": "The hotel was awesome",
    "rating": 5,
    "hotel_id": 6,
    "member_id": 5
}
```

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for deployment, application-layer, and data-model diagrams.
