from datetime import date, time
from pydantic import BaseModel, Field, ConfigDict
from app.enums import InterviewResult


class InterviewCreate(BaseModel):
    application_id: int
    round: str = Field(min_length=2)
    date: date
    time: time
    interviewer: str
    notes: str
    result: InterviewResult


class InterviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    round: str
    date: date
    time: time
    interviewer: str
    notes: str
    result: InterviewResult


class InterviewUpdate(BaseModel):
    round: str
    date: date
    time: time
    interviewer: str
    notes: str
    result: InterviewResult
