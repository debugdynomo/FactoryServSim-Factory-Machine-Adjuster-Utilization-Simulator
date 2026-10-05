"""
Authentication REST endpoints for FactoryServSim.

Provides:
- POST /api/auth/register  -- Register a new factory manager account
- POST /api/auth/login     -- Login with factory_id + email + password
- GET  /api/auth/me        -- Get current user profile (protected)
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.repository import find_user_by_email, find_user_by_factory_and_email, create_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])


# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    """Schema for user registration."""
    factory_id: str = Field(..., min_length=1, description="Unique factory identifier (e.g. FAC001)")
    factory_name: str = Field(..., min_length=1, description="Factory display name")
    manager_name: str = Field(..., min_length=1, description="Manager's full name")
    email: str = Field(..., description="Manager's email address")
    password: str = Field(..., min_length=6, description="Password (minimum 6 characters)")


class LoginRequest(BaseModel):
    """Schema for user login."""
    factory_id: str = Field(..., description="Factory identifier")
    email: str = Field(..., description="Manager's email address")
    password: str = Field(..., description="Password")


class RegisterResponse(BaseModel):
    """Schema for registration success (no auto-login)."""
    message: str


class TokenResponse(BaseModel):
    """Schema for login response containing the JWT token."""
    access_token: str
    token_type: str = "bearer"
    manager_name: str
    email: str
    factory_id: str
    factory_name: str


class UserProfile(BaseModel):
    """Schema for the current user's profile."""
    id: str
    email: str
    manager_name: str
    factory_id: str
    factory_name: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    Register a new factory manager account.
    Does NOT auto-login — user must go to the login page after registration.
    """
    existing_user = find_user_by_factory_and_email(request.factory_id, request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this factory ID and email already exists",
        )

    hashed = hash_password(request.password)
    user_doc = create_user(
        factory_id=request.factory_id,
        factory_name=request.factory_name,
        email=request.email,
        hashed_password=hashed,
        manager_name=request.manager_name,
    )

    logger.info(
        "New user registered: %s (%s) for factory %s",
        user_doc["manager_name"], user_doc["email"], user_doc["factory_id"],
    )

    return RegisterResponse(message="Account created successfully. Please login.")


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Login with factory_id, email, and password.
    Validates credentials and returns a JWT access token.
    """
    user = find_user_by_factory_and_email(request.factory_id, request.email)

    if not user or not verify_password(request.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid factory ID, email, or password",
        )

    logger.info("User logged in: %s (factory: %s)", user["email"], user["factory_id"])

    access_token = create_access_token(data={
        "sub": user["email"],
        "factory_id": user["factory_id"],
    })

    return TokenResponse(
        access_token=access_token,
        manager_name=user["manager_name"],
        email=user["email"],
        factory_id=user["factory_id"],
        factory_name=user["factory_name"],
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
        factory_id=current_user["factory_id"],
        factory_name=current_user["factory_name"],
    )
