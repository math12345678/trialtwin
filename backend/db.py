"""SQLite persistence layer for simulation runs."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import aiosqlite

DB_PATH = os.environ.get("TRIALTWIN_DB", str(Path(__file__).parent / "trialtwin.db"))


CREATE_SQL = """
CREATE TABLE IF NOT EXISTS runs (
    id          TEXT PRIMARY KEY,
    config      TEXT NOT NULL,
    result      TEXT,
    status      TEXT DEFAULT 'running',
    created_at  TEXT NOT NULL,
    seed        INTEGER
);
"""


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(CREATE_SQL)
        await db.commit()


async def create_run(run_id: str, config_json: str, seed: Optional[int] = None) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO runs (id, config, result, status, created_at, seed) "
            "VALUES (?, ?, NULL, 'running', ?, ?)",
            (run_id, config_json, datetime.now(timezone.utc).isoformat(), seed),
        )
        await db.commit()


async def update_run(run_id: str, result_json: str, status: str = "complete", seed: Optional[int] = None) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        if seed is not None:
            await db.execute(
                "UPDATE runs SET result=?, status=?, seed=? WHERE id=?",
                (result_json, status, seed, run_id),
            )
        else:
            await db.execute(
                "UPDATE runs SET result=?, status=? WHERE id=?",
                (result_json, status, run_id),
            )
        await db.commit()


async def fail_run(run_id: str, error: str) -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE runs SET status='failed', result=? WHERE id=?",
            (f'{{"error": "{error.replace(chr(34), chr(39))}"}}', run_id),
        )
        await db.commit()


async def get_run(run_id: str) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT id, config, result, status, created_at, seed FROM runs WHERE id=?",
            (run_id,),
        ) as cursor:
            row = await cursor.fetchone()
            if row is None:
                return None
            return {
                "id": row[0],
                "config": row[1],
                "result": row[2],
                "status": row[3],
                "created_at": row[4],
                "seed": row[5],
            }
