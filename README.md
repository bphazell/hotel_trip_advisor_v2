# hotel_trip_advisor

## About The Project

This is a back-end application designed to emulate the functionality of Trip Advisor. For instance there are API's for creating an account, making a hotel reservation, creating a review for a hotel, liking a review that another user made, etc. The application is written in Flask and datastorage is a posgres SQL Database. 

To view the cloud hosted version of this app, switch to the 'azure_cloud_hosted' branch. 

## Prerequisites
- Python 3
- Docker


## Getting Started

How to run this application locally:

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


## API Documentation

* Base URL: http://localhost:5000/

### Guest
* Add New User 
    * POST `/guests`
    * requirements with example:
	{"first_name": "Sarah",
        "last_name": "Filgert",
	"date_of_birth": "1988-02-23",
        "email": "sfs@gmail.com",
        "phone": "222-111-2323"}
    
* Show all Guests 
    * GET `/guests`

* Show specific guest
    * GET `/guests/{guest_id}`

### Members
* Add New Member Account
    * POST `/members`
    * requirements with example:
	{"guest_id": 3,
	"username": "user3",
	"password": "temppass123"}
    
* Show all Member Accounts
    * GET `/members`

* Show specific Member Account
    * GET `/members/{member_id}`

* Update Member credentials 
    * PUT `/members/{member_id}`
    * requirements with example:
	{
	"username": "member_4",
	"password": "tempass123"
}

* Like a Review
    * POST `/members/{member_id}/review_likes`
    * requirements with example:
	{
	"username": "member_4",
	"password": "tempass123"
}

* Unlike a Review
    * DELETE `/members/{member_id}/review_likes/{review_id}`


* Returned all reviews a member liked
    *  GET `/members/{member_id}/liked_reviews`

### Hotels
* Add New Hotel  
    * POST `/hotels`
    * requirements with example:
	{"name": "Downtown Marriot",
        "address" : "3434 5th, San Diego, CA",
				"star_rating" : 4.6,
       "number_of_rooms": 35}
    
* Show all Hotels 
    * GET `/hotels`

* Show specific hotel
    * GET `/hotels/{hotel_id}`


### Reservations

* Add New Reservation  
    * POST `/reservations`
    * requirements with example:
	{
	"room_number": "12",
	"hotel_id": 6,
	"arrival_date": "2022-11-3",
	"departure_date": "2022-11-5",
	"number_of_nights": 2,
	"guest_id": 2
}
    
* Show all Reservations 
    * GET `/reservations`

* Show specific reservation
    * GET `/reservations/{reservation_id}`

* Cancel reservation
    * DELETE `/reservations/{reservation_id}`


### Reviews

* Add New Review for Hotel
    * POST `/reviews`
    * requirements with example:
	{
    "content" : "The hotel was awesome",
    "rating" : 5,
    "hotel_id" : 6,
    "member_id" : 5}
    
* Show all Reviews
    * GET `/reviews`


* Return all members that liked a Review

* GET `/reviews/{review_id}/liking_members`




