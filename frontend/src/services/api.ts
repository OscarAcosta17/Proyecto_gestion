import axios from 'axios';

// Creamos una instancia de Axios con la URL base del Backend
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded', // FastAPI espera form-data para el login
  },
});

export default api;