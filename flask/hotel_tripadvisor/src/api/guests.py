from flask import Blueprint
from flask import Blueprint, jsonify, abort, request
from ..models import Guest, db


bp = Blueprint('guests', __name__, url_prefix='/guests')

# Return all guests
@bp.route('', methods=['GET']) # decorator takes path and list of HTTP verbs
def index():
    guests = Guest.query.all() # ORM performs SELECT query
    result = []
    for g in guests:
        result.append(g.serialize()) 
    return jsonify(result) # return JSON response

# Return specific guests
@bp.route('/<int:guest_id>', methods=['GET'])
def show(guest_id: int):
    g = Guest.query.get_or_404(guest_id)
    return jsonify(g.serialize())

# Create new guest
@bp.route('', methods=['POST'])
def create():
    g = Guest(
        first_name=request.json['first_name'],
        last_name=request.json['last_name'],
        date_of_birth=request.json['date_of_birth'],
        email=request.json['email'],
        phone=request.json['phone']
    )
    db.session.add(g) # prepare CREATE statement
    db.session.commit() # execute CREATE statement
    return jsonify(g.serialize())



