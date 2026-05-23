"""TrialTwin FastAPI application.

Endpoints:
  POST   /api/simulate              Create a new run, return {run_id, status}
  GET    /api/simulate/{run_id}     SSE stream of progress + final result
  GET    /api/result/{run_id}       Stored result (for share-link recovery)
  POST   /api/parse                 Free-text trial spec parsing
  GET    /api/audit-data            The 98 audit studies
  GET    /api/country-metadata      Country codes, names, regions, coords
  GET    /api/health                Health + Ollama availability
"""
from __future__ import annotations

import asyncio
import json
import os
import tempfile
import time
import uuid
from concurrent.futures import ProcessPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from . import db, schemas
from .llm.ollama_client import OLLAMA_MODEL, is_ollama_available
from .llm.rationale import get_rationale
from .parsers.trial_text_parser import parse_trial_text
from .simulation import data_loader
from .simulation.orchestrator import run_full_simulation


# -----------------------------------------------------------------------------
# Lifespan: validate data files, init DB, create process pool
# -----------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    data_loader.validate_all()
    await db.init_db()
    app.state.executor = ProcessPoolExecutor(max_workers=max(2, os.cpu_count() or 2))
    app.state.progress_dir = Path(tempfile.gettempdir()) / "trialtwin_progress"
    app.state.progress_dir.mkdir(parents=True, exist_ok=True)
    try:
        yield
    finally:
        app.state.executor.shutdown(wait=False, cancel_futures=True)


app = FastAPI(title="TrialTwin API", version="1.0.0", lifespan=lifespan)


# CORS: localhost dev + Docker service name
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Health
# -----------------------------------------------------------------------------


@app.get("/api/health", response_model=schemas.HealthResponse)
async def health():
    ollama_ok = await is_ollama_available()
    return schemas.HealthResponse(
        status="ok",
        ollama_available=ollama_ok,
        model=OLLAMA_MODEL,
    )


# -----------------------------------------------------------------------------
# Static data endpoints
# -----------------------------------------------------------------------------


@app.get("/api/diseases")
async def diseases():
    return {"diseases": data_loader.available_diseases()}


@app.get("/api/audit-data")
async def audit_data():
    return data_loader.audit_studies()


@app.get("/api/country-metadata")
async def country_metadata():
    countries = data_loader.country_metadata()["countries"]
    enroll = data_loader.enrollment_priors()
    # Enrich with accessibility + observed share for the form's right-panel preview
    enriched = {}
    for code, meta in countries.items():
        e = enroll.get(code, {})
        enriched[code] = {
            **meta,
            "code": code,
            "accessibility_index": e.get("accessibility_index"),
            "observed_participation_share": e.get("observed_participation_share"),
        }
    return {"countries": enriched, "regions": data_loader.rcc_incidence()["regions"]}


# -----------------------------------------------------------------------------
# Parser
# -----------------------------------------------------------------------------


@app.post("/api/parse")
async def parse(payload: dict):
    text = payload.get("text", "")
    if not isinstance(text, str):
        raise HTTPException(400, "`text` must be a string")
    return parse_trial_text(text)


# -----------------------------------------------------------------------------
# Simulation
# -----------------------------------------------------------------------------


@app.post("/api/simulate")
async def create_simulation(config: schemas.TrialConfig):
    run_id = uuid.uuid4().hex
    await db.create_run(run_id, config.model_dump_json(), seed=config.random_seed)
    # We don't kick off the worker here — the SSE GET endpoint launches it.
    # That way, opening the SSE stream IS the action; if the caller never connects,
    # we never spend the CPU.
    return {"run_id": run_id, "status": "queued"}


def _progress_path(app_state, run_id: str) -> Path:
    return app_state.progress_dir / f"{run_id}.log"


