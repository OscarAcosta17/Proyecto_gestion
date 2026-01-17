import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Intentamos obtener la URL de Producción (Render/Supabase)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Si NO existe (estamos en Local), construimos la URL usando las variables de Docker
if not SQLALCHEMY_DATABASE_URL:
    print("--- MODO LOCAL DETECTADO: Construyendo URL de Docker ---")
    
    # Leemos las variables del .env (o usamos defaults si no existen)
    db_user = os.getenv("POSTGRES_USER", "postgres")
    db_password = os.getenv("POSTGRES_PASSWORD", "password")
    db_name = os.getenv("POSTGRES_DB", "inventory_db")
    db_host = os.getenv("POSTGRES_HOST", "db") # "db" es el nombre del servicio en docker-compose

    SQLALCHEMY_DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:5432/{db_name}"
    
    print(f"--- Conectando a: postgresql://{db_user}:****@{db_host}:5432/{db_name} ---")

# 3. Parche para Render (el mismo que tenías)
if SQLALCHEMY_DATABASE_URL and SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# ==============================================================================
# 4. CREAR EL MOTOR CON OPTIMIZACIÓN (POOLING) - ¡AQUÍ ESTÁ LA SOLUCIÓN!
# ==============================================================================
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,    # Verifica si la conexión sigue viva antes de usarla (evita errores 500)
    pool_size=20,          # Mantiene 20 conexiones abiertas listas para usar (Login instantáneo)
    max_overflow=30,       # Permite 30 conexiones extra si hay mucho tráfico de golpe
    pool_recycle=1800,     # Recicla (renueva) las conexiones cada 30 min para evitar timeouts
    pool_timeout=30        # Espera máximo 30s por una conexión libre
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()