"""
Authentication REST endpoints for FactoryServSim.

Provides:
- POST /api/auth/register  -- Register a new manager account
- POST /api/auth/login     -- Login and receive a JWT token
- GET  /api/auth/me        -- Get current user profile (protected)
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.models.db_models import User

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
    id: int
    email: str
    manager_name: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new factory manager account.

    Creates a new user with the given email, password, and name.
    Returns a JWT token so the user is immediately logged in after registration.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    # Create new user
    new_user = User(
        email=request.email,
        hashed_password=hash_password(request.password),
        manager_name=request.manager_name,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info("New user registered: %s (%s)", new_user.manager_name, new_user.email)

    # Generate token
    access_token = create_access_token(data={"sub": new_user.email})

    return TokenResponse(
        access_token=access_token,
        manager_name=new_user.manager_name,
        email=new_user.email,
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Login with email and password.

    Validates credentials and returns a JWT access token.
    """
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    logger.info("User logged in: %s", user.email)

    access_token = create_access_token(data={"sub": user.email})

    return TokenResponse(
        access_token=access_token,
        manager_name=user.manager_name,
        email=user.email,
    )


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Get the currently authenticated user's profile.

    Requires a valid JWT token in the Authorization header.
    """
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        manager_name=current_user.manager_name,
    )
