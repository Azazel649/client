from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.security import get_current_user
from ..db.mysql import get_db
from ..models.user import AdminUser
from ..schemas.auth_schema import ChangePasswordRequest, LoginRequest, LoginResponse, MessageResponse, UserInfoResponse
from ..services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    return AuthService(db).login(payload.username, payload.password)


@router.get("/me", response_model=UserInfoResponse)
def get_me(current_user: AdminUser = Depends(get_current_user)):
    return AuthService.to_user_info(current_user)


@router.post("/logout", response_model=MessageResponse)
def logout():
    return MessageResponse(message="已退出登录")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: AdminUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    AuthService(db).change_password(current_user, payload.old_password, payload.new_password)
    return MessageResponse(message="密码已更新")
