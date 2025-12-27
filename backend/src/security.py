from datetime import datetime, timedelta
from typing import Union, Any
from jose import jwt
from passlib.context import CryptContext

# Configuración segura para evitar errores de bcrypt 4.0
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "tu_clave_super_secreta_cambiala_en_prod"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60*12

def get_password_hash(password: str) -> str:
    # Aseguramos que sea string antes de hashear
    return pwd_context.hash(str(password))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt