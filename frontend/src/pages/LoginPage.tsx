import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  
  // Estado para los datos
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: ''
  });

  // NUEVO: Estado para controlar qué campos tienen error
  const [errors, setErrors] = useState<any>({});
  // NUEVO: Estado para mostrar el mensaje global de error
  const [globalError, setGlobalError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    // Si el usuario empieza a escribir en un campo rojo, quitamos el error
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: false });
    }
    // También limpiamos el mensaje global si escribe
    if (globalError) setGlobalError('');
  };

  // --- FUNCIÓN DE VALIDACIÓN MANUAL ---
  const validateForm = () => {
    let newErrors: any = {};
    let isValid = true;

    // 1. Validar Email y Password (siempre obligatorios)
    if (!formData.email.trim()) newErrors.email = true;
    if (!formData.password.trim()) newErrors.password = true;

    // 2. Validar campos extra SOLO si es Registro
    if (!isLogin) {
      if (!formData.first_name.trim()) newErrors.first_name = true;
      if (!formData.last_name.trim()) newErrors.last_name = true;
      if (!formData.phone.trim()) newErrors.phone = true;
      if (!formData.address.trim()) newErrors.address = true;
    }

    // Si hay algún error...
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setGlobalError('Por favor, completa los campos marcados en rojo.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // --- PASO 1: VALIDAR ANTES DE ENVIAR ---
    if (!validateForm()) {
      return; // Si falla, no hacemos el fetch
    }

    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const endpoint = isLogin ? '/login' : '/register';
    
    const bodyData = isLogin 
      ? { email: formData.email, password: formData.password }
      : formData;

    try {
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Error en la solicitud');
      }

      if (isLogin) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('userEmail', formData.email); 
        localStorage.setItem('userId', data.user_id);
        localStorage.setItem('first_name', data.first_name || '');
        if(data.first_name) localStorage.setItem('userName', data.first_name);
        navigate('/dashboard');
      } else {
        alert('¡Registro exitoso! Ahora por favor inicia sesión.');
        setFormData({ email: '', password: '', first_name: '', last_name: '', phone: '', address: '' });
        setIsLogin(true); 
      }

    } catch (error: any) {
      setGlobalError(error.message || 'Error de conexión con el servidor');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        <div className="login-visual">
          <div className="visual-icon">📦</div>
          <h2>Sistema de Gestión</h2>
          <p>
            {isLogin 
              ? 'Bienvenido de nuevo. Gestiona tu inventario de forma eficiente.' 
              : 'Completa tus datos personales para crear tu cuenta de administrador.'}
          </p>
        </div>

        <div className="login-form-section">
          <h1>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h1>
          
          {/* MENSAJE DE ERROR GLOBAL (Aparece si faltan campos o falla el login) */}
          {globalError && (
            <div className="form-error-msg">
               {globalError}
            </div>
          )}
          
          {/* Quitamos 'noValidate' para usar nuestra validación */}
          <form onSubmit={handleSubmit} noValidate>
            
            {!isLogin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <input 
                    type="text" 
                    name="first_name" 
                    placeholder="Nombre" 
                    value={formData.first_name} 
                    onChange={handleChange} 
                    className={errors.first_name ? 'input-error' : ''} // <--- Clase Condicional
                  />
                </div>
                <div className="form-group">
                  <input 
                    type="text" 
                    name="last_name" 
                    placeholder="Apellido" 
                    value={formData.last_name} 
                    onChange={handleChange} 
                    className={errors.last_name ? 'input-error' : ''}
                  />
                </div>
              </div>
            )}
            
            {!isLogin && (
              <>
                 <div className="form-group">
                  <input 
                    type="text" 
                    name="phone" 
                    placeholder="Teléfono / Celular" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    className={errors.phone ? 'input-error' : ''}
                  />
                </div>
                <div className="form-group">
                  <input 
                    type="text" 
                    name="address" 
                    placeholder="Dirección Completa" 
                    value={formData.address} 
                    onChange={handleChange} 
                    className={errors.address ? 'input-error' : ''}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <input 
                type="email" 
                name="email" 
                placeholder="Correo Electrónico" 
                value={formData.email} 
                onChange={handleChange} 
                className={errors.email ? 'input-error' : ''}
              />
            </div>
            
            <div className="form-group">
              <input 
                type="password" 
                name="password" 
                placeholder="Contraseña" 
                value={formData.password} 
                onChange={handleChange} 
                className={errors.password ? 'input-error' : ''}
              />
            </div>

            <button type="submit" className="btn-login">
              {isLogin ? 'Ingresar ➜' : 'Registrarse ✨'}
            </button>
          </form>

          <div className="toggle-text">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({}); // Limpiar errores al cambiar de pestaña
                setGlobalError('');
              }} 
              className="toggle-btn"
            >
              {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;