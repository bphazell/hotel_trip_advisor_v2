from flask import Blueprint
from flask import Blueprint, jsonify, abort, request
from ..models import Reservation, Hotel, Guest, Member, db


bp = Blueprint('reservations', __name__, url_prefix='/reservations')

# Return all reservations
@bp.route('', methods=['GET']) # decorator takes path and list of HTTP verbs
def index():
    reservation = Reservation.query.all() # ORM performs SELECT query
    result = []
    for r in reservation:
        result.append(r.serialize()) 
    return jsonify(result) # return JSON response

# Return specific reservation
@bp.route('/<int:id>', methods=['GET'])
def show(id: int):
    r = Reservation.query.get_or_404(id)
    return jsonify(r.serialize())

# Create a new reservation
@bp.route('', methods=['POST'])
def create():
    # req body must contain user_id and content
    if 'hotel_id' not in request.json or 'guest_id' not in request.json:
        return abort(400)
    # user with id of user_id must exist
    Hotel.query.get_or_404(request.json['hotel_id'])
    Guest.query.get_or_404(request.json['guest_id'])
    m = Member.query.filter_by(guest_id=request.json['guest_id']).first()
    if m != None:
        existing_points = int(m.points)
        new_points = int(request.json['number_of_nights']) * 10
        m.points = existing_points + new_points
    # construct Reservation
    r = Reservation(
        room_number=request.json['room_number'],
        hotel_id=request.json['hotel_id'],
        arrival_date=request.json['arrival_date'],
        departure_date=request.json['departure_date'],
        number_of_nights=request.json['number_of_nights'],
        guest_id=request.json['guest_id']
    )
    db.session.add(r) # prepare CREATE statement
    db.session.commit() # execute CREATE statement
    return jsonify(r.serialize())

# Delete a reservation
@bp.route('/<int:id>', methods=['DELETE'])
def delete(id: int):
    r = Reservation.query.get_or_404(id)
    m = Member.query.filter_by(guest_id=r.guest_id).first()
    if m != None:
        existing_points = int(m.points)
        new_points = int(r.number_of_nights) * 10
        m.points = existing_points - new_points
    try:
        db.session.delete(r) # prepare DELETE statement
        db.session.commit() # execute DELETE statement
        return jsonify(True)
    except Exception as error:
        # something went wrong :(
        print(error)
        return jsonify(False)
