import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SupportPage.css';
import { createTicket } from '../services/api'; // <--- Importamos la función correcta

const SupportPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Controla si mostramos el error del mensaje vacío
  const [showError, setShowError] = useState(false);

  const [formData, setFormData] = useState({
    user_id: 0,
    email: '', 
    issue_type: 'Error del Sistema',
    message: ''
  });

  // Cargar datos del usuario al iniciar
  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    const savedId = localStorage.getItem('userId');
    if (savedEmail && savedId) {
      setFormData(prev => ({ ...prev, email: savedEmail, user_id: Number(savedId) }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- VALIDACIÓN MANUAL ---
    // Si el mensaje está vacío, mostramos error y paramos.
    if (!formData.message.trim()) {
      setShowError(true);
      return; 
    }

    setLoading(true);
    try {
      // --- CORRECCIÓN: Usamos la función del servicio api.ts ---
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
    <div className="support-container">
      <header className="support-header">
        <h1>🎧 Centro de Ayuda</h1>
        <button onClick={() => navigate('/dashboard')} className="btn-back">
          ⬅ Volver
        </button>
      </header>

      <div className="support-card">
        <h2 style={{marginTop: 0, fontSize: '1.2rem', color: 'white'}}>¿En qué podemos ayudarte hoy?</h2>
        <p style={{marginBottom: '25px', color: '#aaa', lineHeight: '1.5'}}>
          Cuéntanos tu inconveniente. Tu mensaje llegará directamente a nuestro equipo técnico.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          
          <div className="form-group">
            <label>¿Qué tipo de problema es?</label>
            <select 
              value={formData.issue_type}
              onChange={e => setFormData({...formData, issue_type: e.target.value})}
            >
              <option>Error del Sistema</option>
              <option>Problema con el Inventario</option>
              <option>Problema con el Escáner</option>
              <option>Tengo una sugerencia</option>
              <option>Otro</option>
            </select>
          </div>

          <div className="form-group">
            <label>Cuéntanos los detalles *</label>
            <textarea 
              placeholder="Escribe aquí lo que sucedió..." 
              value={formData.message}
              onChange={e => {
                setFormData({...formData, message: e.target.value});
                // Si el usuario empieza a escribir, ocultamos el error
                if (showError) setShowError(false);
              }}
              style={{ minHeight: '150px' }}
              // Si hay error, añadimos la clase CSS visual
              className={showError ? 'input-error' : ''}
            />
            
            {/* Mensaje de error condicional */}
            {showError && (
              <div className="error-message">
                  ⚠️ Por favor, detalla tu problema para poder ayudarte.
              </div>
            )}
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Mensaje 📨'}
          </button>

        </form>
      </div>
    </div>
  );
};

export default SupportPage;