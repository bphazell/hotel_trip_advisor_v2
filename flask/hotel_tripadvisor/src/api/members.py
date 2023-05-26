from flask import Blueprint
from flask import Blueprint, jsonify, abort, request
from ..models import Member, Review, likes_table, db
import sqlalchemy
import hashlib
import secrets


def scramble(password: str):
    """Hash and salt the given password"""
    salt = secrets.token_hex(16)
    return hashlib.sha512((password + salt).encode('utf-8')).hexdigest()

bp = Blueprint('members', __name__, url_prefix='/members')

# Return all members
@bp.route('', methods=['GET']) # decorator takes path and list of HTTP verbs
def index():
    members = Member.query.all() # ORM performs SELECT query
    result = []
    for m in members:
        result.append(m.serialize()) # build list of Tweets as dictionaries
    return jsonify(result) # return JSON response

# Return specific member
@bp.route('/<int:Member_id>', methods=['GET'])
def show(Member_id: int):
    m = Member.query.get_or_404(Member_id)
    return jsonify(m.serialize())

# Create new member
@bp.route('', methods=['POST'])
def create():
    if 'username' not in request.json or 'password' not in request.json:
        return abort(400)
    if len(request.json['username']) < 3 or len(request.json['password']) < 8:
        return abort(400)
    m = Member(
        guest_id = request.json['guest_id'],
        username = request.json['username'],
        password = scramble(request.json['password'])
    )
    db.session.add(m) # prepare CREATE statement
    db.session.commit() # execute CREATE statement
    return jsonify(m.serialize())

# update username and password
@bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update(id:int):
    m = Member.query.get_or_404(id)
    if "username" not in request.json and "password" not in request.json:
        return abort(404)
    if "username" in request.json:
        if len(request.json["username"]) < 3:
            return abort(404)
        else:
            m.username = request.json["username"]
    if "password" in request.json:
        if len(request.json["password"]) < 8:
            return abort(404)
        else:
            m.password = scramble(request.json["password"])
    try:
        db.session.commit()
        return jsonify(m.serialize())
    except:
        return jsonify(False)

# Return all reviews member has liked
@bp.route('/<int:id>/liked_reviews', methods=['GET'])
def liked_tweets(id: int):
    m = Member.query.get_or_404(id)
    result = []
    for r in m.liked_reviews:
        result.append(r.serialize())
    return jsonify(result)

# Like Review
@bp.route('/<int:id>/review_likes', methods=['Post'])
def likes(id: int):
    if "review_id" not in request.json:
        return abort(404)
    review_id = request.json["review_id"]
    Member.query.get_or_404(id)
    Review.query.get_or_404(review_id)
    try:
        stmt = sqlalchemy.insert(likes_table).values(
            member_id=id, review_id=review_id)
        db.session.execute(stmt)
        db.session.commit()
        return jsonify(True)
    except:
        return jsonify(False)
    
# Unlike Review
@bp.route('/<int:member_id>/review_likes/<int:review_id>', methods=['DELETE'])
def unlikes(member_id: int, review_id: int):
    Member.query.get_or_404(member_id)
    Review.query.get_or_404(review_id)
    
    try:
        stmt = sqlalchemy.delete(likes_table).where(
            likes_table.c.member_id == member_id,
            likes_table.c.review_id == review_id
        ) # We delete the tuple (id, review_id) from the likes_table
        db.session.execute(stmt)
        db.session.commit()
        return jsonify(True)
    except:
        return jsonify(False)

