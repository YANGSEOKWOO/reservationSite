from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import joinedload, Session
from database import SessionLocal
from models import User, Team
from schemas import UserCreate

router = APIRouter(
    prefix="/api/user"
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/login")
def user_login(login_data: UserCreate, db: Session = Depends(get_db)):
    if login_data.id == "admin" and login_data.password == "admin":
        return {"success": "true",
                "isAdmin": "true",
                }
    else:
        team = db.query(Team).filter(Team.name == login_data.team).first()

        if not team:
            raise HTTPException(status_code=400, detail='해당 팀이 존재하지 않습니다.')

        existing_user = db.query(User).filter(User.name == login_data.id).first()

        if existing_user:
            existing_user.password = login_data.password
            existing_user.teamId = login_data.team
            db.commit()
            db.refresh(existing_user)
            return {"success": "true", "isAdmin": "false"}
        else:
            # 새 사용자 생성 및 DB에 추가
            new_user = User(name=login_data.id, password=login_data.password, teamId=login_data.team)
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return {"success": "true", "isAdmin": "false"}


@router.get("/list")
def get_user_list(db: Session = Depends(get_db)):
    users = db.query(User).distinct().all()
    return [{"name": user.name, "team_name": user.team} for user in users]
