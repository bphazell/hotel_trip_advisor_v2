import os
from flask import Flask
from flask_migrate import Migrate

# https://flask.palletsprojects.com/en/2.0.x/patterns/appfactories/


def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        SQLALCHEMY_DATABASE_URI='postgresql://postgres@localhost:5432/hotel_trip_advisor',
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SQLALCHEMY_ECHO=True
    )

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_pyfile('config.py', silent=True)
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    from .models import db
    db.init_app(app)
    migrate = Migrate(app, db)

    # from .api import users, tweets
    from .api import hotels, guests, members, reservations, reviews
    # app.register_blueprint(users.bp)
    # app.register_blueprint(tweets.bp)
    app.register_blueprint(hotels.bp)
    app.register_blueprint(guests.bp)
    app.register_blueprint(members.bp)
    app.register_blueprint(reservations.bp)
    app.register_blueprint(reviews.bp)

    return app
