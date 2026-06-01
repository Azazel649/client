from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..core.security import create_access_token, hash_password, verify_password
from ..models.user import AdminUser
from ..repositories.user_repository import UserRepository
from ..schemas.auth_schema import LoginResponse, UserInfoResponse


class AuthService:
    def __init__(self, db: Session):
        self.users = UserRepository(db)

    def login(self, username: str, password: str) -> LoginResponse:
        user = self.users.get_by_username(username)
        if user is None or user.status != 1 or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")

        self.users.update_last_login(user, datetime.now())
        token = create_access_token(user.username)
        return LoginResponse(access_token=token, user=self.to_user_info(user))

    def change_password(self, user: AdminUser, old_password: str, new_password: str) -> None:
        if not verify_password(old_password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="原密码不正确")
        user.password_hash = hash_password(new_password)
        self.users.db.flush()

    @staticmethod
    def to_user_info(user: AdminUser) -> UserInfoResponse:
        return UserInfoResponse(
            user_id=user.user_id,
            username=user.username,
            real_name=user.real_name,
            role=user.role,
            status=user.status,
            last_login_time=user.last_login_time,
        )
