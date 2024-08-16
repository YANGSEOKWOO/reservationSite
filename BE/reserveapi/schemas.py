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
    team_color: str
    book_date: date
    start_time: time
    end_time: time

    class Config:
        orm_mode = True

class MeetingRoomCreate(BaseModel):
    name: str

class MeetingRoomResponse(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True

class UserCreate(BaseModel):
    id: str
    password: str
    team: str

    class Config:
        orm_mode = True

class TeamCreate(BaseModel):
    name: str
    color: str

    class Config:
        orm_mode = True

class TeamResponse(BaseModel):
    key: int
    name: str
    color: str

    class Config:
        orm_mode = True