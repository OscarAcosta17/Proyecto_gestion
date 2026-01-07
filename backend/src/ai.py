import os
import time
import asyncio
import logging
import random
import re
from typing import Dict, Any, Optional, List

from fastapi import APIRouter
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai")

router = APIRouter(prefix="/api/gemini", tags=["AI"])

api_key = os.getenv("GEMINI_API_KEY")
client: Optional[genai.Client] = None

# Modelos preferidos (optimizados para velocidad y costo)
PREFERRED_MODELS: List[str] = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b", 
    "gemini-2.0-flash-lite",
]

_MODELS_CACHE: List[str] = []
_MODELS_CACHE_TS: float = 0.0
_MODELS_CACHE_TTL = 30 * 60

# --- FUNCIONES DE UTILIDAD (Mantenemos tu lógica robusta) ---
def _normalize_model_id(name: str) -> str:
    return name if name.startswith("models/") else f"models/{name}"

def _supports_generate_content(m: Any) -> bool:
    methods = getattr(m, "supported_generation_methods", None)
    return bool(methods and "generateContent" in methods)

def _refresh_models_cache() -> List[str]:
    global _MODELS_CACHE, _MODELS_CACHE_TS
    if not client: return []
    now = time.time()
    if _MODELS_CACHE and (now - _MODELS_CACHE_TS) < _MODELS_CACHE_TTL: return _MODELS_CACHE
    models = []
    try:
        for m in client.models.list():
            name = getattr(m, "name", None)
            if name and _supports_generate_content(m): models.append(name)
    except Exception:
        models = [_normalize_model_id(x) for x in PREFERRED_MODELS]
    _MODELS_CACHE = models
    _MODELS_CACHE_TS = now
    return models

def _choose_models_to_try() -> List[str]:
    available = set(_refresh_models_cache())
    preferred = [_normalize_model_id(m) for m in PREFERRED_MODELS]
    chosen = [m for m in preferred if m in available]
    return chosen if chosen else preferred

def _extract_retry_seconds(err: Exception) -> float:
    s = str(err)
    m = re.search(r"retryDelay':\s*'(\d+)s'", s)
    if m: return float(m.group(1))
    return 2.0

def _is_rate_limit(err: Exception) -> bool:
    s = str(err)
    return ("429" in s) or ("RESOURCE_EXHAUSTED" in s)

def _is_auth_or_billing(err: Exception) -> bool:
    s = str(err)
    return ("401" in s) or ("403" in s) or ("PERMISSION_DENIED" in s)

if api_key:
    try:
        client = genai.Client(api_key=api_key)
        logger.info("✅ Cliente Gemini configurado")
    except Exception as e:
        logger.error("❌ Error creando cliente: %s", e)
        client = None

class AIRequest(BaseModel):
    analysis_type: str
    context_data: Dict[str, Any]

