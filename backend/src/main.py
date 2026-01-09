from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, not_
from pydantic import BaseModel
from typing import List, Optional  # <--- CORRECCIÓN 1: Agregado Optional
from jose import jwt, JWTError
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta 
from openpyxl import Workbook
from openpyxl.styles import Font
from sqlalchemy import extract
import csv
import io
from fastapi.responses import StreamingResponse
from .ai import router as ai_router
import models 
from database import engine, Base, get_db
from models import User, Product, SupportTicket, MovementHistory, Sale, SaleItem, GlobalMessage
from security import get_password_hash, verify_password, create_access_token, SECRET_KEY, ALGORITHM
from schemas import SaleCreate, SaleResponse

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Inventory API")
app.include_router(ai_router)

origins = [
    "http://localhost:5173", # Para desarrollo local
    "https://tu-proyecto-en.vercel.app", # <--- Aquí pondrás tu URL de Vercel cuando la tengas
    "*" # (TEMPORAL: Pon esto mientras configuras para que no te falle nada)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Usar la lista de arriba
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

# --- CORRECCIÓN 3: Schema para actualizar precios ---
class ProductUpdate(BaseModel):
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    name: Optional[str] = None

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

class TicketResolveSchema(BaseModel):
    response_text: str

class AnnouncementCreate(BaseModel):
    title: str
    message: str

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

def get_current_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Se requieren privilegios de administrador"
        )
    return current_user

# ==========================================
#         ENDPOINTS DE ADMINISTRADOR
# ==========================================

@app.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    total_users = db.query(User).count()
    total_sales = db.query(Sale).count()
    total_products = db.query(Product).count()
    total_revenue = db.query(func.sum(Sale.total_amount)).scalar() or 0
    
    return {
        "total_users": total_users,
        "total_sales": total_sales,
        "total_products": total_products,
        "platform_revenue": total_revenue
    }

@app.get("/admin/users")
def get_all_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    users = db.query(User).all()
    return [
        {
            "id": u.id, 
            "email": u.email, 
            "first_name": u.first_name,
            "last_name": u.last_name, 
            "phone": u.phone,
            "is_admin": u.is_admin,
            "is_active": True # Pendiente implementar campo is_active en DB
        } 
        for u in users
    ]

