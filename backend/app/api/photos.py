"""
TownPulse Photo Upload Endpoints
================================
Listing photography without a CDN in front of the app.

Two storage backends are supported by the configured STORAGE_PROVIDER:

- `s3`   — bytes go straight to the bucket (boto3) and the endpoint returns the
           object URL; the usual production path.
- `local`— bytes land in STORAGE_LOCAL_PATH and main.py mounts it read-only at
           /uploads, which is what `docker compose up` and the test suite use.

Hard limits (MAX_UPLOAD_BYTES, content-type allowlist) exist because this
endpoint is reachable by any signed-in user and is the cheapest way to fill a
disk otherwise.
"""

import uuid as uuid_lib
from pathlib import Path

import boto3
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.dependencies import CurrentUser

router = APIRouter(tags=["Photos"])

# What browsers actually send for listing photos, plus the formats we accept.
_ALLOWED_TYPES = {
    "image/jpeg": {".jpg", ".jpeg"},
    "image/png": {".png"},
    "image/webp": {".webp"},
}


@router.post(
    "/photos/upload",
    summary="Upload a listing photo",
    status_code=status.HTTP_201_CREATED,
)
async def upload_photo(
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> dict[str, str]:
    """
    Store an image and return its URL for `image_url` / `photos[]`.

    Requires authentication (not admin): verified owners may also replace
    their storefront photo, and forcing an admin round-trip for a JPEG is the
    sort of friction that gets a directory left un-updated.
    """
    content_type = (file.content_type or "").lower()
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported image type: {content_type or 'unknown'}",
        )

    contents = await file.read()
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file",
        )
    if len(contents) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.MAX_UPLOAD_BYTES} bytes",
        )

    extension = next(iter(_ALLOWED_TYPES[content_type]))
    object_name = f"listings/{uuid_lib.uuid4().hex}{extension}"

    if settings.STORAGE_PROVIDER == "s3" and settings.AWS_S3_BUCKET:
        url = _upload_s3(object_name, contents, content_type)
    else:
        url = _upload_local(object_name, contents)

    return {"url": url, "content_type": content_type}


def _upload_s3(object_name: str, contents: bytes, content_type: str) -> str:
    """Push bytes to S3 and return the public object URL."""
    try:
        client = boto3.client(
            "s3",
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
        )
        client.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=object_name,
            Body=contents,
            ContentType=content_type,
            ACL="public-read",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Storage upload failed: {exc}",
        ) from exc

    return (
        f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}"
        f".amazonaws.com/{object_name}"
    )


def _upload_local(object_name: str, contents: bytes) -> str:
    """Write to STORAGE_LOCAL_PATH (mounted read-only at /uploads)."""
    root = Path(settings.STORAGE_LOCAL_PATH).resolve()
    destination = (root / object_name).resolve()
    if root not in destination.parents and destination != root:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid object path",
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(contents)
    return f"/uploads/{object_name}"
