from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# Imports de tu proyecto
from .database import engine, Base, get_db
from .models import User
from .security import get_password_hash, verify_password, create_access_token

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory API")

# --- CORS (Para que React entre) ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ESQUEMA DE DATOS (IMPORTANTE) ---
class UserSchema(BaseModel):
    email: str
    password: str

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- RUTAS ---

@app.post("/register")
def register_user(user_data: UserSchema, db: Session = Depends(get_db)):
    # DEBUG: Esto saldrá en tu consola de Docker
    print(f"DEBUG - Datos recibidos: {user_data}")
    print(f"DEBUG - Intentando hashear password de largo: {len(user_data.password)}")

    # Verificar si existe
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Crear usuario (Usamos user_data.password, NO el objeto entero)
    try:
        hashed_pwd = get_password_hash(user_data.password)
    except Exception as e:
        print(f"ERROR AL HASHEAR: {e}")
        raise HTTPException(status_code=500, detail="Error interno al procesar contraseña")

    new_user = User(email=user_data.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "Usuario creado exitosamente", "email": new_user.email}

@app.post("/login")
def login(user_data: UserSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=user.email)
    return {"access_token": access_token, "token_type": "bearer"}