# --- AQUÍ ESTÁ LA MEJORA CLAVE: PROMPTS OPTIMIZADOS ---
def _build_prompt(tipo: str, data: Dict[str, Any]) -> str:
    
    # 1. ANÁLISIS GENERAL (DASHBOARD)
    if tipo == "general":
        return f"""
        Actúa como un Consultor de Negocios Senior. Analiza estos datos rápidos de hoy:
        - Ventas Hoy: ${data.get('sales_today')}
        - Promedio Diario Esperado: ${data.get('daily_average')}
        - Productos Stock Crítico: {data.get('low_stock')}

        Tu tarea:
        1. Compara hoy con el promedio. ¿Vamos bien o mal?
        2. Si hay stock crítico (>0), esa es tu prioridad número 1. Advierte sobre pérdida de ventas.
        3. Da UN solo consejo accionable para mejorar el cierre del día.
        
        Formato: Respuesta corta (máx 50 palabras), tono motivador pero directo. No uses saludos.
        """

    # 2. PROYECCIÓN (GROWTH): Enfocado en cálculos matemáticos y proyección lineal
    if tipo == "growth":
        income = data.get('month_income', 0)
        profit = data.get('month_profit', 0)
        margin = (profit / income * 100) if income > 0 else 0
        
        return f"""
        Actúa como un Director Financiero (CFO). 
        Datos actuales del mes:
        - Ingresos: ${income}
        - Margen Neto Real: {margin:.1f}%
        - Contexto: {data.get('trend_desc')}

        Tu tarea es calcular y proyectar. Responde ESTRICTAMENTE con este formato Markdown:

        ### 📊 Proyección Matemática
        * **Cierre Estimado:** [Calcula una proyección lineal simple a fin de mes basada en los datos]
        * **Gap:** [Diferencia en $ entre lo actual y la proyección]

        ### 🎯 Estrategia de Crecimiento
        * **Táctica:** [Una acción específica. Ej: "Bundle de productos", "Upselling en caja"]
        * **Impacto:** "Si aumentas el ticket promedio un 10%, tu margen subiría a [Calcula nuevo margen aproximado]%"

        ### 🔍 Diagnóstico de Rentabilidad
        [Una frase sobre si el margen de {margin:.1f}% es saludable o peligroso para retail]

        ### haz una recomendación de como seguir al jefe del negocio, breve pero revelador y esperanzador
        """

    # 3. CALCULADORA DE COSTOS
    if tipo == "costs":
        fixed = data.get("user_fixed_costs", 0)
        income = data.get("month_income", 0)
        return f"""
        Eres un Asesor Financiero rudo pero justo.
        - Costos Fijos: ${fixed}
        - Ventas Actuales: ${income}
        - Margen Bruto estimado: 30%

        Calcula mentalmente el Punto de Equilibrio (Ventas necesarias = Costos / 0.30).
        
        Responde SOLO con este formato:
        **💰 Punto de Equilibrio:** $[Monto calculado]
        **📊 Estado Actual:** [Estás perdiendo plata / Estás ganando / Estás tablas]
        **💡 Consejo:** [Una frase de 10 palabras sobre qué hacer: recortar gastos o vender más]
        """

    # 4. AUDITORÍA DE CAJA
    if tipo == "cash":
        return f"""
        Eres un Auditor Forense. Revisa estos cierres: {data.get('recent_closures')}.
        
        Busca patrones raros (días con $0, saltos injustificados).
        Si todo se ve normal, responde: "✅ Flujos consistentes. Sin anomalías detectadas."
        Si hay algo raro, responde: "⚠️ ALERTA: Revisar cierre del día [Fecha]. Monto sospechoso."
        """

    return "Analiza los datos y da un consejo útil."

@router.post("/analyze")
async def analyze_business(request: AIRequest):
    if not client:
        return {"insight": "Error: IA no configurada."}

    tipo = (request.analysis_type or "").strip().lower()
    data = request.context_data or {}
    prompt = _build_prompt(tipo, data)
    
    # Selección de modelos
    models = _choose_models_to_try()
    
    # Lógica de Retry Robusta (la tuya estaba muy bien, la mantengo casi igual)
    for model_id in models:
        try:
            resp = client.models.generate_content(
                model=model_id, 
                contents=prompt,
                config=genai.types.GenerateContentConfig(
                    temperature=0.7, # Creatividad controlada
                    max_output_tokens=300 # Limitamos la respuesta para ahorrar y ser concisos
                )
            )
            text = getattr(resp, "text", None) or "Sin respuesta."
            return {"insight": text, "model_used": model_id}

        except Exception as e:
            logger.warning(f"Fallo modelo {model_id}: {e}")
            if _is_rate_limit(e):
                continue # Prueba el siguiente modelo rápido
            if _is_auth_or_billing(e):
                return {"insight": "Error de cuenta Gemini (Cuota/Pago)."}
            
            # Pequeño backoff si no es el último modelo
            if model_id != models[-1]:
                await asyncio.sleep(1)

    return {"insight": "El sistema está saturado. Intenta en 1 minuto."}