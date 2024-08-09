from sqlalchemy.orm import Session
from models import MeetingRoom, Team, User, Reservation
from database import SessionLocal
from datetime import date, time

# 세션을 시작합니다
db = SessionLocal()

try:
    # MeetingRoom 객체 생성
    meeting_room = MeetingRoom(name="Conference Room A")

    # Team 객체 생성
    team = Team(name="cloudTech")

    # User 객체 생성
    user1 = User(name="person1", password="alice123", team=team)
    user2 = User(name="person2", password="bob123", team=team)

    # Reservation 객체 생성
    reservation = Reservation(
        meeting_room=meeting_room,
        team=team,
        bookDate=date(2024, 8, 9),  # datetime.date 객체로 변환
        startTime=time(15, 0),  # datetime.time 객체로 변환
        endTime=time(17, 0),  # datetime.time 객체로 변환
        teamName=team.name
    )

    # 세션에 추가
    db.add(meeting_room)
    db.add(team)
    db.add(user1)
    db.add(user2)
    db.add(reservation)

    # 모든 변경 사항을 한 번에 커밋
    db.commit()

except Exception as e:
    db.rollback()
    print(f"Error occurred: {e}")
finally:
    db.close()
