from pydantic import BaseModel, Field, ConfigDict
from app.enums import ApplicationStatus


class Application(BaseModel):
    company: str = Field(min_length=2, max_length=100)
    role: str = Field(min_length=3, max_length=100)
    salary: int = Field(gt=10000)
    status: ApplicationStatus = Field(default=ApplicationStatus.APPLIED)


class ApplicationResponse(BaseModel):
    message: str
    company: str
    salary: int


class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company: str
    role: str
    salary: int
    status: ApplicationStatus


class ApplicationUpdate(BaseModel):
    company: str = Field(min_length=2, max_length=100)
    role: str = Field(min_length=3, max_length=100)
    salary: int = Field(gt=10000)
    status: ApplicationStatus

# used when GET /applications returns multiple applications, rather than one
class PaginatedApplicationResponse(BaseModel):
    page: int   
    limit: int
    total: int
    total_pages: int
    items: list[ApplicationRead]
