import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/StatsPage.css"; // Usamos tus estilos existentes

export default function SessionExpiredModal() {
  const { isSessionExpired, login } = useAuth();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false); // Nuevo estado para la animación de éxito

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Si no ha expirado la sesión, no renderizamos nada
  if (!isSessionExpired) return null;

  const handleRelogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", password);

      // Usamos /token que acabamos de crear en el backend
      const res = await fetch(`${API_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (!res.ok) {
        // Intentamos leer el mensaje de error del backend
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Credenciales incorrectas");
      }

      const data = await res.json();
      
      // --- AQUÍ ESTÁ LA MAGIA VISUAL ---
      setLoading(false);      // Dejamos de cargar
      setLoginSuccess(true);  // Mostramos el mensaje de "Bienvenido"

      // Esperamos 1.5 segundos para que el usuario vea el mensaje y luego cerramos
      setTimeout(() => {
        login(data.access_token); // Esto cierra el modal y restaura la app
        setLoginSuccess(false);   // Reseteamos estados por si acaso
        setPassword("");          // Limpiamos la password por seguridad
      }, 1500);

    } catch (err: any) {
      setLoading(false);
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div className="modal-cyber" style={{ maxWidth: '400px', border: loginSuccess ? '1px solid #2ecc71' : '1px solid #ef4444', transition: 'all 0.3s ease' }}>
        
        {/* HEADER: Cambia de color si es éxito o error */}
        <div className="modal-cyber-header" style={{ borderColor: loginSuccess ? '#2ecc71' : '#ef4444' }}>
          <h3 style={{ color: loginSuccess ? '#2ecc71' : '#ef4444' }}>
            {loginSuccess ? "Conexión Restaurada" : "Sesión Expirada"}
          </h3>
        </div>
        
        <div className="modal-cyber-body" style={{ minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          
          {/* VISTA 1: ÉXITO (Bienvenido de vuelta) */}
          {loginSuccess ? (
            <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}></div>
              <h4 style={{ color: '#fff', marginBottom: '5px' }}>¡Bienvenido de vuelta!</h4>
              <p style={{ color: '#ccc', fontSize: '0.9rem' }}>Retomando donde lo dejaste...</p>
              <div className="loading-spinner" style={{ margin: '20px auto', width: '30px', height: '30px', borderTopColor: '#2ecc71' }}></div>
            </div>
          ) : (
            /* VISTA 2: FORMULARIO (Lo normal) */
            <>
              <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '0.9rem' }}>
                Tu sesión ha caducado. Ingresa tus datos para continuar sin perder tu trabajo.
              </p>

              <form onSubmit={handleRelogin} className="cost-form">
                <div className="form-group">
                  <label>Usuario (Email)</label>
                  <input 
                    className="cyber-input" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    autoFocus
                    placeholder="ej: admin@nexus.cl"
                    disabled={loading}
                  />
                </div>
                <div className="form-group" style={{marginTop: '10px'}}>
                  <label>Contraseña</label>
                  <input 
                    type="password" 
                    className="cyber-input" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    disabled={loading}
                  />
                </div>

                {error && <div style={{ color: '#ef4444', marginTop:'10px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}

                <button 
                  type="submit" 
                  className="btn-save" 
                  style={{ 
                    marginTop: '20px', 
                    background: loading ? '#555' : '#ef4444', 
                    border: 'none', 
                    padding: '12px', 
                    color: 'white', 
                    borderRadius: '6px', 
                    cursor: loading ? 'wait' : 'pointer', 
                    fontWeight: 'bold', 
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner" style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }}></span>
                      Verificando...
                    </>
                  ) : (
                    "Restaurar Sesión"
                  )}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
      
      {/* Estilo inline para la animación del spinner si no está en tu CSS global */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-spinner { animation: spin 1s linear infinite; border-radius: 50%; border: 3px solid rgba(255,255,255,0.1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}