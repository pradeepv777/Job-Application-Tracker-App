from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod  # refers to UserCreate class itself
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class RegisterResponse(BaseModel):
    message: str #ensure the response is a string


class TokenResponse(BaseModel):
    access_token: str  # JWT to authenticate requests
    token_type: str  # Type of token (always "bearer")
