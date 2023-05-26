from flask_sqlalchemy import SQLAlchemy
import datetime

db = SQLAlchemy()

class Hotel(db.Model):
    __tablename__ = 'hotels'
    hotel_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    address = db.Column(db.String(128), nullable=False)
    star_rating = db.Column(db.Float)
    number_of_rooms = db.Column(db.Integer)

    def __init__(self, name: str, address: str, star_rating: float, number_of_rooms: str):
        self.name = name
        self.address = address
        self.star_rating = star_rating
        self.number_of_rooms = number_of_rooms  

    def serialize(self):
        return {
            'hotel_id': self.hotel_id,
            'name': self.name,
            'address': self.address,
            'star_rating': self.star_rating,
            'number_of_rooms': self.number_of_rooms,
            # 'created_at': self.created_at.isoformat(),
            
        }
    
class Room(db.Model):
    __tablename__ = 'rooms'
    hotel_id = db.Column(db.Integer, db.ForeignKey('hotels.hotel_id'), primary_key=True)
    room_id = db.Column(db.Integer, primary_key=True)
    room_type_name = db.Column(db.String(280), nullable=False)
    room_default_price = db.Column(db.Float, nullable=False)

    def __init__(self, hotel_id: int, room_id: int, room_type_name: int, room_default_price: float):
        self.hotel_id = hotel_id
        self.room_id = room_id
        self.room_type_name = room_type_name
        self.room_default_price = room_default_price 

    def serialize(self):
        return {
            'hotel_id': self.hotel_id,
            'room_id': self.room_id,
            'room_type_name': self.room_type_name,
            'room_default_price': self.room_default_price
            
        }

class Guest(db.Model):
    __tablename__ = 'guests'
    guest_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    first_name = db.Column(db.String(128), nullable=False)
    last_name = db.Column(db.String(128), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    email = db.Column(db.String(128), nullable=False)
    phone = db.Column(db.String(128))

    def __init__(self, first_name: str, last_name: str, date_of_birth: datetime, email: str,
                 phone:str):
        self.first_name = first_name
        self.last_name = last_name
        self.date_of_birth = date_of_birth
        self.email = email
        self.phone = phone 

    def serialize(self):
        return {
            'guest_id': self.guest_id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'date_of_birth': self.date_of_birth,
            'email': self.email,
            'phone': self.phone
            
        }
    
class Member(db.Model):
    __tablename__ = 'members'
    member_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    guest_id = db.Column(db.Integer, db.ForeignKey('guests.guest_id'), unique=True, nullable=False)
    join_date = db.Column(
        db.DateTime,
        default=datetime.datetime.utcnow,
        nullable=False
    )
    points = db.Column(db.Integer)
    username = db.Column(db.String(128), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    reviews = db.relationship('Review', backref='member', cascade="all,delete")

    def __init__(self, guest_id: int, password: str, username:str):
        self.guest_id = guest_id
        self.points = 0
        self.username = username
        self.password = password


    def serialize(self):
        return {
            'member_id': self.member_id,
            'username': self.username,
            'password': self.password,
            'guest_id': self.guest_id,
            'join_date': self.join_date,
            'points': self.points
        }
    
likes_table = db.Table(
    'review_likes',
    db.Column(
        'member_id', db.Integer,
        db.ForeignKey('members.member_id'),
        primary_key=True
    ),
    db.Column(
        'review_id', db.Integer,
        db.ForeignKey('reviews.review_id'),
        primary_key=True
    ),
    db.Column(
        'created_at', db.DateTime,
        default=datetime.datetime.utcnow,
        nullable=False
    )
)
class Review(db.Model):
    __tablename__ = 'reviews'
    review_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    member_id = db.Column(db.Integer, db.ForeignKey('members.member_id'), nullable=False)
    hotel_id = db.Column(db.Integer,db.ForeignKey('hotels.hotel_id'), nullable=False)
    content = db.Column(db.String(280), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    created_at = db.Column(
        db.DateTime,
        default=datetime.datetime.utcnow,
        nullable=False
    )
    liking_members = db.relationship(
        'Member', secondary=likes_table,
        lazy='subquery',
        backref=db.backref('liked_reviews', lazy=True)
    )

    def __init__(self, content: str, rating: int, hotel_id: int,
                 member_id:int):
        self.content = content
        self.rating = rating
        self.hotel_id = hotel_id
        self.member_id = member_id

    def serialize(self):
        return {
            'review_id': self.review_id,
            'content': self.content,
            'rating': self.rating,
            'hotel_id': self.hotel_id,
            'created_at': self.created_at,
            'member_id': self.member_id
            
        }

class Reservation(db.Model):
    __tablename__ = 'reservations'
    reservation_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    room_number = db.Column(db.Integer, nullable=False)
    hotel_id = db.Column(db.Integer, db.ForeignKey('hotels.hotel_id'), nullable=False)
    booking_date = db.Column(
        db.DateTime,
        default=datetime.datetime.utcnow,
        nullable=False
    )
    arrival_date = db.Column(db.Date, nullable=False)
    departure_date = db.Column(db.Date, nullable=False)
    number_of_nights = db.Column(db.Integer, nullable=False)
    guest_id = db.Column(db.Integer, db.ForeignKey('guests.guest_id'), nullable=False)

    def __init__(self, room_number: int, hotel_id: int, arrival_date: datetime,
                 departure_date:datetime, number_of_nights: int, guest_id: int ):
        self.room_number = room_number
        self.hotel_id = hotel_id
        self.arrival_date = arrival_date
        self.departure_date = departure_date
        self.number_of_nights = number_of_nights 
        self.guest_id = guest_id 

    def serialize(self):
        return {
            'reservation_id': self.reservation_id,
            'room_number': self.room_number,
            'hotel_id': self.hotel_id,
            'booking_date': self.booking_date,
            'arrival_date': self.arrival_date,
            'departure_date': self.departure_date,
            'number_of_nights': self.number_of_nights,
            'guest_id': self.guest_id
            
        }