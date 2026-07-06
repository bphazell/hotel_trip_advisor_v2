from flask import Blueprint, jsonify, abort, request
from ..models import Reservation, Hotel, Guest, Member, db


bp = Blueprint('reservations', __name__, url_prefix='/reservations')

GUEST_FIELDS = ('first_name', 'last_name', 'date_of_birth', 'email')


def _resolve_guest_id(data):
    if 'guest_id' in data:
        guest_id = data['guest_id']
        Guest.query.get_or_404(guest_id)
        return guest_id

    missing = [field for field in GUEST_FIELDS if field not in data]
    if missing:
        abort(400, description=f'Missing guest fields: {", ".join(missing)}')

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


# Return all reservations
@bp.route('', methods=['GET'])
def index():
    reservation = Reservation.query.all()
    result = []
    for r in reservation:
        result.append(r.serialize())
    return jsonify(result)


# Return specific reservation
@bp.route('/<int:id>', methods=['GET'])
def show(id: int):
    r = Reservation.query.get_or_404(id)
    return jsonify(r.serialize())


# Create a new reservation
@bp.route('', methods=['POST'])
def create():
    data = request.json or {}
    if 'hotel_id' not in data:
        return abort(400)

    Hotel.query.get_or_404(data['hotel_id'])

    try:
        guest_id = _resolve_guest_id(data)
        m = Member.query.filter_by(guest_id=guest_id).first()
        if m is not None:
            existing_points = int(m.points)
            new_points = int(data['number_of_nights']) * 10
            m.points = existing_points + new_points

        r = Reservation(
            room_number=data['room_number'],
            hotel_id=data['hotel_id'],
            arrival_date=data['arrival_date'],
            departure_date=data['departure_date'],
            number_of_nights=data['number_of_nights'],
            guest_id=guest_id,
        )
        db.session.add(r)
        db.session.commit()
        return jsonify(r.serialize())
    except Exception:
        db.session.rollback()
        abort(500)


# Delete a reservation
@bp.route('/<int:id>', methods=['DELETE'])
def delete(id: int):
    r = Reservation.query.get_or_404(id)
    m = Member.query.filter_by(guest_id=r.guest_id).first()
    if m is not None:
        existing_points = int(m.points)
        new_points = int(r.number_of_nights) * 10
        m.points = existing_points - new_points
    try:
        db.session.delete(r)
        db.session.commit()
        return jsonify(True)
    except Exception as error:
        db.session.rollback()
        print(error)
        return jsonify(False)
