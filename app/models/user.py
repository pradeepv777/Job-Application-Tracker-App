from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users" # Table Name
     # Table Values
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    resume_path = Column(String, nullable=True)
    # One to many relation
    # One User -> Many Applications
    applications = relationship(
        "Application",
        back_populates="owner"
    )