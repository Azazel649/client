from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.user import AdminUser
from .base import BaseRepository


class UserRepository(BaseRepository[AdminUser]):
    model = AdminUser

    def get_by_username(self, username: str) -> AdminUser | None:
        return self.db.scalar(select(AdminUser).where(AdminUser.username == username))

    def update_last_login(self, user: AdminUser, login_time) -> AdminUser:
        user.last_login_time = login_time
        self.db.flush()
        return user
