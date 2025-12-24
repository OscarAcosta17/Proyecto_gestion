import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  // const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // CORRECCIÓN 1: Tipado correcto para inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // CORRECCIÓN 2: Tipado correcto para formularios (FormEvent)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // IMPORTANTE: Cambié el puerto a 8000 porque usas Python
    const backendUrl = 'http://localhost:8000'; 
    const endpoint = isLogin ? '/login' : '/register';
    
    try {
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Error en la solicitud');
      }

      alert(isLogin ? '¡Login exitoso!' : '¡Registro exitoso!');
      // if (isLogin) navigate('/dashboard');

    } catch (error: any) { // CORRECCIÓN 3: 'any' para leer el error
      alert(error.message || 'Error de conexión con el servidor');
      console.error(error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
      <h1>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h1>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
        <input 
          type="email" name="email" placeholder="Email" 
          value={formData.email} onChange={handleChange} required 
          style={{ padding: '8px' }}
        />
        <input 
          type="password" name="password" placeholder="Contraseña" 
          value={formData.password} onChange={handleChange} required 
          style={{ padding: '8px' }}
        />
        <button type="submit" style={{ padding: '10px', cursor: 'pointer' }}>
          {isLogin ? 'Ingresar' : 'Registrarse'}
        </button>
      </form>
      <p style={{ marginTop: '20px' }}>
        <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}>
          {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </p>
    </div>
  );
};

export default LoginPage;