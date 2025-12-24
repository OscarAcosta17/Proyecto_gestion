import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Obtenemos las variables de entorno (las que pusimos en el .env)
POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
POSTGRES_SERVER = os.getenv("POSTGRES_SERVER", "db")
POSTGRES_DB = os.getenv("POSTGRES_DB", "inventory_db")

# Construimos la URL de conexión: postgresql://usuario:pass@servidor/basedatos
SQLALCHEMY_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_SERVER}/{POSTGRES_DB}"

# Creamos el "motor" de la base de datos
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Creamos la fábrica de sesiones (cada petición tendrá su propia sesión)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para crear los modelos (tablas)
Base = declarative_base()

# Función auxiliar para obtener la sesión en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()