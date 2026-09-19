import os
import json
import time
from typing import Optional
import httpx
from google import genai
from google.genai import errors

CONFIG_DIR = os.path.expanduser("~/.config/rhesis")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")

def get_saved_api_key() -> Optional[str]:
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                config = json.load(f)
                return config.get("api_key")
        except Exception:
            return None
    return None

def save_api_key(key: str) -> None:
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump({"api_key": key}, f)

def delete_saved_api_key() -> bool:
    if os.path.exists(CONFIG_FILE):
        try:
            os.remove(CONFIG_FILE)
            return True
        except OSError:
            return False
    return False

def check_api_key_status(key: str, retry_on_unreachable: bool = True) -> tuple[Optional[bool], str]:
    if not key or not isinstance(key, str) or len(key.strip()) < 10:
        return False, "invalid"

    attempts = 2 if retry_on_unreachable else 1
    cleaned_key = key.strip()

    for attempt in range(attempts):
        try:
            client = genai.Client(api_key=cleaned_key)
            client.models.get(model="gemini-3-flash-preview")
            return True, "valid"
        except errors.ClientError as e:
            if getattr(e, "code", None) in (400, 401, 403):
                return False, "invalid"
            return None, "unreachable"
        except errors.ServerError:
            if attempt < attempts - 1:
                time.sleep(1)
                continue
            return None, "unreachable"
        except (httpx.RequestError, httpx.TimeoutException, OSError):
            if attempt < attempts - 1:
                time.sleep(1)
                continue
            return None, "unreachable"
        except Exception:
            return None, "unreachable"

    return None, "unreachable"

def verify_api_key(key: str) -> bool:
    is_valid, _ = check_api_key_status(key)
    return is_valid is True
