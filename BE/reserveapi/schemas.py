from pydantic import BaseModel, field_validator
from datetime import date, time, datetime



# Pydantic 모델 정의
class ReservationCreate(BaseModel):
    room_name: str
    team_name: str
    book_date: date
    start_time: time
    end_time: time

    class Config:
        orm_mode = True

class ReservationResponse(BaseModel):
    id: int
    room: str
    team: str
    book_date: date
    start_time: time
    end_time: time

    class Config:
        orm_mode = True
