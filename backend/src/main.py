from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from jose import jwt, JWTError
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

# --- IMPORTS LOCALES ---
from .database import engine, Base, get_db
# AQUÍ IMPORTAMOS TODOS LOS MODELOS PARA QUE SQLALCHEMY LOS VEA
from .models import User, Product, SupportTicket, MovementHistory
from .security import get_password_hash, verify_password, create_access_token, SECRET_KEY, ALGORITHM

# Esta línea crea las tablas AUTOMÁTICAMENTE si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Inventory API")

# --- CONFIGURACIÓN CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ==========================================
#       ESQUEMAS PYDANTIC (Datos JSON)
# ==========================================

class UserSchema(BaseModel):
    email: str
    password: str

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
    movement_type: str # "suma", "resta", "set"
    quantity: int 

# Esquema Básico para Login (Solo Email y Pass)
class UserLoginSchema(BaseModel):
    email: str
    password: str

# Esquema Extendido para Registro (Incluye los datos nuevos)
class UserRegisterSchema(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: str
    address: str

# ==========================================
#       AUTENTICACIÓN
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
#       ENDPOINTS (RUTAS)
# ==========================================

# 1. Registro
@app.post("/register")
def register_user(user_data: UserSchema, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(email=user_data.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    return {"message": "Usuario creado"}

# 2. Login
@app.post("/login") 
def login(user_data: UserSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    access_token = create_access_token(subject=user.email)
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email
    }

# 3. Obtener Productos
@app.get("/products", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Product).filter(Product.user_id == current_user.id).all()

# 4. Crear Producto
@app.post("/products", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Product).filter(Product.barcode == product.barcode, Product.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un producto con este código")

    new_product = Product(**product.dict(), user_id=current_user.id)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

# 5. Crear Ticket de Soporte
@app.post("/create-ticket")
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    db_ticket = SupportTicket(
        user_id=ticket.user_id,
        issue_type=ticket.issue_type,
        message=ticket.message,
        status="pendiente"
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return {"message": "Ticket creado exitosamente", "ticket_id": db_ticket.id}

# 6. Actualizar Stock (Suma/Resta/Set)
@app.post("/update-stock")
def update_stock(update: StockUpdate, db: Session = Depends(get_db)):
    # Buscamos el producto por código de barras
    product = db.query(Product).filter(Product.barcode == update.barcode).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Lógica matemática
    if update.movement_type == "suma":
        product.stock += update.quantity
    elif update.movement_type == "resta":
        product.stock -= update.quantity
        if product.stock < 0: product.stock = 0
    elif update.movement_type == "set":
        product.stock = update.quantity

    # Guardamos en el historial
    history = MovementHistory(
        product_id=product.id,
        user_id=update.user_id,
        movement_type=update.movement_type,
        quantity_changed=update.quantity,
        final_stock=product.stock
    )
    
    db.add(history)
    db.commit() # Guarda tanto el cambio de stock como el historial
    db.refresh(product)
    
    return {"message": "Stock actualizado", "new_stock": product.stock}

@app.post("/register")
def register_user(user_data: UserRegisterSchema, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed_pwd = get_password_hash(user_data.password)
    
    # Creamos el usuario con TODOS los datos
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
    return {"message": "Usuario creado"}

# 2. Login (Usa UserLoginSchema porque aquí NO enviamos dirección ni nombre)
@app.post("/login") 
def login(user_data: UserLoginSchema, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    access_token = create_access_token(subject=user.email)
    
    # OPCIONAL: Si quieres devolver el nombre al hacer login para mostrarlo en el dashboard
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": user.id,
        "email": user.email,
        "first_name": user.first_name # <--- Dato extra útil
    }