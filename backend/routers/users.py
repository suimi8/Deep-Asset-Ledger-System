from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from database import get_session
from models import User
from services.auth import get_password_hash, verify_password, create_access_token, get_current_user
from services.email import send_verification_code
from services.crypto import get_public_key, decrypt_password
import random
import time
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/users", tags=["users"])

# Temp store for verification codes: {email: {"code": str, "expiry": float}}
verification_codes = {}

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    code: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

import json
import base64

class CodeRequest(BaseModel):
    email: EmailStr
    lang: Optional[str] = "zh-CN"
    security_token: str
    w: Optional[str] = None # The encrypted environment data

import hmac
import hashlib
import uuid

import secrets
import string

import os
from dotenv import load_dotenv

load_dotenv()

# Secret key for signing tokens (should be in env vars)
TOKEN_SECRET = os.getenv("TOKEN_SECRET", "deep_ledger_dynamic_secret_key_2026")
if TOKEN_SECRET == "deep_ledger_dynamic_secret_key_2026":
    print("⚠️ WARNING: Using default insecure TOKEN_SECRET. Set TOKEN_SECRET in .env for production.")

def generate_session_key():
    # Generate a random 16-char key for this specific session
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))

def generate_dynamic_token():
    nonce = str(uuid.uuid4())
    timestamp = str(int(time.time()))
    session_key = generate_session_key() # Unique key for this interaction
    
    # Embed key in payload so backend stays stateless
    payload = f"{nonce}|{timestamp}|{session_key}"
    signature = hmac.new(TOKEN_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    
    signed_token = f"{base64.b64encode(payload.encode()).decode()}:{signature}"
    return {"token": signed_token, "key": session_key}

def verify_token_and_get_key(token: str):
    """Verifies token and returns the embedded session key if valid"""
    try:
        if not token or ":" not in token:
            return None
        
        encoded_payload, signature = token.split(":")
        payload = base64.b64decode(encoded_payload).decode()
        nonce, timestamp, session_key = payload.split("|")
        
        # 1. Verify Signature
        expected_sig = hmac.new(TOKEN_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
            
        # 2. Verify Expiration
        if time.time() - int(timestamp) > 300: 
            return None
            
        return session_key
    except Exception as e:
        print(f"Token verification error: {e}")
        return None

@router.get("/get-token")
def get_request_token():
    """Generate a dynamic token and a paired encryption key"""
    return generate_dynamic_token()

@router.get("/public-key")
def request_public_key():
    return {"public_key": get_public_key()}

def decrypt_w(ciphertext: str, key: str) -> dict:
    try:
        # Dynamic Key XOR Decryption
        decoded = base64.b64decode(ciphertext).decode('utf-8')
        result = ""
        for i in range(len(decoded)):
            result += chr(ord(decoded[i]) ^ ord(key[i % len(key)]))
        return json.loads(result)
    except Exception as e:
        print(f"Decryption failed: {e}")
        return None

@router.post("/send-code")
def request_code(req: CodeRequest):
    # 1. Dynamic Token & Key Extraction
    session_key = verify_token_and_get_key(req.security_token)
    if not session_key:
        print(f"⚠️ Invalid/Expired dynamic token")
        raise HTTPException(status_code=403, detail="Security Token Expired or Invalid")
    
    # 2. Advanced Environment Validation

    # 2. Advanced Environment Validation (The 'w' parameter)
    if not req.w:
         print("⚠️ Missing 'w' parameter. Rejection candidate in strict mode.")
         # In strict mode, raise HTTPException(status_code=403, detail="Missing CAPTCHA signature")
    
    if req.w:
        data = decrypt_w(req.w, session_key)
        if not data:
            print("❌ Invalid 'w' signature.")
            raise HTTPException(status_code=403, detail="Invalid CAPTCHA signature")
        
        # Verify internal secret inside the encrypted payload
        if data.get("Key") != "deep_asset_ledger_v2":
            print("❌ Malformed 'w' payload.")
            raise HTTPException(status_code=403, detail="Forged CAPTCHA signature")

        # Verify timestamp (prevent replay attacks > 2 mins)
        if time.time() * 1000 - data.get("ts", 0) > 120000:
             print("❌ Expired 'w' signature.")
             raise HTTPException(status_code=403, detail="Expired CAPTCHA session")
             
        # Log environment info (Fingerprint)
        fp = data.get("fp", {})
        print(f"🛡️ Verified Request: UA={fp.get('ua')}, Screen={fp.get('screen')}, CanvasHash={fp.get('canvas')}")

    print(f"📩 Received code request for: {req.email}, lang: {req.lang}")
    code = f"{random.randint(100000, 999999)}"
    verification_codes[req.email] = {
        "code": code,
        "expiry": time.time() + 600 # 10 mins
    }
    
    if send_verification_code(req.email, code, req.lang):
        return {"message": "Verification code sent."}
    else:
        raise HTTPException(status_code=500, detail="Failed to send email.")

@router.post("/register")
def register(user_data: UserRegister, session: Session = Depends(get_session)):
    # Check code
    record = verification_codes.get(user_data.email)
    if not record or record["code"] != user_data.code or record["expiry"] < time.time():
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
    
    # Check if user exists
    existing = session.exec(select(User).where(User.email == user_data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")
    
    # Decrypt password
    password = decrypt_password(user_data.password)
    if not password:
        raise HTTPException(status_code=400, detail="Invalid encrypted password.")
    
    # Create user
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(password)
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    # Remove code
    if user_data.email in verification_codes:
        del verification_codes[user_data.email]
    
    return {"message": "User registered successfully."}

class PasswordReset(BaseModel):
    email: EmailStr
    code: str
    new_password: str

@router.post("/reset-password")
def reset_password(data: PasswordReset, session: Session = Depends(get_session)):
    # Check code
    record = verification_codes.get(data.email)
    if not record or record["code"] != data.code or record["expiry"] < time.time():
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
    
    # Check if user exists
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Decrypt password
    new_password = decrypt_password(data.new_password)
    if not new_password:
        raise HTTPException(status_code=400, detail="Invalid encrypted password.")
        
    # Update password
    user.hashed_password = get_password_hash(new_password)
    session.add(user)
    session.commit()
    
    # Remove code
    if data.email in verification_codes:
        del verification_codes[data.email]
        
    return {"message": "Password reset successfully."}

@router.post("/login")
def login(login_data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == login_data.email)).first()
    
    # Decrypt password
    password = decrypt_password(login_data.password)
    if not password or not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "id": current_user.id}