async def _stream_simulation(request: Request, run_id: str):
    """Run the simulation in a process pool, stream SSE progress, persist result."""
    record = await db.get_run(run_id)
    if record is None:
        yield f"event: error\ndata: {json.dumps({'error': 'unknown run_id'})}\n\n"
        return

    config_json = record["config"]
    try:
        config_dict = json.loads(config_json)
    except json.JSONDecodeError:
        yield f"event: error\ndata: {json.dumps({'error': 'invalid config'})}\n\n"
        return

    progress_file = _progress_path(request.app.state, run_id)
    # Reset progress file
    try:
        progress_file.unlink(missing_ok=True)
    except Exception:
        pass

    loop = asyncio.get_running_loop()
    executor = request.app.state.executor
    future = loop.run_in_executor(
        executor, run_full_simulation, config_dict, run_id, str(progress_file)
    )

    yield f"event: queued\ndata: {json.dumps({'run_id': run_id})}\n\n"

    # Tail the progress file while the future runs
    last_pos = 0
    while not future.done():
        await asyncio.sleep(0.25)
        if await request.is_disconnected():
            future.cancel()
            return
        try:
            if progress_file.exists():
                with open(progress_file, "r", encoding="utf-8") as f:
                    f.seek(last_pos)
                    new = f.read()
                    last_pos = f.tell()
                for line in new.splitlines():
                    if not line.strip():
                        continue
                    parts = line.split("|")
                    if len(parts) == 3:
                        stage, idx, total = parts
                        yield (
                            "event: progress\n"
                            f"data: {json.dumps({'stage': stage, 'idx': int(idx), 'total': int(total)})}\n\n"
                        )
        except Exception:
            pass

    try:
        result = future.result()
    except Exception as exc:
        await db.fail_run(run_id, str(exc))
        yield f"event: error\ndata: {json.dumps({'error': str(exc)})}\n\n"
        return

    # Add LLM rationale to each recommendation (best-effort, parallel)
    try:
        rationale_tasks = [
            get_rationale(
                country=rec["country_name"],
                region_label=rec["region_label"],
                current_rq=rec["current_region_rq"],
                new_rq=rec["new_region_rq"],
                delta_res=rec["delta_res"],
            )
            for rec in result["recommendations"]
        ]
        rationales = await asyncio.gather(*rationale_tasks, return_exceptions=True)
        for rec, rat in zip(result["recommendations"], rationales):
            rec["rationale"] = rat if isinstance(rat, str) else (
                f"Adding a site in {rec['country_name']} would improve {rec['region_label']}'s "
                f"projected RQ from {rec['current_region_rq']:.2f} to {rec['new_region_rq']:.2f}."
            )
    except Exception:
        for rec in result["recommendations"]:
            rec.setdefault("rationale", "Rationale unavailable.")

    # Persist
    await db.update_run(
        run_id,
        json.dumps(result, default=str),
        status="complete",
        seed=result["base_seed"],
    )

    yield f"event: result\ndata: {json.dumps(result, default=str)}\n\n"
    yield "event: done\ndata: {}\n\n"


@app.get("/api/simulate/{run_id}")
async def stream_simulation(run_id: str, request: Request):
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(
        _stream_simulation(request, run_id),
        media_type="text/event-stream",
        headers=headers,
    )


@app.get("/api/result/{run_id}")
async def get_result(run_id: str):
    record = await db.get_run(run_id)
    if record is None:
        raise HTTPException(404, f"unknown run_id {run_id}")
    if record["status"] != "complete":
        return {
            "run_id": run_id,
            "status": record["status"],
            "created_at": record["created_at"],
        }
    try:
        result = json.loads(record["result"])
    except (TypeError, json.JSONDecodeError):
        raise HTTPException(500, "stored result is not valid JSON")
    return result


# -----------------------------------------------------------------------------
# Root
# -----------------------------------------------------------------------------


@app.get("/")
async def root():
    return {
        "name": "TrialTwin API",
        "version": "1.0.0",
        "docs": "/docs",
    }
