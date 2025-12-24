from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from .database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    barcode = Column(String, unique=True, index=True, nullable=False)
    price = Column(Float, default=0.0)
    stock = Column(Integer, default=0)
    description = Column(String, nullable=True)
    
    # Auditoría: cuándo se creó y actualizó automáticamente
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# ... (tus imports anteriores) ...
# Asegúrate de importar Base, Column, Integer, String, Boolean desde sqlalchemy

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)