from __future__ import annotations

import asyncio
from contextlib import suppress

from ..core.config import settings
from ..db import mysql
from ..db.redis import get_redis_client
from ..services.data_replay_service import DataReplayService


class DataReplayJob:
    def __init__(self):
        self._task: asyncio.Task | None = None
        self._stop_event: asyncio.Event | None = None

    @property
    def running(self) -> bool:
        return self._task is not None and not self._task.done()

    def start(self) -> None:
        if self.running:
            return
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        if self._stop_event is not None:
            self._stop_event.set()
        if self._task is not None:
            self._task.cancel()
            with suppress(asyncio.CancelledError):
                await self._task
        self._task = None
        self._stop_event = None

    async def _run_loop(self) -> None:
        assert self._stop_event is not None
        while not self._stop_event.is_set():
            await asyncio.to_thread(self._replay_once)
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=settings.data_replay_interval)
            except asyncio.TimeoutError:
                continue

    @staticmethod
    def _replay_once() -> None:
        mysql.init_mysql()
        assert mysql.SessionLocal is not None
        with mysql.SessionLocal() as db:
            service = DataReplayService(db, get_redis_client())
            service.replay_next_batch()
            db.commit()


data_replay_job = DataReplayJob()
