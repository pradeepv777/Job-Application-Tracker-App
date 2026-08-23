from datetime import datetime, timedelta, timezone # for calculation of  JWT token expiration time
from jose import jwt, JWTError # for handling jwt tokens
from app.config import settings


def create_access_token(data: dict):

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode, # payload for the JWT token
        settings.SECRET_KEY, # secret key for encoding the JWT token
        algorithm=settings.ALGORITHM # algorithm for encoding the JWT token
    )

    return encoded_jwt

def verify_access_token(token: str):

    try:

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise JWTError() #

        return user_id

    except JWTError:
        return None