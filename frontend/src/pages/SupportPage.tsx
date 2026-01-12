import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SupportPage.css'; 
import { createTicket } from '../services/api'; 
// 1. AÑADIR IMPORT
import { useAuth } from '../context/AuthContext';

// Icono de flecha simple
const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

const SupportPage = () => {
  document.title = "Soporte | NexusERP";
  const navigate = useNavigate();
  
  // 2. AÑADIR USO DEL HOOK
  const { apiCall } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  const [formData, setFormData] = useState({
    user_id: 0,
    email: '', 
    issue_type: 'Error del Sistema',
    message: ''
  });

  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    const savedId = localStorage.getItem('userId');
    if (savedEmail && savedId) {
      setFormData(prev => ({ ...prev, email: savedEmail, user_id: Number(savedId) }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.message.trim()) {
      setShowError(true);
      return; 
    }

    setLoading(true);
    try {
      // 3. AÑADIR VERIFICACIÓN DE SESIÓN (La Lógica Nueva)
      // Hacemos una llamada ligera para verificar que el token siga vivo.
      // Si falla (401), apiCall activa el Popup Rojo automáticamente.
      const verifySession = await apiCall(`${API_URL}/user/me`);
      
      // Si la sesión expiró (401), detenemos todo aquí para no causar errores en createTicket
      if (verifySession.status === 401) {
          setLoading(false);
          return; 
      }

      // --- TU LÓGICA ORIGINAL INTACTA ---
      await createTicket({
          user_id: formData.user_id,
          issue_type: formData.issue_type,
          message: formData.message
      });
      
      alert('¡Te hemos escuchado! Tu caso ha sido registrado y lo revisaremos pronto.');
      navigate('/dashboard');
      
    } catch (error) {
      console.error(error);
      alert('Hubo un error al enviar el ticket. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="master-container">
      {/* --- FONDO ANIMADO --- */}
      <div className="ambient-glow glow-top-left"></div>
      <div className="ambient-glow glow-bottom-right"></div>
      <div className="moving-grid-background">
        <div className="grid-plane"></div>
      </div>

      <div className="support-layout">
        <div className="cyber-card support-box">
          
          <header className="support-header">
            <button onClick={() => navigate('/dashboard')} className="btn-icon-back" title="Volver">
              <ArrowLeft />
            </button>
            <div className="header-text">
                <h1>Centro de Ayuda</h1>
                <p>Describe tu problema y nuestro equipo lo resolverá.</p>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="support-form" noValidate>
            
            <div className="form-group">
              <label>Tipo de Incidencia</label>
              <div className="select-wrapper">
                <select 
                  value={formData.issue_type}
                  onChange={e => setFormData({...formData, issue_type: e.target.value})}
                  className="cyber-select"
                >
                  <option>Error del Sistema</option>
                  <option>Problema con el Inventario</option>
                  <option>Problema con el Escáner</option>
                  <option>Tengo una sugerencia</option>
                  <option>Otro</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Detalles del problema</label>
              <textarea 
                placeholder="Describe qué sucedió, qué esperabas que pasara, etc..." 
                value={formData.message}
                onChange={e => {
                  setFormData({...formData, message: e.target.value});
                  if (showError) setShowError(false);
                }}
                className={`cyber-textarea ${showError ? 'input-error' : ''}`}
              />
              
              {showError && (
                <div className="error-badge">
                    ⚠️ Por favor, escribe un detalle para poder ayudarte.
                </div>
              )}
            </div>

            <div className="form-actions">
                <button type="button" className="btn-ghost" onClick={() => navigate('/dashboard')}>
                    Cancelar
                </button>
                <button type="submit" className="btn-cyber-submit" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar Ticket'}
                    <span className="btn-glare"></span>
                </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;