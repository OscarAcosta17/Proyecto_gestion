import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- CAMBIO PRINCIPAL: OBTENER URL COMPLETA ---
# En Render/Supabase, la variable se llama usualmente "DATABASE_URL"
# Si no existe (ej. en tu PC), intenta usar una local o SQLite por defecto
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# --- PARCHE PARA SUPABASE / RENDER ---
# SQLAlchemy requiere que el protocolo sea "postgresql://", pero
# algunos proveedores entregan "postgres://". Esto lo corrige automáticamente.
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Fallback de seguridad: Si por alguna razón no hay URL (estás probando local sin .env)
if not SQLALCHEMY_DATABASE_URL:
    # Puedes dejar esto vacío o poner una sqlite temporal para que no crashee al importar
    print("ADVERTENCIA: No se encontró DATABASE_URL. Usando SQLite temporal.")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

# Crear el motor
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()