from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List
from jose import jwt, JWTError
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

# --- IMPORTS LOCALES ---
from .database import engine, Base, get_db
from .models import User, Product, SupportTicket, MovementHistory
from .security import get_password_hash, verify_password, create_access_token, SECRET_KEY, ALGORITHM

# Crea las tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory API")

# --- CONFIGURACIÓN CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ==========================================
#        ESQUEMAS PYDANTIC
# ==========================================

class ProductCreate(BaseModel):
    barcode: str
    name: str
    stock: int
    cost_price: float
    sale_price: float

class ProductResponse(ProductCreate):
    id: int
    user_id: int
    class Config:
        from_attributes = True

class TicketCreate(BaseModel):
    user_id: int
    issue_type: str
    message: str

class StockUpdate(BaseModel):
    barcode: str
    user_id: int
    movement_type: str 
    quantity: int 

class UserLoginSchema(BaseModel):
    email: str
    password: str

class UserRegisterSchema(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: str
    address: str

# ==========================================
#         AUTENTICACIÓN
# ==========================================

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# ==========================================
#             ENDPOINTS
# ==========================================

# 1. REGISTRO (Corregido para guardar todos los campos)
@app.post("/register")
def register_user(user_data: UserRegisterSchema, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed_pwd = get_password_hash(user_data.password)
    
    new_user = User(
        email=user_data.email, 
        hashed_password=hashed_pwd,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        address=user_data.address
    )
    db.add(new_user)
    db.commit()
    return {"message": "Usuario creado con éxito"}

# 2. LOGIN
@app.post("/login") 
def login(user_data: UserLoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    access_token = create_access_token(subject=user.email)
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "first_name": user.first_name 
    }

# 3. PERFIL (Obtener datos reales de BDD)
@app.get("/user/me")
def get_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "phone": current_user.phone,
        "address": current_user.address,
        "email": current_user.email
    }

# 4. ACTUALIZAR PERFIL
@app.put("/user/update")
def update_user(user_data: UserRegisterSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.first_name = user_data.first_name
    user.last_name = user_data.last_name
    user.phone = user_data.phone
    user.address = user_data.address
    
    if user.email != user_data.email:
        email_exists = db.query(User).filter(User.email == user_data.email).first()
        if email_exists:
            raise HTTPException(status_code=400, detail="El nuevo email ya está en uso")
        user.email = user_data.email

    if user_data.password:
        user.hashed_password = get_password_hash(user_data.password)

    db.commit()
    return {"message": "Datos actualizados correctamente"}

# 5. PRODUCTOS
@app.get("/products", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Product).filter(Product.user_id == current_user.id).all()

@app.post("/products", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Product).filter(Product.barcode == product.barcode, Product.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un producto")

    new_product = Product(**product.dict(), user_id=current_user.id)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

# 6. STOCK E HISTORIAL
@app.post("/update-stock")
def update_stock(update: StockUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.barcode == update.barcode).first()
    if not product:
        raise HTTPException(status_code=404, detail="No encontrado")

    if update.movement_type == "suma":
        product.stock += update.quantity
    elif update.movement_type == "resta":
        product.stock -= update.quantity
        if product.stock < 0: product.stock = 0
    elif update.movement_type == "set":
        product.stock = update.quantity

    history = MovementHistory(
        product_id=product.id,
        user_id=update.user_id,
        movement_type=update.movement_type,
        quantity_changed=update.quantity,
        final_stock=product.stock
    )
    db.add(history)
    db.commit()
    return {"message": "Stock actualizado"}

# 7. BORRAR CUENTA
@app.delete("/user/delete")
def delete_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return {"message": "Cuenta eliminada"}

# ==========================================
#        DASHBOARD / ESTADÍSTICAS
# ==========================================

@app.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Total de Productos registrados por el usuario
    total_products = db.query(Product).filter(Product.user_id == current_user.id).count()
    
    # 2. Productos con Stock Bajo (Menos de 5 unidades)
    low_stock = db.query(Product).filter(
        Product.user_id == current_user.id, 
        Product.stock < 5
    ).count()
    
    # 3. Valor Total del Inventario (Suma de Stock * Precio Costo)
    # Usamos 'func.sum' para que la base de datos haga el cálculo rápido
    inventory_value = db.query(func.sum(Product.stock * Product.cost_price)).filter(
        Product.user_id == current_user.id
    ).scalar() or 0 # Si es None, devuelve 0

    # 4. Últimos 5 movimientos (Historial reciente)
    # Hacemos un 'join' para obtener el nombre del producto asociado al movimiento
    recent_movements = db.query(MovementHistory).join(Product).filter(
        Product.user_id == current_user.id
    ).order_by(MovementHistory.timestamp.desc()).limit(5).all()

    # Formateamos los datos para enviarlos limpios al Frontend
    movements_data = []
    for mov in recent_movements:
        # Obtenemos el nombre del producto (ya que movement_history solo tiene el ID)
        product_name = db.query(Product.name).filter(Product.id == mov.product_id).scalar()
        
        movements_data.append({
            "product": product_name,
            "type": mov.movement_type,      # "suma", "resta" o "set"
            "quantity": mov.quantity_changed,
            "date": mov.timestamp
        })

    return {
        "total_products": total_products,
        "low_stock": low_stock,
        "inventory_value": inventory_value,
        "recent_movements": movements_data
    }