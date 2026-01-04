import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css';
import AboutModal from '../components/AboutModal'; // <--- 1. IMPORTAR
import infoIcon from '../assets/image.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  
  // --- 2. ESTADO PARA EL POPUP ---
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Estado para los datos del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: ''
  });

  const [errors, setErrors] = useState<any>({});
  const [globalError, setGlobalError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: false });
    }
    if (globalError) setGlobalError('');
  };

  const validateForm = () => {
    let newErrors: any = {};
    let isValid = true;

    if (!formData.email.trim()) newErrors.email = true;
    if (!formData.password.trim()) newErrors.password = true;

    if (!isLogin) {
      if (!formData.first_name.trim()) newErrors.first_name = true;
      if (!formData.last_name.trim()) newErrors.last_name = true;
      if (!formData.phone.trim()) newErrors.phone = true;
      if (!formData.address.trim()) newErrors.address = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setGlobalError('Por favor, completa los campos marcados en rojo.');
      isValid = false;
    }
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;

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
        localStorage.setItem('isAdmin', String(data.is_admin));
        if (data.is_admin) {
            navigate('/admin'); // <--- A la Baticueva 🦇
        } else {
            navigate('/dashboard'); // <--- Al trabajo normal 👷
        }
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
      
      {/* --- 3. COMPONENTE MODAL --- */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      <div className="login-card">
        
        {/* LADO IZQUIERDO (VISUAL) */}
        <div className="login-visual">
          
          {/* --- 4. BOTÓN MINI INFO (EN LA ESQUINA) --- */}
          <button 
            className="visual-info-btn" 
            onClick={() => setIsAboutOpen(true)}
            title="Acerca del proyecto"
          >
            <img src={infoIcon} alt="Info" className="btn-icon-img" />
          </button>

          <div className="visual-icon">📦</div>
          <h2>Sistema de Gestión</h2>
          <p>
            {isLogin 
              ? 'Bienvenido de nuevo. Gestiona tu inventario de forma eficiente.' 
              : 'Completa tus datos personales para crear tu cuenta de administrador.'}
          </p>
        </div>

        {/* LADO DERECHO (FORMULARIO) */}
        <div className="login-form-section">
          <h1>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h1>
          
          {globalError && (
            <div className="form-error-msg">
               {globalError}
            </div>
          )}
          
          <form onSubmit={handleSubmit} noValidate>
            
            {!isLogin && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <input 
                    type="text" name="first_name" placeholder="Nombre" 
                    value={formData.first_name} onChange={handleChange} 
                    className={errors.first_name ? 'input-error' : ''} 
                  />
                </div>
                <div className="form-group">
                  <input 
                    type="text" name="last_name" placeholder="Apellido" 
                    value={formData.last_name} onChange={handleChange} 
                    className={errors.last_name ? 'input-error' : ''}
                  />
                </div>
              </div>
            )}
            
            {!isLogin && (
              <>
                 <div className="form-group">
                  <input 
                    type="text" name="phone" placeholder="Teléfono / Celular" 
                    value={formData.phone} onChange={handleChange} 
                    className={errors.phone ? 'input-error' : ''}
                  />
                </div>
                <div className="form-group">
                  <input 
                    type="text" name="address" placeholder="Dirección Completa" 
                    value={formData.address} onChange={handleChange} 
                    className={errors.address ? 'input-error' : ''}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <input 
                type="email" name="email" placeholder="Correo Electrónico" 
                value={formData.email} onChange={handleChange} 
                className={errors.email ? 'input-error' : ''}
              />
            </div>
            
            <div className="form-group">
              <input 
                type="password" name="password" placeholder="Contraseña" 
                value={formData.password} onChange={handleChange} 
                className={errors.password ? 'input-error' : ''}
              />
            </div>

            <button type="submit" className="btn-login">
              {isLogin ? 'Ingresar' : 'Registrarse'}
            </button>
          </form>

          <div className="toggle-text">
            {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
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