# hotel_trip_advisor

## About The Project

This is a back-end application designed to emulates the functionality of Trip Advisor. For instance there are API for creating an account, making a hotel reservation, creating a review for a hotel, liking a review that another user made, etc. 

## Prerequisites
- Python 3
- Docker


## Getting Started

1. Clone the Repo
    - `git clone https://github.com/bphazell/hotel_trip_advisor`
2. Install requirements
   - `pip install -r requirements .txt`
   - optional: set up a virtual enviroment
3. Build the Docker Containers from docker compose file
   - `docker compose up -d`
   - Note: this will build 3 containers: 1. Trip advisor app 2. Postgres database 3. PG Admin
4. Navigate  to PG Admin http://localhost:5433/browser/#
     - click ‘Add Server’ 
     - Name = pg_container
     - Username = postgres
    - Password = ‘empty’
5. Create Database
     - `docker exec -i pg_container psql -c 'CREATE DATABASE hotel_trip_advisor;'`
6. Navigate to flask/trip_advisor folder
7. Create database tables
   - run `docker exec hoteltripadvisor flask db migrate` then 
   -  `"docker exec hoteltripadvisor flask db upgrade"`




