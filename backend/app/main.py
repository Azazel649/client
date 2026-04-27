from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .data import DEVICES, MAINTENANCE_PLANS, PRODUCTION_TASKS
from .schemas import Device, DispatchResult, MaintenancePlan, ProductionTask
from .services import dispatch_tasks, generate_maintenance_windows, get_dashboard_summary

app = FastAPI(
    title="Intelligent MES API",
    description="基于故障预测的智能化生产执行系统后端 API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/overview")
def overview():
    return get_dashboard_summary()


@app.get("/api/devices", response_model=list[Device])
def list_devices():
    return DEVICES


@app.get("/api/devices/{device_id}", response_model=Device)
def get_device(device_id: str):
    for device in DEVICES:
        if device.id == device_id:
            return device
    raise HTTPException(status_code=404, detail="Device not found")


@app.get("/api/maintenance/plans", response_model=list[MaintenancePlan])
def list_maintenance_plans():
    return MAINTENANCE_PLANS


@app.post("/api/maintenance/plans/generate", response_model=list[MaintenancePlan])
def create_maintenance_windows():
    return generate_maintenance_windows()


@app.get("/api/production/tasks", response_model=list[ProductionTask])
def list_production_tasks():
    return PRODUCTION_TASKS


@app.post("/api/production/tasks/dispatch", response_model=DispatchResult)
def create_dispatch_plan():
    return dispatch_tasks()

