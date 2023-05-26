from flask import Blueprint
from flask import Blueprint, jsonify, abort, request
from ..models import Hotel, db


bp = Blueprint('hotels', __name__, url_prefix='/hotels')

# Return all hotels
@bp.route('', methods=['GET']) # decorator takes path and list of HTTP verbs
def index():
    hotels = Hotel.query.all() # ORM performs SELECT query
    result = []
    for h in hotels:
        result.append(h.serialize()) # 
    return jsonify(result) # return JSON response

# Return Specific hotel
@bp.route('/<int:hotel_id>', methods=['GET'])
def show(hotel_id: int):
    h = Hotel.query.get_or_404(hotel_id)
    return jsonify(h.serialize())

# Add new hotel
@bp.route('', methods=['POST'])
def create():
    h = Hotel(
        name=request.json['name'],
        address=request.json['address'],
        star_rating=request.json['star_rating'],
        number_of_rooms=request.json['number_of_rooms']
    )
    db.session.add(h) # prepare CREATE statement
    db.session.commit() # execute CREATE statement
    return jsonify(h.serialize())

