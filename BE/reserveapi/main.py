from fastapi import FastAPI
from domain.reservation import reservation_router
from domain.user import user_router
from domain.team import team_router
from starlette.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://127.0.0.1:5500",    # 또는 "http://localhost:5173"
    "http://localhost:5500",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# @app.get("/hello")
# def hello():
#     return {"message": "안녕하세요 파이보"}


app.include_router(reservation_router.router)
app.include_router(user_router.router)
app.include_router(team_router.router)