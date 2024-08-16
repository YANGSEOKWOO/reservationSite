import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from database import Base, SessionLocal

# SQLite 데이터베이스 파일에 대한 경로
SQLALCHEMY_DATABASE_URL = "sqlite:///./reserveapi.db"

# 데이터베이스 엔진 생성
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

def reset_database():
    with engine.connect() as connection:
        # 트랜잭션 시작
        with connection.begin():
            # 각 테이블의 데이터를 삭제
            connection.execute(text("DELETE FROM reservations;"))
            connection.execute(text("DELETE FROM meeting_rooms;"))
            connection.execute(text("DELETE FROM teams;"))
            connection.execute(text("DELETE FROM users;"))

            # 시퀀스 테이블이 있는 경우에만 초기화
            try:
                connection.execute(text("DELETE FROM sqlite_sequence WHERE name='reservations';"))
                connection.execute(text("DELETE FROM sqlite_sequence WHERE name='meeting_rooms';"))
                connection.execute(text("DELETE FROM sqlite_sequence WHERE name='teams';"))
                connection.execute(text("DELETE FROM sqlite_sequence WHERE name='users';"))
            except sqlalchemy.exc.OperationalError:
                # sqlite_sequence 테이블이 존재하지 않는 경우 무시
                print("No sqlite_sequence table found, skipping sequence reset.")

    print("Database has been reset.")

if __name__ == "__main__":
    reset_database()
