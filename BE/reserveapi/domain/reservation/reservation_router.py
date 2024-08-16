from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import joinedload, Session
from database import SessionLocal
from models import Reservation, MeetingRoom, Team
from datetime import date
from schemas import ReservationCreate, ReservationResponse, MeetingRoomResponse, MeetingRoomCreate

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
    meeting_rooms = db.query(MeetingRoom).distinct().all()
    return [{"id":room.key,"name": room.name} for room in meeting_rooms]


from typing import Optional

@router.get("/meetingrooms/list")
def meeting_room_list(db: Session = Depends(get_db)):
    meeting_rooms = db.query(MeetingRoom).distinct().all()
    return [{"id": room.key, "name": room.name} for room in meeting_rooms]


@router.get("/list")
def reservation_list(
    book_date: date = Query(...),
    team_key: Optional[str] = Query(None),  # team_key를 Optional[str]로 받아서 빈 문자열도 처리 가능하게 변경
    db: Session = Depends(get_db)
):
    query = db.query(Reservation).options(joinedload(Reservation.meeting_room), joinedload(Reservation.team))

    # 날짜에 따라 필터링
    query = query.filter(Reservation.bookDate == book_date)

    # team_key가 빈 문자열("")이 아닌 경우에만 필터링 적용
    if team_key and team_key.isdigit():  # 숫자로 변환 가능한지 확인
        query = query.filter(Reservation.teamKey == int(team_key))

    # 최종 쿼리 실행
    reservations = query.all()

    result = [
        {
            "id": reservation.key,  # reservation_id
            "room": reservation.meeting_room.name,  # room_name
            "team": reservation.teamName if reservation.team else "Unknown",  # teamName
            "team_color": reservation.team.color if reservation.team else "#000000",  # team_color, 기본값 설정
            "book_date": reservation.bookDate,
            "start_time": reservation.startTime,
            "end_time": reservation.endTime,
        }
        for reservation in reservations
    ]

    return result


@router.post("/create", response_model=ReservationResponse)
def create_reservation(reservation: ReservationCreate, db: Session = Depends(get_db)):
    # 예약하려는 회의실이 이미 존재하는지 확인
    meeting_room = db.query(MeetingRoom).filter(MeetingRoom.name == reservation.room_name).first()
    if not meeting_room:
        # 회의실이 없으면 404 오류를 반환하여 회의실을 새로 생성하지 않도록 함
        raise HTTPException(status_code=404, detail="MeetingRoom not found")

    # 예약하려는 팀이 이미 존재하는지 확인
    team = db.query(Team).filter(Team.name == reservation.team_name).first()
    if not team:
        # 팀이 없으면 404 오류를 반환
        raise HTTPException(status_code=404, detail="Team not found")

    # 새로운 예약을 생성하며, 기존의 회의실과 팀을 참조
    new_reservation = Reservation(
        roomKey=meeting_room.key,  # 기존 회의실의 키를 참조
        teamKey=team.key,  # 기존 팀의 키를 참조
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
        team_color=team.color,
        book_date=new_reservation.bookDate,
        start_time=new_reservation.startTime,
        end_time=new_reservation.endTime,
    )



@router.delete("/delete/{reservation_id}", response_model=ReservationResponse)
def delete_reservation(reservation_id: int, db: Session = Depends(get_db)):
    # Reservation 객체를 MeetingRoom과 함께 로드합니다.
    reservation = db.query(Reservation).options(joinedload(Reservation.meeting_room)).filter(
        Reservation.key == reservation_id).first()

    # 해당 예약이 존재하지 않으면 404 에러를 반환합니다.
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    # 팀 정보를 로드
    team = db.query(Team).filter(Team.key == reservation.teamKey).first()

    # 예약 삭제
    db.delete(reservation)
    db.commit()

    # 삭제된 예약의 정보를 반환합니다.
    return ReservationResponse(
        id=reservation.key,
        room=reservation.meeting_room.name,
        team=reservation.teamName,
        team_color=team.color if team else "#000000",  # 팀 색상을 추가하여 반환
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
        team_color=team.color,  # 추가된 부분
        book_date=reservation.bookDate,
        start_time=reservation.startTime,
        end_time=reservation.endTime,
    )


@router.post("/meetingroom/create", response_model=MeetingRoomResponse)
def create_meeting_room(meeting_room: MeetingRoomCreate, db: Session = Depends(get_db)):
    # 중복된 회의실 이름이 있는지 확인
    existing_room = db.query(MeetingRoom).filter(MeetingRoom.name == meeting_room.name).first()
    if existing_room:
        raise HTTPException(status_code=400, detail="Meeting room already exists")

    # 새로운 회의실 객체 생성 및 데이터베이스에 추가
    new_room = MeetingRoom(name=meeting_room.name)
    db.add(new_room)
    db.commit()
    db.refresh(new_room)

    return MeetingRoomResponse(
        id=new_room.key,
        name=new_room.name
    )


@router.delete("/delete/room/{room_key}", response_model=MeetingRoomResponse)
def delete_meeting_room(room_key: str, db: Session = Depends(get_db)):
    # MeetingRoom 객체를 데이터베이스에서 조회
    meeting_room = db.query(MeetingRoom).filter(MeetingRoom.key == room_key).first()
    print('room_name',room_key)

    # 회의실이 존재하지 않으면 404 에러를 반환합니다.
    if not meeting_room:
        raise HTTPException(status_code=404, detail="MeetingRoom not found")

    # 회의실과 관련된 모든 예약 삭제
    db.query(Reservation).filter(Reservation.roomKey == meeting_room.key).delete()

    # 회의실 삭제
    db.delete(meeting_room)
    db.commit()

    # 삭제된 회의실 정보를 반환
    return MeetingRoomResponse(
        id=meeting_room.key,
        name=meeting_room.name
    )