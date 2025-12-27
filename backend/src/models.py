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
    products = relationship("Product", back_populates="owner")
    sales = relationship("Sale", back_populates="user")

# --- TABLA DE PRODUCTOS (Tu nueva tabla) ---
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    barcode = Column(String, index=True)
    name = Column(String)
    stock = Column(Integer, default=0)
    cost_price = Column(Float, default=0.0)
    sale_price = Column(Float, default=0.0)
    user_id = Column(Integer, ForeignKey("users.id")) #fk
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
    
    movement_type = Column(String) 
    quantity_changed = Column(Integer)
    final_stock = Column(Integer)
    timestamp = Column(DateTime, default=datetime.now)

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.now)
    total_amount = Column(Integer) # Total de la venta en dinero
    
    # Relación con el usuario que hizo la venta (Vendedor)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="sales")

    # Una venta tiene muchos items
    items = relationship("SaleItem", back_populates="sale")

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    
    quantity = Column(Integer)      # Cuántos se llevó
    unit_price = Column(Integer)    # A qué precio se vendió en ese momento
    
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")