from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- Esquemas para VENTAS ---

# Esto es un solo item del carrito (Producto + Cantidad)
class SaleItemSchema(BaseModel):
    product_id: int
    quantity: int

# Esto es lo que React nos envía al hacer clic en "Pagar"
class SaleCreate(BaseModel):
    items: List[SaleItemSchema]

# Esto es lo que respondemos al Frontend (para mostrar el ticket o confirmación)
class SaleResponse(BaseModel):
    id: int
    date: datetime
    total_amount: int
    
    class Config:
        from_attributes = True # Antes se llamaba orm_mode = True