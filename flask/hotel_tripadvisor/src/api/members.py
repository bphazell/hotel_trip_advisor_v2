from flask import Blueprint, jsonify, abort, request
from ..models import Member, Review, likes_table, db
import sqlalchemy
import hashlib
import secrets


def scramble(password: str):
    salt = secrets.token_hex(16)
    digest = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    if '$' not in stored:
        return False
    salt, digest = stored.split('$', 1)
    candidate = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
    return secrets.compare_digest(candidate, digest)


bp = Blueprint('members', __name__, url_prefix='/members')


@bp.route('', methods=['GET'])
def index():
    members = Member.query.all()
    return jsonify([m.serialize() for m in members])


@bp.route('/<int:Member_id>', methods=['GET'])
def show(Member_id: int):
    m = Member.query.get_or_404(Member_id)
    return jsonify(m.serialize())


@bp.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    if 'username' not in data or 'password' not in data:
        abort(400, description='Username and password are required')

    member = Member.query.filter_by(username=data['username']).first()
    if member is None or not verify_password(data['password'], member.password):
        abort(401, description='Invalid username or password')

    return jsonify(member.serialize())


@bp.route('', methods=['POST'])
def create():
    data = request.json or {}
    if 'username' not in data or 'password' not in data:
        abort(400)
    if len(data['username']) < 3 or len(data['password']) < 8:
        abort(400, description='Username must be at least 3 characters and password at least 8')

    if Member.query.filter_by(guest_id=data['guest_id']).first() is not None:
        abort(409, description='This guest already has a member account')

    member = Member(
        guest_id=data['guest_id'],
        username=data['username'],
        password=scramble(data['password']),
    )
    db.session.add(member)
    db.session.commit()
    return jsonify(member.serialize())


@bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update(id: int):
    m = Member.query.get_or_404(id)
    if "username" not in request.json and "password" not in request.json:
        abort(404)
    if "username" in request.json:
        if len(request.json["username"]) < 3:
            abort(404)
        m.username = request.json["username"]
    if "password" in request.json:
        if len(request.json["password"]) < 8:
            abort(404)
        m.password = scramble(request.json["password"])
    try:
        db.session.commit()
        return jsonify(m.serialize())
    except Exception:
        db.session.rollback()
        return jsonify(False)


@bp.route('/<int:id>/liked_reviews', methods=['GET'])
def liked_tweets(id: int):
    m = Member.query.get_or_404(id)
    return jsonify([r.serialize() for r in m.liked_reviews])


@bp.route('/<int:id>/review_likes', methods=['POST'])
def likes(id: int):
    if "review_id" not in request.json:
        abort(404)
    review_id = request.json["review_id"]
    Member.query.get_or_404(id)
    Review.query.get_or_404(review_id)
    try:
        stmt = sqlalchemy.insert(likes_table).values(member_id=id, review_id=review_id)
        db.session.execute(stmt)
        db.session.commit()
        return jsonify(True)
    except Exception:
        db.session.rollback()
        return jsonify(False)


@bp.route('/<int:member_id>/review_likes/<int:review_id>', methods=['DELETE'])
def unlikes(member_id: int, review_id: int):
    Member.query.get_or_404(member_id)
    Review.query.get_or_404(review_id)
    try:
        stmt = sqlalchemy.delete(likes_table).where(
            likes_table.c.member_id == member_id,
            likes_table.c.review_id == review_id,
        )
        db.session.execute(stmt)
        db.session.commit()
        return jsonify(True)
    except Exception:
        db.session.rollback()
        return jsonify(False)
