from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Reservation(Base):
    __tablename__ = "reservations"

    key = Column(Integer, primary_key=True, index=True)
    roomKey = Column(Integer, ForeignKey('meeting_rooms.key'))
    teamKey = Column(Integer, ForeignKey('teams.key'))
    bookDate = Column(Date)
    startTime = Column(Time)
    endTime = Column(Time)
    teamName = Column(String)

    meeting_room = relationship("MeetingRoom", back_populates="reservations")
    team = relationship("Team", back_populates="reservations")

class User(Base):
    __tablename__ = "users"

    key = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    password = Column(String)
    teamId = Column(Integer, ForeignKey('teams.key'))

    team = relationship("Team", back_populates="members")

class MeetingRoom(Base):
    __tablename__ = "meeting_rooms"

    key = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)

    reservations = relationship("Reservation", back_populates="meeting_room")

class Team(Base):
    __tablename__ = "teams"

    key = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    color = Column(String, nullable=False)  # 팀 색상 컬럼 추가

    members = relationship("User", back_populates="team")
    reservations = relationship("Reservation", back_populates="team")
