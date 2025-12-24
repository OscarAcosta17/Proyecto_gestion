const API_URL = "http://localhost:8000"; 

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