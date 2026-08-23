from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Application(Base):

    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String, nullable=False)
    role = Column(String, nullable=False)
    salary = Column(Integer, nullable=False)
    status = Column(String, nullable=False)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )
    owner = relationship(
        "User",
        back_populates="applications"
    )
    interviews = relationship(
    "Interview",
    back_populates="application",
    cascade="all, delete"
)