# --- CORRECCIÓN 4: Endpoint faltante para el Admin Dashboard (Inventario Global) ---
@app.get("/admin/products")
def get_all_products_global(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    products = db.query(Product).all()
    data = []
    for p in products:
        owner_name = f"{p.owner.first_name} {p.owner.last_name}" if p.owner else "Desconocido"
        data.append({
            "id": p.id,
            "barcode": p.barcode,
            "name": p.name,
            "stock": p.stock,
            "owner": owner_name
        })
    return data

@app.get("/admin/tickets")
def get_all_tickets(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    tickets = db.query(SupportTicket).all()
    data = []
    for t in tickets:
        user_email = t.user.email if t.user else "Usuario eliminado"
        data.append({
            "id": t.id,
            "user": user_email,
            "issue": t.issue_type,
            "message": t.message,
            "status": t.status,
            "admin_response": t.admin_response
        })
    return data

@app.put("/admin/tickets/{ticket_id}/close")
def close_ticket(
    ticket_id: int, 
    resolve_data: TicketResolveSchema, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    ticket = db.query(SupportTicket).filter(SupportTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    
    ticket.status = "closed"
    ticket.admin_response = resolve_data.response_text
    db.commit()
    return {"message": "Ticket cerrado y respuesta guardada"}

@app.post("/admin/announce")
def create_announcement(data: AnnouncementCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    new_msg = GlobalMessage(title=data.title, message=data.message)
    db.add(new_msg)
    db.commit()
    return {"message": "Anuncio global enviado"}

# ==========================================
#            ENDPOINTS USUARIO/AUTH
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
        "first_name": user.first_name,
        "is_admin": user.is_admin
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
#            ENDPOINTS PRODUCTOS
# ==========================================

@app.get("/products", response_model=List[ProductResponse])
def get_products(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Product).filter(Product.user_id == current_user.id).all()

@app.post("/products", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 1. Verificar si ya existe
    existing = db.query(Product).filter(Product.barcode == product.barcode, Product.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un producto con este código")

    # 2. Crear el Producto
    new_product = Product(**product.dict(), user_id=current_user.id)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    # 3. SI HAY STOCK INICIAL, GUARDAR EN HISTORIAL
    if new_product.stock > 0:
        initial_movement = MovementHistory(
            product_id=new_product.id,
            user_id=current_user.id,
            movement_type="suma", 
            quantity_changed=new_product.stock,
            final_stock=new_product.stock
        )
        db.add(initial_movement)
        db.commit()

    return new_product

# --- CORRECCIÓN 5: Endpoint para modificar precios/nombre ---
@app.put("/products/{product_id}")
def update_product(product_id: int, product_update: ProductUpdate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if product_update.cost_price is not None:
        db_product.cost_price = product_update.cost_price
    if product_update.sale_price is not None:
        db_product.sale_price = product_update.sale_price
    if product_update.name is not None:
        db_product.name = product_update.name

    db.commit()
    db.refresh(db_product)
    
    return db_product

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
#              VENTAS (SALES)
# ==========================================

@app.post("/sales", response_model=SaleResponse)
def create_sale(sale_data: SaleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    
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
            
            if product.stock < item.quantity:
                raise HTTPException(status_code=400, detail=f"Stock insuficiente para {product.name}")

            subtotal = product.sale_price * item.quantity 
            total_sale_amount += subtotal

            sale_item = SaleItem(
                sale_id=new_sale.id,
                product_id=product.id,
                quantity=item.quantity,
                unit_price=product.sale_price,
                cost_price=product.cost_price
            )
            db.add(sale_item)

            product.stock -= item.quantity
            
            history = MovementHistory(
                product_id=product.id,
                movement_type="venta", 
                quantity_changed=item.quantity, 
                user_id=current_user.id,
                final_stock=product.stock 
            )
            db.add(history)

        new_sale.total_amount = total_sale_amount
        db.commit()
        db.refresh(new_sale)
        
        return new_sale

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}") 
        raise e

# ==========================================
#          DASHBOARD / ESTADÍSTICAS
# ==========================================

# 1. ESTADÍSTICAS DE INVENTARIO (ACTUALIZADO: ZOMBIES + VALORIZACION)
@app.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Totales Básicos
    total_products = db.query(Product).filter(Product.user_id == current_user.id).count()
    
    low_stock = db.query(Product).filter(
        Product.user_id == current_user.id, 
        Product.stock < 5
    ).count()
    
    # OPCION X: Valorización Bodega (Costo Total)
    inventory_value = db.query(func.sum(Product.stock * Product.cost_price)).filter(
        Product.user_id == current_user.id
    ).scalar() or 0

    # OPCION Y: Productos "Zombies" (Stock > 0 pero sin ventas en 30 días)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    # Subquery: IDs de productos vendidos en los últimos 30 días
    sold_product_ids = db.query(SaleItem.product_id).join(Sale).filter(
        Sale.user_id == current_user.id,
        Sale.date >= thirty_days_ago
    ).distinct()

    # Productos que tienen stock, NO están en la lista de vendidos y pertenecen al usuario
    zombie_products = db.query(Product.name, Product.stock).filter(
        Product.user_id == current_user.id,
        Product.stock > 0,
        Product.id.notin_(sold_product_ids)
    ).limit(5).all()

    zombies_list = [{"name": z[0], "stock": z[1]} for z in zombie_products]

    # Movimientos Recientes
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
        "recent_movements": movements_data,
        "zombie_products": zombies_list # Nuevo Campo
    }

# 2. ESTADÍSTICAS DE VENTAS (ACTUALIZADO: KPI EFICIENCIA + PAGOS)
@app.get("/sales/stats")
def get_sales_statistics(
    range: str = "recent", 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    now = datetime.now()
    
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_week = start_of_day - timedelta(days=start_of_day.weekday())

    sales_today = db.query(func.sum(Sale.total_amount)).filter(
        Sale.user_id == current_user.id,
        Sale.date >= start_of_day
    ).scalar() or 0

    sales_month = db.query(func.sum(Sale.total_amount)).filter(
        Sale.user_id == current_user.id,
        Sale.date >= start_of_month
    ).scalar() or 0

    month_profit = db.query(
        func.sum((SaleItem.unit_price - func.coalesce(SaleItem.cost_price, Product.cost_price)) * SaleItem.quantity)
    ).join(Product).join(Sale).filter(
        Sale.user_id == current_user.id,
        Sale.date >= start_of_month
    ).scalar() or 0

    total_profit = db.query(
        func.sum((SaleItem.unit_price - func.coalesce(SaleItem.cost_price, Product.cost_price)) * SaleItem.quantity)
    ).join(Product).join(Sale).filter(
        Sale.user_id == current_user.id
    ).scalar() or 0

    # KPIs EFICIENCIA
    total_transactions = db.query(Sale).filter(
        Sale.user_id == current_user.id, Sale.date >= start_of_month
    ).count()

    total_items_sold = db.query(func.sum(SaleItem.quantity)).join(Sale).filter(
        Sale.user_id == current_user.id, Sale.date >= start_of_month
    ).scalar() or 0

    # ITEM 1: KPIs
    items_per_basket = round(total_items_sold / total_transactions, 1) if total_transactions > 0 else 0
    margin_percent = round((month_profit / sales_month * 100), 1) if sales_month > 0 else 0
    
    # ITEM 2: Placeholder para Métodos de Pago (Espacio reservado)
    payment_methods = {
        "efectivo": 0,
        "debito": 0
    }

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
        "total_profit": total_profit,
        "sales_history": history,
        "top_products": top_products,
        # NUEVOS CAMPOS AGREGADOS
        "items_per_basket": items_per_basket,
        "margin_percent": margin_percent,
        "payment_methods": payment_methods
    }

@app.get("/sales/export")
def export_sales_excel(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sales = db.query(Sale).filter(Sale.user_id == current_user.id).order_by(Sale.date.desc()).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Reporte de Ventas"

    headers = ["ID Venta", "Fecha", "Total", "Productos"]
    ws.append(headers)

    for cell in ws[1]:
        cell.font = Font(bold=True)

    for sale in sales:
        items_list = []
        for item in sale.items:
            items_list.append(f"{item.product.name} ({item.quantity})")
        items_str = " + ".join(items_list)
        
        ws.append([
            sale.id,
            sale.date.strftime("%d/%m/%Y %H:%M:%S"), 
            sale.total_amount,
            items_str
        ])

    ws.column_dimensions['A'].width = 10 
    ws.column_dimensions['B'].width = 22 
    ws.column_dimensions['C'].width = 15 
    ws.column_dimensions['D'].width = 50 

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=reporte_ventas.xlsx"}
    )

@app.post("/tickets")
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == ticket.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    new_ticket = SupportTicket(
        user_id=ticket.user_id,
        issue_type=ticket.issue_type,
        message=ticket.message,
        status="open" 
    )
    db.add(new_ticket)
    db.commit()
    return {"message": "Ticket creado exitosamente"}

@app.get("/my-tickets")
def get_my_tickets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(SupportTicket).filter(SupportTicket.user_id == current_user.id).order_by(SupportTicket.id.desc()).all()

@app.get("/announcements")
def get_announcements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(GlobalMessage).order_by(GlobalMessage.created_at.desc()).limit(5).all()