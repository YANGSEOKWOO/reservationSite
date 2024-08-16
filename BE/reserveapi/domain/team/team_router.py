from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Team, Reservation
from schemas import TeamCreate, TeamResponse

router = APIRouter(
    prefix="/api/team"
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# 팀 추가하기 API
@router.post("/create", response_model=TeamResponse)
def create_team(team: TeamCreate, db: Session = Depends(get_db)):
    # 팀 이름이 중복되는지 확인
    existing_team = db.query(Team).filter(Team.name == team.name).first()
    if existing_team:
        raise HTTPException(status_code=400, detail="이미 존재하는 팀 이름입니다.")

    # 새로운 팀 생성
    new_team = Team(name=team.name, color=team.color)
    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    return TeamResponse(key=new_team.key, name=new_team.name, color=new_team.color)


# 팀 삭제하기 API
@router.delete("/delete/{team_key}", response_model=TeamResponse)
def delete_team(team_key: int, db: Session = Depends(get_db)):
    # 팀 존재 여부 확인
    team = db.query(Team).filter(Team.key == team_key).first()
    if not team:
        raise HTTPException(status_code=404, detail="해당 팀을 찾을 수 없습니다.")

    # 해당 팀과 연관된 예약 삭제
    db.query(Reservation).filter(Reservation.teamKey == team_key).delete()

    # 팀 삭제
    db.delete(team)
    db.commit()

    return TeamResponse(key=team.key, name=team.name, color=team.color)


# 팀 정보 가져오기 (모든 팀)
@router.get("/list", response_model=list[TeamResponse])
def get_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).all()
    return teams