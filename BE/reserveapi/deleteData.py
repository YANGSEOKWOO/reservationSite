from sqlalchemy.orm import Session
from models import Reservation, User, Team, MeetingRoom
from database import SessionLocal

# 세션을 시작합니다
db = SessionLocal()

try:
    # 삽입한 데이터를 찾습니다.
    meeting_room = db.query(MeetingRoom).filter(MeetingRoom.name == "Conference Room A").first()
    team = db.query(Team).filter(Team.name == "Development Team").first()

    if meeting_room and team:
        # 먼저 외래 키로 연결된 `Reservation` 및 `User` 데이터를 삭제해야 합니다.
        db.query(Reservation).filter(Reservation.teamKey == team.key, Reservation.roomKey == meeting_room.key).delete()
        db.query(User).filter(User.teamId == team.key).delete()

        # 이제 `Team` 및 `MeetingRoom` 데이터를 삭제합니다.
        db.delete(team)
        db.delete(meeting_room)

        # 변경 사항을 커밋합니다.
        db.commit()

        print("Data deleted successfully.")
    else:
        print("No matching data found.")

except Exception as e:
    db.rollback()
    print(f"Error occurred: {e}")
finally:
    db.close()
