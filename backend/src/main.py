from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from pydantic import BaseModel
from typing import List
from jose import jwt, JWTError
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta # <--- IMPORTANTE: timedelta agregado
from openpyxl import Workbook
from openpyxl.styles import Font
from sqlalchemy import extract
import csv
import io
from fastapi.responses import StreamingResponse

from .database import engine, Base, get_db
from .models import User, Product, SupportTicket, MovementHistory, Sale, SaleItem
from .security import get_password_hash, verify_password, create_access_token, SECRET_KEY, ALGORITHM
from .schemas import SaleCreate, SaleResponse

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Inventory API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# --- SCHEMAS ---
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
#             ENDPOINTS USUARIO/AUTH
# ==========================================
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

@app.get("/user/me")
def get_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "phone": current_user.phone,
        "address": current_user.address,
        "email": current_user.email
    }

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

@app.delete("/user/delete")
def delete_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return {"message": "Cuenta eliminada"}

# ==========================================
#             ENDPOINTS PRODUCTOS
# ==========================================
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

# ==========================================
#             VENTAS (SALES)
# ==========================================

@app.post("/sales", response_model=SaleResponse)
def create_sale(sale_data: SaleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    
    # 1. Crear la venta vacía
    new_sale = Sale(user_id=current_user.id, total_amount=0)
    db.add(new_sale)
    db.commit()
    db.refresh(new_sale)

    total_sale_amount = 0

    try:
        for item in sale_data.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            
            if not product:
                raise HTTPException(status_code=404, detail=f"Producto {item.product_id} no encontrado")
            
            # Validar stock
            if product.stock < item.quantity:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product.name}")

            # Calcular subtotal
            subtotal = product.sale_price * item.quantity 
            total_sale_amount += subtotal

            # Guardar el detalle
            sale_item = SaleItem(
                sale_id=new_sale.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_price=product.sale_price 
            )
            db.add(sale_item)

            # Restar stock
            product.stock -= item.quantity
            
            # Guardar en historial
            history = MovementHistory(
                product_id=product.id,
                movement_type="venta", 
                quantity_changed=item.quantity, 
                user_id=current_user.id,
                final_stock=product.stock 
            )
            db.add(history)

        # Actualizar total
        new_sale.total_amount = total_sale_amount
        db.commit()
        db.refresh(new_sale)
        
        return new_sale

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}") 
        raise e

# ==========================================
#        DASHBOARD / ESTADÍSTICAS
# ==========================================

@app.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_products = db.query(Product).filter(Product.user_id == current_user.id).count()
    
    low_stock = db.query(Product).filter(
        Product.user_id == current_user.id, 
        Product.stock < 5
    ).count()
    
    inventory_value = db.query(func.sum(Product.stock * Product.cost_price)).filter(
        Product.user_id == current_user.id
    ).scalar() or 0

    recent_movements = db.query(MovementHistory).join(Product).filter(
        Product.user_id == current_user.id
    ).order_by(MovementHistory.timestamp.desc()).limit(5).all()

    movements_data = []
    for mov in recent_movements:
        product_name = db.query(Product.name).filter(Product.id == mov.product_id).scalar()
        
        movements_data.append({
            "product": product_name,
            "type": mov.movement_type, 
            "quantity": mov.quantity_changed,
            "date": mov.timestamp
        })

    return {
        "total_products": total_products,
        "low_stock": low_stock,
        "inventory_value": inventory_value,
        "recent_movements": movements_data
    }

