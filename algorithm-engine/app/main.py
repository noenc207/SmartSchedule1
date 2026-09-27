"""
FastAPI HTTP Microservice for SmartSchedule Advanced Algorithm Engine.
Exposes high-performance OR-Tools CP-SAT optimization, What-If simulation, and mobility analysis.
Stateless, deterministic, and isolated from direct database access.
"""

import time
import uuid
import logging
from typing import Any, Dict

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models.contracts import (
    AnalyzeMobilityRequest,
    AnalyzeMobilityResponse,
    OptimizeRequest,
    OptimizeResponse,
    WhatIfRequest,
    WhatIfResponse,
)
from optimizer.cp_solver import solve_schedule_optimization
from routing.mobility_analyzer import analyze_mobility
from simulation.what_if_engine import simulate_what_if


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
)
logger = logging.getLogger("algorithm-engine")

app = FastAPI(
    title="SmartSchedule Advanced Algorithm Engine",
    description="Mathematical constraint optimization (CP-SAT), mobility routing, and what-if simulation service.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_timing_and_correlation_headers(request: Request, call_next):
    start_time = time.perf_counter()
    correlation_id = request.headers.get("X-Correlation-Id", str(uuid.uuid4()))
    
    response = await call_next(request)
    
    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
    response.headers["X-Correlation-Id"] = correlation_id
    response.headers["X-Computation-Time-Ms"] = str(elapsed_ms)
    response.headers["X-Algorithm-Engine"] = "OR-Tools-CP-SAT"
    
    return response


@app.get("/health", status_code=status.HTTP_200_OK)
def health_check() -> Dict[str, Any]:
    return {
        "status": "UP",
        "service": "smartschedule-algorithm-engine",
        "version": "1.0.0",
        "solver": "Google OR-Tools CP-SAT",
        "features": [
            "SCHEDULE_OPTIMIZATION",
            "WHAT_IF_SIMULATION",
            "MOBILITY_TRANSITION_ANALYSIS",
        ],
    }


@app.post(
    "/optimize",
    response_model=OptimizeResponse,
    status_code=status.HTTP_200_OK,
    summary="Optimize Schedule with CP-SAT",
)
def optimize_schedule(request: OptimizeRequest) -> OptimizeResponse:
    try:
        logger.info(
            f"Optimizing schedule {request.scheduleId}: "
            f"{len(request.tasks)} tasks, {len(request.existingEvents)} existing events, "
            f"range [{request.fromTime} -> {request.toTime}]"
        )
        return solve_schedule_optimization(request)
    except Exception as ex:
        logger.exception(f"Error solving schedule optimization: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization solver failure: {str(ex)}",
        )


@app.post(
    "/what-if",
    response_model=WhatIfResponse,
    status_code=status.HTTP_200_OK,
    summary="Simulate What-If Mutation",
)
def simulate_schedule_what_if(request: WhatIfRequest) -> WhatIfResponse:
    try:
        logger.info(
            f"Running What-If simulation for {request.scheduleId}: mutation={request.mutation.changeType}"
        )
        return simulate_what_if(request)
    except Exception as ex:
        logger.exception(f"Error running What-If simulation: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"What-If simulation failure: {str(ex)}",
        )


@app.post(
    "/analyze-mobility",
    response_model=AnalyzeMobilityResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze Campus Mobility & Transition Health",
)
def analyze_schedule_mobility(request: AnalyzeMobilityRequest) -> AnalyzeMobilityResponse:
    try:
        logger.info(f"Analyzing mobility for {len(request.events)} events")
        return analyze_mobility(
            events=request.events,
            travel_matrix=request.travelMatrix,
            min_transition_buffer_minutes=request.minTransitionBufferMinutes,
        )
    except Exception as ex:
        logger.exception(f"Error analyzing mobility: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Mobility analysis failure: {str(ex)}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
