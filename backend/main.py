from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback
import os

app = FastAPI(title="深度资产账本 API", version="1.0.0")

print("👉 Deep Asset Ledger Backend Starting Check...")
print(f"👉 Current Working Directory: {os.getcwd()}")
print("👉 Loading dependencies...")

# Exception Handler to see 500s
@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    error_msg = "".join(traceback.format_exception(None, exc, exc.__traceback__))
    print(f"🔥 SERVER ERROR: {error_msg}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": error_msg},
    )

from dotenv import load_dotenv

load_dotenv()

# CORS for frontend
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/healthz")
def health_check():
    """Health check endpoint for container orchestration"""
    return {"status": "healthy"}

from routers import stocks, quotes, transactions, portfolio, users, external
from database import create_db_and_tables
from services.scheduler import start_scheduler, stop_scheduler

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    start_scheduler()  # 启动定时任务
    print("✅ Application started with background scheduler")

@app.on_event("shutdown")
def on_shutdown():
    stop_scheduler()  # 停止定时任务
    print("🛑 Application shutdown, scheduler stopped")

app.include_router(users.router)
app.include_router(stocks.router)
app.include_router(quotes.router)
app.include_router(transactions.router)
app.include_router(portfolio.router)
app.include_router(external.router)

# --- Production Static File Serving ---
# For Zeabur/Docker: The built frontend is in /app/frontend/dist
dist_path = os.path.join(os.path.dirname(__file__), "../frontend/dist")
if os.path.exists(dist_path):
    print(f"✅ Frontend dist found at {dist_path}, serving SPA")
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

    @app.get("/")
    async def serve_root():
        """Serve index.html for root path"""
        return FileResponse(os.path.join(dist_path, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # 排除 API 请求，防止路由未匹配时返回 index.html 导致前端 JSON 解析崩溃
        if full_path.startswith("api"):
            return JSONResponse(status_code=404, content={"detail": f"API route '{full_path}' not found"})
            
        # Specific files should be served normally (if not handled by assets)
        file_path = os.path.join(dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Catch-all: Route back to index.html for SPA
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    print(f"⚠️ Warning: Frontend dist path not found at {dist_path}")
    
    @app.get("/")
    def read_root():
        """Fallback when no frontend is available"""
        return {"message": "Deep Asset Ledger Backend is Running"}
