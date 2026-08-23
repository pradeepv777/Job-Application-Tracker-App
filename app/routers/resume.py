import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.config import settings

router = APIRouter(
    prefix="/resume",
    tags=["Resume"]
)

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def get_upload_dir() -> str:
    return os.path.abspath(settings.UPLOAD_DIR)


def safe_path(filename: str) -> str:
    """
    Given a stored relative filename (e.g. '1_abc123.pdf'),
    resolve the absolute path and ensure it stays within UPLOAD_DIR.
    """
    upload_dir = get_upload_dir()
    resolved = os.path.abspath(os.path.join(upload_dir, filename))
    if not resolved.startswith(upload_dir):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path"
        )
    return resolved


@router.post("/upload", summary="Upload resume", status_code=status.HTTP_201_CREATED)
def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed"
        )

    contents = file.file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large. Maximum allowed size is 5 MB"
        )

    upload_dir = get_upload_dir()
    os.makedirs(upload_dir, exist_ok=True)

    # Clean up old resume if it exists
    if current_user.resume_path:
        try:
            old_abs = safe_path(current_user.resume_path)
            if os.path.exists(old_abs):
                os.remove(old_abs)
        except Exception:
            pass

    # Store only the filename — portable across environments
    filename = f"{current_user.id}_{uuid.uuid4().hex}.pdf" # eg. 5_a8f3c21e9b7d4e1a.pdf
    abs_path = os.path.join(upload_dir, filename)
    """
    if 2 resume have same name so it will overwrite
    """
    with open(abs_path, "wb") as buffer: #wb -> write binary
        buffer.write(contents)

    # Save relative filename only
    current_user.resume_path = filename

    db.commit()
    db.refresh(current_user)

    return {
        "message": "Resume uploaded successfully",
        "filename": filename
    }


@router.delete("", summary="Delete resume", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.resume_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume uploaded"
        )

    try:
        abs_path = safe_path(current_user.resume_path)
        if os.path.exists(abs_path):
            os.remove(abs_path)
    except Exception:
        pass

    current_user.resume_path = None
    db.commit()


@router.get("", summary="Get resume metadata")
def get_resume(
    current_user: User = Depends(get_current_user)
):
    if not current_user.resume_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume uploaded"
        )

    return {
        "filename": current_user.resume_path
    }


@router.get("/download", summary="Download resume file")
def download_resume(
    current_user: User = Depends(get_current_user)
):
    if not current_user.resume_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume uploaded"
        )

    abs_path = safe_path(current_user.resume_path)

    if not os.path.exists(abs_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found on server"
        )

    return FileResponse(
        path=abs_path,
        media_type="application/pdf",
        filename=current_user.resume_path
    )
