const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Función genérica para peticiones (incluye el Token automáticamente)
async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Error en la petición');
  }

  return response.json();
}

// --- TUS FUNCIONES ---

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
  const response = await fetch(`${API_URL}/update-stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al actualizar stock');
  }
  return await response.json();
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

// 1. Obtener todos los usuarios
export const getAllUsers = async () => {
  return request('/admin/users');
};

// 2. Obtener estadísticas globales (KPIs del Admin)
export const getAdminStats = async () => {
  return request('/admin/stats');
};

// 3. Obtener tickets de soporte
export const getAdminTickets = async () => {
  return request('/admin/tickets');
};

// 4. Resolver un ticket
export const closeTicket = async (id: number, message: string) => {
  return request(`/admin/tickets/${id}/close`, {
    method: 'PUT',
    body: JSON.stringify({ response_text: message }) // Enviamos el JSON
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

// Leer anuncios (Todos)
export const getAnnouncements = async () => {
  return request('/announcements');
};

export const getAllProductsGlobal = async () => {
  return request('/admin/products');
};

// En src/services/api.ts

// Función genérica para editar datos del producto (Precios, Nombre, etc.)
export const updateProduct = async (id: number, productData: any) => {
  // Asegúrate de que la URL coincida con tu backend (puede ser /products/{id} o /products/{barcode})
  const response = await fetch(`${API_URL}/products/${id}`, {
    method: 'PUT', // O 'PATCH' dependiendo de tu backend
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Error al actualizar el producto');
  }

  return await response.json();
};


// En frontend/src/services/api.ts

// Interfaz para la nueva estructura
interface GeminiRequest {
  analysis_type: 'general' | 'growth' | 'costs' | 'cash';
  context_data: any; // Flexible para enviar lo que sea necesario
}

export const getGeminiAnalysis = async (payload: GeminiRequest) => {
  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const response = await fetch(`${API_URL}/api/gemini/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error('Error IA');
  return await response.json();
};