@app.get("/sales/stats")
def get_sales_statistics(
    range: str = "recent", 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    now = datetime.now()
    
    # 1. Definir fechas base
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_week = start_of_day - timedelta(days=start_of_day.weekday())

    # 2. KPIs Generales
    sales_today = db.query(func.sum(Sale.total_amount)).filter(
        Sale.user_id == current_user.id,
        Sale.date >= start_of_day
    ).scalar() or 0

    sales_month = db.query(func.sum(Sale.total_amount)).filter(
        Sale.user_id == current_user.id,
        Sale.date >= start_of_month
    ).scalar() or 0

    # Ganancia del MES (Venta - Costo)
    month_profit = db.query(
        func.sum((SaleItem.unit_price - Product.cost_price) * SaleItem.quantity)
    ).join(Product).join(Sale).filter(
        Sale.user_id == current_user.id,
        Sale.date >= start_of_month
    ).scalar() or 0

    # NUEVO: Ganancia TOTAL HISTÓRICA (Sin filtro de fecha)
    total_profit = db.query(
        func.sum((SaleItem.unit_price - Product.cost_price) * SaleItem.quantity)
    ).join(Product).join(Sale).filter(
        Sale.user_id == current_user.id
    ).scalar() or 0

    # 3. Lógica del Historial
    history_query = db.query(Sale).filter(
        Sale.user_id == current_user.id
    ).order_by(Sale.date.desc())

    if range == "daily":
        sales_results = history_query.filter(Sale.date >= start_of_day).all()
    elif range == "weekly":
        sales_results = history_query.filter(Sale.date >= start_of_week).all()
    elif range == "monthly":
        sales_results = history_query.filter(Sale.date >= start_of_month).all()
    else: 
        sales_results = history_query.limit(10).all()

    history = []
    for sale in sales_results:
        item_count = sum(item.quantity for item in sale.items)
        history.append({
            "id": sale.id,
            "date": sale.date,
            "total": sale.total_amount,
            "items_count": item_count
        })

    # 4. Top Productos
    top_products_query = db.query(
        Product.name,
        func.sum(SaleItem.quantity).label("total_sold")
    ).join(SaleItem.product).join(SaleItem.sale).filter(
        Sale.user_id == current_user.id,
        Sale.date >= start_of_month
    ).group_by(Product.name).order_by(desc("total_sold")).limit(5).all()

    top_products = [{"name": t[0], "sold": t[1]} for t in top_products_query]

    return {
        "today_income": sales_today,
        "month_income": sales_month,
        "month_profit": month_profit, 
        "total_profit": total_profit, # <--- Enviamos el nuevo dato
        "sales_history": history,
        "top_products": top_products
    }
# --- NUEVO ENDPOINT: EXPORTAR A EXCEL REAL (.XLSX) ---
@app.get("/sales/export")
def export_sales_excel(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sales = db.query(Sale).filter(Sale.user_id == current_user.id).order_by(Sale.date.desc()).all()

    # 1. Crear un libro de Excel real
    wb = Workbook()
    ws = wb.active
    ws.title = "Reporte de Ventas"

    # 2. Encabezados
    headers = ["ID Venta", "Fecha", "Total", "Productos"]
    ws.append(headers)

    # Estilo: Negrita para los encabezados
    for cell in ws[1]:
        cell.font = Font(bold=True)

    # 3. Llenar filas
    for sale in sales:
        # Formato lista productos: "Catnip (2) + Caja (1)"
        items_list = []
        for item in sale.items:
            items_list.append(f"{item.product.name} ({item.quantity})")
        items_str = " + ".join(items_list)
        
        # Escribir fila
        ws.append([
            sale.id,
            sale.date.strftime("%d/%m/%Y %H:%M:%S"), # Fecha legible
            sale.total_amount,
            items_str
        ])

    # 4. --- MAGIA: AJUSTAR ANCHO DE COLUMNAS ---
    # Ajustamos el ancho para que la fecha (Columna B) no salga con #####
    ws.column_dimensions['A'].width = 10  # ID
    ws.column_dimensions['B'].width = 22  # Fecha (Aquí arreglamos el ###)
    ws.column_dimensions['C'].width = 15  # Total
    ws.column_dimensions['D'].width = 50  # Productos (Bien ancha para que se lea)

    # 5. Guardar en memoria
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    # 6. Retornar archivo Excel
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=reporte_ventas.xlsx"}
    )