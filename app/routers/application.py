import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.models.user import User
from app.database import get_db
from app.schemas import (
    Application,
    ApplicationResponse,
    ApplicationRead,
    ApplicationUpdate,
    PaginatedApplicationResponse,
)
from app import models


router = APIRouter(
    prefix="/applications",
    tags=["Applications"]
)


@router.post(
    "",
    summary="Create a new job application",
    description="Creates a new job application after validating the request body.",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED
)
def create_application(
    application: Application, # request body model from schemas
    # company,sal,role etc. validation
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    db_application = models.Application(
        company=application.company,
        role=application.role,
        salary=application.salary,
        status=application.status,
        user_id=current_user.id
    )

    db.add(db_application)
    db.commit()
    db.refresh(db_application)

    return {
        "message": f"Application submitted to {db_application.company}",
        "company": db_application.company,
        "salary": db_application.salary
    }


@router.get(
    "",
    response_model=PaginatedApplicationResponse,
    summary="Get all applications",
    description="Returns all job applications."
)
def get_applications(
    search: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort_by: str = "id",
    order: str = "asc",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = (
        db.query(models.Application)
        .filter(models.Application.user_id == current_user.id)
    )

    if search:
        query = query.filter(
            models.Application.company.ilike(f"%{search}%")# case-insensitive like query
            #  search like -> ?search=google   == +  google + ==
        )

    if status:
        query = query.filter(models.Application.status == status)# ?status=applied
    offset = (page - 1) * limit # 10 default
    total = query.count()
    total_pages = max(1, math.ceil(total / limit))
    sort_columns = {
        "id": models.Application.id,
        "company": models.Application.company,
        "salary": models.Application.salary,
        "status": models.Application.status,
    }
    sort_column = sort_columns.get(sort_by, models.Application.id)

    if order.lower() == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    applications = (  # fetch the results from db
        query
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {  # return results
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
        "items": applications
    }


@router.get(
    "/{application_id}",  # path parameter -> takes from url -> /applications/1
    response_model=ApplicationRead,
    summary="Get application by ID",
    description="Returns a single job application based on its ID."
)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    if application_id <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Application ID must be greater than 0"
        )

    application = (
        db.query(models.Application)
        .filter(models.Application.id == application_id)
        .first()
    )

    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    if application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not Authorized"
        )

    return application



@router.put(
    "/{application_id}",
    response_model=ApplicationRead,
    summary="Update an application",
    description="Updates an existing job application."
)
def update_application(
    application_id: int,
    updated_application: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    application = (
        db.query(models.Application)
        .filter(models.Application.id == application_id)
        .first()
    )

    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    if application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    application.company = updated_application.company
    application.role = updated_application.role
    application.salary = updated_application.salary
    application.status = updated_application.status

    db.commit()
    db.refresh(application)

    return application


@router.delete(
    "/{application_id}",
    summary="Delete an application",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    application = (
        db.query(models.Application)
        .filter(models.Application.id == application_id)
        .first()
    )

    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    if application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )

    db.delete(application)
    db.commit()