from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.database import close_db, get_db
from backend.routers import sources, search, content, books, progress, explore, proxy


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_db()
    yield
    await close_db()


app = FastAPI(title="Reader", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def no_store_api_responses(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    return response


app.include_router(sources.router)
app.include_router(search.router)
app.include_router(content.router)
app.include_router(books.router)
app.include_router(progress.router)
app.include_router(explore.router)
app.include_router(proxy.router)

@app.get("/api/version")
async def get_version():
    version_file = Path(__file__).parent.parent / "VERSION"
    if version_file.exists():
        return {"version": version_file.read_text().strip()}
    return {"version": "dev"}

static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

    @app.get("/{path:path}")
    async def spa_fallback(request: Request, path: str):
        # Serve static file if it exists, otherwise return index.html for SPA routing
        file_path = static_dir / path
        if path and file_path.exists() and file_path.is_file():
            response = FileResponse(file_path)
        else:
            response = FileResponse(static_dir / "index.html")
        if path in ("", "index.html", "reader-sw.js", "sw.js", "registerSW.js", "manifest.webmanifest"):
            response.headers["Cache-Control"] = "no-store"
            response.headers["Pragma"] = "no-cache"
        return response
