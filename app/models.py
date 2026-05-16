from pydantic import BaseModel # Pydantic is not a separate module; it ships with FastAPI, so no need to include into requirements.txt.
from typing import Optional

# These are .. not the class definitions I'm used to.
# I am definitely going to have to grasp these for other
# projects, as *tingles* they will be useful for working
# with data (possibly over the network?).

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    horizon: Optional[str] = "SPRINT"

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    horizon: Optional[str] = None
    nogo_reason: Optional[str] = None
    position: Optional[int] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    horizon: str
    position: int
    nogo_reason: Optional[str]
    is_deleted: int
    created_at: str
    updated_at: str
