from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import UserCreate, RegisterResponse, TokenResponse
from app.auth.hashing import hash_password, verify_password
from app.auth.jwt_handler import create_access_token
from app.models.user import User

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please check your details."
        )

    hashed_pw = hash_password(user.password)

    db_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_pw
    )

    db.add(db_user)  #insert obj
    db.commit() 
    db.refresh(db_user) # update db_user obj
    # hash password, store login details, commit and return success message
    return RegisterResponse(message="User registered successfully")


@router.post(
    "/login",
    response_model=TokenResponse # token response model
)
@limiter.limit("5/minute") # rate limiting
def login(
    request: Request, # for rate limiting track ip
    form_data: OAuth2PasswordRequestForm = Depends(), # for login credentials
    db: Session = Depends(get_db)
):
    db_user = (
        db.query(User)
        .filter(User.email == form_data.username)
        .first()
    )

    if not db_user or not verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    # create jwt token and return it after verification
    access_token = create_access_token(
        data={"sub": str(db_user.id)}
        # ex. {"sub": "1"}  
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )
