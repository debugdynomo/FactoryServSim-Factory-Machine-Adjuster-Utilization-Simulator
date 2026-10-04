"""
Authentication REST endpoints for FactoryServSim.

Provides:
- POST /api/auth/register  -- Register a new manager account
- POST /api/auth/login     -- Login and receive a JWT token
- GET  /api/auth/me        -- Get current user profile (protected)
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.repository import find_user_by_email, create_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    """Schema for user registration."""
    email: str = Field(..., description="Manager's email address")
    password: str = Field(..., min_length=6, description="Password (minimum 6 characters)")
    manager_name: str = Field(..., min_length=1, description="Manager's full name")


class LoginRequest(BaseModel):
    """Schema for user login."""
    email: str = Field(..., description="Manager's email address")
    password: str = Field(..., description="Password")


class TokenResponse(BaseModel):
    """Schema for login response containing the JWT token."""
    access_token: str
    token_type: str = "bearer"
    manager_name: str
    email: str


class UserProfile(BaseModel):
    """Schema for the current user's profile."""
    id: str
    email: str
    manager_name: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    Register a new factory manager account.
    Creates a new user and returns a JWT token.
    """
    existing_user = find_user_by_email(request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    hashed = hash_password(request.password)
    user_doc = create_user(
        email=request.email,
        hashed_password=hashed,
        manager_name=request.manager_name,
    )

    logger.info("New user registered: %s (%s)", user_doc["manager_name"], user_doc["email"])

    access_token = create_access_token(data={"sub": user_doc["email"]})

    return TokenResponse(
        access_token=access_token,
        manager_name=user_doc["manager_name"],
        email=user_doc["email"],
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Login with email and password.
    Validates credentials and returns a JWT access token.
    """
    user = find_user_by_email(request.email)

    if not user or not verify_password(request.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    logger.info("User logged in: %s", user["email"])

    access_token = create_access_token(data={"sub": user["email"]})

    return TokenResponse(
        access_token=access_token,
        manager_name=user["manager_name"],
        email=user["email"],
    )


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get the currently authenticated user's profile.
    """
    return UserProfile(
        id=str(current_user["id"]),
        email=current_user["email"],
        manager_name=current_user["manager_name"],
    )
