import os
from flask import Flask, jsonify
from flask_migrate import Migrate


def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        SQLALCHEMY_DATABASE_URI=os.environ.get(
            'DATABASE_URL',
            'postgresql://postgres@pg:5432/hotel_trip_advisor',
        ),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ECHO=True
    )

    if test_config is None:
        app.config.from_pyfile('config.py', silent=True)
    else:
        app.config.from_mapping(test_config)

    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    from .models import db
    db.init_app(app)
    Migrate(app, db)

    from .api import hotels, guests, members, reservations, reviews
    app.register_blueprint(hotels.bp)
    app.register_blueprint(guests.bp)
    app.register_blueprint(members.bp)
    app.register_blueprint(reservations.bp)
    app.register_blueprint(reviews.bp)

    @app.route('/health')
    def health():
        return jsonify(status='ok')

    return app
