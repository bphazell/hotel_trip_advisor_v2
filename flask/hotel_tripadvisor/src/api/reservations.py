from datetime import date

from flask import Blueprint, jsonify, abort, request
from ..models import Reservation, Hotel, Guest, Member, db


bp = Blueprint('reservations', __name__, url_prefix='/reservations')

GUEST_FIELDS = ('first_name', 'last_name', 'date_of_birth', 'email')


def _parse_date(value):
    return date.fromisoformat(str(value)[:10])


def _validate_reservation(data, hotel):
    arrival = _parse_date(data['arrival_date'])
    departure = _parse_date(data['departure_date'])
    today = date.today()

    if arrival < today:
        abort(400, description='Arrival date must be today or later')
    if departure <= arrival:
        abort(400, description='Departure date must be after arrival date')

    expected_nights = (departure - arrival).days
    submitted_nights = int(data['number_of_nights'])
    if submitted_nights != expected_nights:
        abort(400, description=f'Number of nights must be {expected_nights} for the selected dates')

    room_number = int(data['room_number'])
    if room_number < 1:
        abort(400, description='Room number must be at least 1')
    if hotel.number_of_rooms and room_number > hotel.number_of_rooms:
        abort(400, description=f'Room number must be between 1 and {hotel.number_of_rooms}')


def _resolve_guest_id(data):
    if 'guest_id' in data:
        guest_id = data['guest_id']
        Guest.query.get_or_404(guest_id)
        return guest_id

    missing = [field for field in GUEST_FIELDS if field not in data]
    if missing:
        abort(400, description=f'Missing guest fields: {", ".join(missing)}')

    existing = Guest.query.filter_by(email=data['email']).first()
    if existing is not None:
        return existing.guest_id

    guest = Guest(
        first_name=data['first_name'],
        last_name=data['last_name'],
        date_of_birth=data['date_of_birth'],
        email=data['email'],
        phone=data.get('phone'),
    )
    db.session.add(guest)
    db.session.flush()
    return guest.guest_id


@bp.route('', methods=['GET'])
def index():
    reservation = Reservation.query.all()
    return jsonify([r.serialize() for r in reservation])


@bp.route('/<int:id>', methods=['GET'])
def show(id: int):
    r = Reservation.query.get_or_404(id)
    return jsonify(r.serialize())


@bp.route('', methods=['POST'])
def create():
    data = request.json or {}
    if 'hotel_id' not in data:
        abort(400)

    hotel = Hotel.query.get_or_404(data['hotel_id'])
    _validate_reservation(data, hotel)

    try:
        guest_reused = False
        if 'guest_id' not in data and 'email' in data:
            guest_reused = Guest.query.filter_by(email=data['email']).first() is not None

        guest_id = _resolve_guest_id(data)
        member = Member.query.filter_by(guest_id=guest_id).first()
        if member is not None:
            member.points = int(member.points) + int(data['number_of_nights']) * 10

        reservation = Reservation(
            room_number=data['room_number'],
            hotel_id=data['hotel_id'],
            arrival_date=data['arrival_date'],
            departure_date=data['departure_date'],
            number_of_nights=data['number_of_nights'],
            guest_id=guest_id,
        )
        db.session.add(reservation)
        db.session.commit()
        payload = reservation.serialize()
        payload['guest_reused'] = guest_reused
        return jsonify(payload)
    except Exception:
        db.session.rollback()
        abort(500)


@bp.route('/<int:id>', methods=['DELETE'])
def delete(id: int):
    r = Reservation.query.get_or_404(id)
    member = Member.query.filter_by(guest_id=r.guest_id).first()
    if member is not None:
        member.points = int(member.points) - int(r.number_of_nights) * 10
    try:
        db.session.delete(r)
        db.session.commit()
        return jsonify(True)
    except Exception as error:
        db.session.rollback()
        print(error)
        return jsonify(False)
