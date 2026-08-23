from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app import models


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("")
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Single query, group by status instead of one query per status
    status_counts = (
        db.query(
            models.Application.status,
            func.count(models.Application.id)
        )
        .filter(models.Application.user_id == current_user.id)
        .group_by(models.Application.status)
        .all()
    )
    # converts set to dict for easy lookup ex. counts["Applied"]
    counts = {s: count for s, count in status_counts}

    return {
        "total_applications": sum(counts.values()),
        "applied": counts.get("Applied", 0),
        "interview": counts.get("Interview", 0),
        "offer": counts.get("Offer", 0),
        "rejected": counts.get("Rejected", 0),
    }
