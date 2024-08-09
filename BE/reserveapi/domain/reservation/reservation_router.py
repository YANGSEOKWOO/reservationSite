from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import joinedload, Session
from database import SessionLocal
from models import Reservation, MeetingRoom, Team
from datetime import date
from schemas import ReservationCreate, ReservationResponse

router = APIRouter(
    prefix="/api/reservation",
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/meetingrooms/list")
def meeting_room_list(db: Session = Depends(get_db)):
    meeting_rooms = db.query(MeetingRoom).all()
    return [{"name": room.name} for room in meeting_rooms]

@router.get("/list")
def reservation_list(book_date: date = Query(...), db: Session = Depends(get_db)):
    reservations = (
        db.query(Reservation)
        .options(joinedload(Reservation.meeting_room))
        .filter(Reservation.bookDate == book_date)
        .all()
    )

    result = [
        {
            "id": reservation.key,  # reservation_id
            "room": reservation.meeting_room.name,  # room_name
            "team": reservation.teamName,  # teamName
            "book_date": reservation.bookDate,
            "start_time": reservation.startTime,
            "end_time": reservation.endTime,
        }
        for reservation in reservations
    ]

    return result

@router.post("/create", response_model=ReservationResponse)
def create_reservation(reservation: ReservationCreate, db: Session = Depends(get_db)):
    meeting_room = db.query(MeetingRoom).filter(MeetingRoom.name == reservation.room_name).first()
    if not meeting_room:
        raise HTTPException(status_code=404, detail="MeetingRoom not found")

    team = db.query(Team).filter(Team.name == reservation.team_name).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    new_reservation = Reservation(
        roomKey=meeting_room.key,
        teamKey=team.key,
        bookDate=reservation.book_date,
        startTime=reservation.start_time,
        endTime=reservation.end_time,
        teamName=reservation.team_name
    )

    db.add(new_reservation)
    db.commit()
    db.refresh(new_reservation)

    return ReservationResponse(
        id=new_reservation.key,
        room=meeting_room.name,
        team=team.name,
        book_date=new_reservation.bookDate,
        start_time=new_reservation.startTime,
        end_time=new_reservation.endTime,
    )

@router.delete("/delete/{reservation_id}", response_model=ReservationResponse)
def delete_reservation(reservation_id: int, db: Session = Depends(get_db)):
    # Reservation 객체를 MeetingRoom과 함께 로드합니다.
    reservation = db.query(Reservation).options(joinedload(Reservation.meeting_room)).filter(Reservation.key == reservation_id).first()

    # 해당 예약이 존재하지 않으면 404 에러를 반환합니다.
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    # 예약 삭제
    db.delete(reservation)
    db.commit()

    # 삭제된 예약의 정보를 반환합니다.
    return ReservationResponse(
        id=reservation.key,
        room=reservation.meeting_room.name,
        team=reservation.teamName,
        book_date=reservation.bookDate,
        start_time=reservation.startTime,
        end_time=reservation.endTime,
    )

@router.put("/update/{reservation_id}", response_model=ReservationResponse)
def update_reservation(reservation_id: int, updated_reservation: ReservationCreate, db: Session = Depends(get_db)):
    # 기존 예약 정보를 데이터베이스에서 조회
    reservation = db.query(Reservation).filter(Reservation.key == reservation_id).first()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    # MeetingRoom과 Team을 이름으로 조회
    meeting_room = db.query(MeetingRoom).filter(MeetingRoom.name == updated_reservation.room_name).first()
    if not meeting_room:
        raise HTTPException(status_code=404, detail="MeetingRoom not found")

    team = db.query(Team).filter(Team.name == updated_reservation.team_name).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # 예약 정보 업데이트
    reservation.roomKey = meeting_room.key
    reservation.teamKey = team.key
    reservation.bookDate = updated_reservation.book_date
    reservation.startTime = updated_reservation.start_time
    reservation.endTime = updated_reservation.end_time
    reservation.teamName = updated_reservation.team_name

    db.commit()
    db.refresh(reservation)

    return ReservationResponse(
        id=reservation.key,
        room=meeting_room.name,
        team=team.name,
        book_date=reservation.bookDate,
        start_time=reservation.startTime,
        end_time=reservation.endTime,
    )