"""Database initialisation — single SQLAlchemy instance shared across the app."""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
