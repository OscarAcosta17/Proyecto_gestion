from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# --- TABLA DE USUARIOS ---
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)

    first_name = Column(String, nullable=True) # Nombre
    last_name = Column(String, nullable=True)  # Apellido
    phone = Column(String, nullable=True)      # Teléfono
    address = Column(String, nullable=True)    # Dirección

    # Relación: Un usuario es dueño de muchos productos
    products = relationship("Product", back_populates="owner")

# --- TABLA DE PRODUCTOS (Tu nueva tabla) ---
class Product(Base):
    __tablename__ = "products"

    # 1. ID: Es la llave primaria interna (como sale en tu imagen)
    id = Column(Integer, primary_key=True, index=True)
    
    # 2. Barcode: Tu identificador principal del producto
    barcode = Column(String, index=True)
    
    # 3. Datos del producto (según tu imagen)
    name = Column(String)
    stock = Column(Integer, default=0)
    cost_price = Column(Float, default=0.0)
    sale_price = Column(Float, default=0.0)
    
    # 4. ID DEL USUARIO: Aquí guardamos quién es el dueño (Foreign Key)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Relación inversa para que SQLAlchemy sepa navegar
    owner = relationship("User", back_populates="products")

# --- 3. TICKETS DE SOPORTE ---
class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    issue_type = Column(String)
    message = Column(String)
    status = Column(String, default="pendiente")

# --- 4. HISTORIAL DE MOVIMIENTOS (La que faltaba) ---
class MovementHistory(Base):
    __tablename__ = "movement_history"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    movement_type = Column(String) # "suma", "resta", "set"
    quantity_changed = Column(Integer)
    final_stock = Column(Integer)
    timestamp = Column(DateTime, default=datetime.now)