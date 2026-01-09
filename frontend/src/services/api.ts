// frontend/src/services/api.ts

// 1. URL Dinámica: Usa la de Vercel en producción o localhost en tu PC
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// 2. Función genérica para peticiones (Mantenemos tu lógica de Token)
async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  } as HeadersInit;

  // Aseguramos que el endpoint empiece con / para evitar errores de concatenación
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_URL}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error en la petición');
  }

  return response.json();
}

// --- TUS FUNCIONES (Sin modificar nombres ni lógica) ---

export const getProducts = async () => {
  return request('/products');
};

export const createProduct = async (productData: any) => {
  return request('/products', {
    method: 'POST',
    body: JSON.stringify(productData),
  });
};

export const updateStock = async (data: { 
  barcode: string; 
  user_id: number; 
  movement_type: string; 
  quantity: number 
}) => {
  // Ahora usa 'request' para heredar la API_URL correcta y el Token automáticamente
  return request('/update-stock', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const createTicket = async (data: { user_id: number; issue_type: string; message: string }) => {
  return request('/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// ==========================================
//           FUNCIONES DE ADMIN
// ==========================================

export const getAllUsers = async () => {
  return request('/admin/users');
};

export const getAdminStats = async () => {
  return request('/admin/stats');
};

export const getAdminTickets = async () => {
  return request('/admin/tickets');
};

export const closeTicket = async (id: number, message: string) => {
  return request(`/admin/tickets/${id}/close`, {
    method: 'PUT',
    body: JSON.stringify({ response_text: message })
  });
};

export const getMyTickets = async () => {
  return request('/my-tickets');
};

export const createAnnouncement = async (title: string, message: string) => {
  return request('/admin/announce', {
    method: 'POST',
    body: JSON.stringify({ title, message })
  });
};

export const getAnnouncements = async () => {
  return request('/announcements');
};

export const getAllProductsGlobal = async () => {
  return request('/admin/products');
};

export const updateProduct = async (id: number, productData: any) => {
  // Ahora usa 'request' para evitar el error de URL relativa en Vercel
  return request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(productData),
  });
};

// --- FUNCIÓN GEMINI IA ---

interface GeminiRequest {
  analysis_type: 'general' | 'growth' | 'costs' | 'cash';
  context_data: any;
}

export const getGeminiAnalysis = async (payload: GeminiRequest) => {
  // Eliminamos la redeclaración de API_URL aquí dentro para usar la global
  return request('/gemini/analyze', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};