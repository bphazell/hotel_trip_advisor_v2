from flask import Blueprint
from flask import Blueprint, jsonify, abort, request
from ..models import Review, db

bp = Blueprint('reviews', __name__, url_prefix='/reviews')

# Return all Reviews
@bp.route('', methods=['GET']) # decorator takes path and list of HTTP verbs
def index():
    reviews = Review.query.all() # ORM performs SELECT query
    result = []
    for r in reviews:
        result.append(r.serialize())
    return jsonify(result) # return JSON response

# Return specific Review
@bp.route('/<int:review_id>', methods=['GET'])
def show(review_id: int):
    r = Review.query.get_or_404(review_id)
    return jsonify(r.serialize())

# Create a new Review
@bp.route('', methods=['POST'])
def create():
    r = Review(
        member_id=request.json['member_id'],
        content=request.json['content'],
        rating=request.json['rating'],
        hotel_id=request.json['hotel_id']

    )
    db.session.add(r) # prepare CREATE statement
    db.session.commit() # execute CREATE statement
    return jsonify(r.serialize())

# Return all members that liked a Review
@bp.route('/<int:id>/liking_members', methods=['GET'])
def liking_users(id: int):
    r = Review.query.get_or_404(id)
    result = []
    for r in r.liking_members:
        result.append(r.serialize())
    return jsonify(result)


