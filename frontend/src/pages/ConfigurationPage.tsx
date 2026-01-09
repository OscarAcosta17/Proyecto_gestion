import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ConfigurationPage.css"; // Asegúrate de crear este CSS

// Icono de flecha para volver
const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
);

export default function ConfigurationPage() {
  const navigate = useNavigate();
  // Estado para controlar qué sección está abierta
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [userData, setUserData] = useState({
    first_name: "", last_name: "", phone: "", address: "", email: "", password: ""
  });

  // Preferencias locales
  const [systemPrefs, setSystemPrefs] = useState({
    lowStockAlert: 5,
    currency: "CLP"
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${API_URL}/user/me`, {
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUserData({ ...data, password: "" });
        }
      } catch (error) {
        console.error("Error consultando BDD:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/user/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(userData)
      });
      if (response.ok) alert("✅ Datos actualizados correctamente");
      else alert("❌ Error al actualizar");
    } catch (error) {
      alert("Error de conexión");
    }
  };

  if (loading) return (
    <div className="master-container loading-screen">
        <div className="loading-spinner"></div>
    </div>
  );

  return (
    <div className="master-container">
      {/* FONDO ANIMADO */}
      <div className="ambient-glow glow-top-left"></div>
      <div className="ambient-glow glow-bottom-right"></div>
      <div className="moving-grid-background">
        <div className="grid-plane"></div>
      </div>

      <div className="config-layout">
        
        {/* HEADER */}
        <header className="config-header">
            <button onClick={() => navigate("/dashboard")} className="btn-icon-back" title="Volver al Dashboard">
                <ArrowLeft />
            </button>
            <div className="header-text">
                <h1>Configuración</h1>
                <p>Personaliza tu perfil y las preferencias del sistema.</p>
            </div>
        </header>

        <div className="config-content">
            
            {/* SECCIÓN 1: DATOS PERSONALES */}
            <div className={`config-card ${activeMenu === "user" ? "active" : ""}`}>
                <button className="card-header-btn" onClick={() => setActiveMenu(activeMenu === "user" ? null : "user")}>
                    <div className="header-icon user-icon">👤</div>
                    <div className="header-info">
                        <h3>Mis Datos Personales</h3>
                        <p>Actualiza tu nombre, contacto y dirección.</p>
                    </div>
                    <div className={`arrow-indicator ${activeMenu === "user" ? "rotate" : ""}`}>▼</div>
                </button>
                
                <div className="card-body">
                    <div className="card-body-inner">
                        <form onSubmit={handleUpdate} className="config-form-grid">
                            <div className="form-group">
                                <label>Nombre</label>
                                <input className="cyber-input" value={userData.first_name} onChange={e => setUserData({...userData, first_name: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>Apellido</label>
                                <input className="cyber-input" value={userData.last_name} onChange={e => setUserData({...userData, last_name: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Teléfono</label>
                                <input className="cyber-input" value={userData.phone} onChange={e => setUserData({...userData, phone: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Dirección</label>
                                <input className="cyber-input" value={userData.address} onChange={e => setUserData({...userData, address: e.target.value})} />
                            </div>
                            <div className="form-full">
                                <button type="submit" className="btn-save">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: PREFERENCIAS DEL SISTEMA */}
            <div className={`config-card ${activeMenu === "prefs" ? "active" : ""}`}>
                <button className="card-header-btn" onClick={() => setActiveMenu(activeMenu === "prefs" ? null : "prefs")}>
                    <div className="header-icon prefs-icon">⚙️</div>
                    <div className="header-info">
                        <h3>Preferencias del Sistema</h3>
                        <p>Ajusta alertas de stock y moneda visual.</p>
                    </div>
                    <div className={`arrow-indicator ${activeMenu === "prefs" ? "rotate" : ""}`}>▼</div>
                </button>

                <div className="card-body">
                    <div className="card-body-inner">
                        <div className="config-form-grid">
                            <div className="form-group">
                                <label>Alerta de Stock Bajo (Unidades)</label>
                                <input 
                                    type="number" 
                                    className="cyber-input" 
                                    value={systemPrefs.lowStockAlert}
                                    onChange={e => setSystemPrefs({...systemPrefs, lowStockAlert: parseInt(e.target.value)})}
                                />
                                <small className="helper-text">Te avisaremos cuando un producto tenga menos unidades que esto.</small>
                            </div>
                            <div className="form-group">
                                <label>Moneda Visual</label>
                                <div className="select-wrapper">
                                    <select 
                                        className="cyber-select"
                                        value={systemPrefs.currency}
                                        onChange={e => setSystemPrefs({...systemPrefs, currency: e.target.value})}
                                    >
                                        <option value="CLP">Peso Chileno ($)</option>
                                        <option value="USD">Dólar (USD)</option>
                                        <option value="EUR">Euro (€)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECCIÓN 3: SEGURIDAD (PELIGRO) */}
            <div className={`config-card danger-zone ${activeMenu === "security" ? "active" : ""}`}>
                <button className="card-header-btn" onClick={() => setActiveMenu(activeMenu === "security" ? null : "security")}>
                    <div className="header-icon security-icon">🔒</div>
                    <div className="header-info">
                        <h3>Seguridad y Cuenta</h3>
                        <p>Cambio de contraseña y zona de peligro.</p>
                    </div>
                    <div className={`arrow-indicator ${activeMenu === "security" ? "rotate" : ""}`}>▼</div>
                </button>

                <div className="card-body">
                    <div className="card-body-inner">
                        <div className="config-form-grid">
                            <div className="form-group form-full">
                                <label>Nueva Contraseña</label>
                                <input 
                                    type="password" 
                                    className="cyber-input" 
                                    placeholder="Escribe para cambiar..." 
                                    onChange={e => setUserData({...userData, password: e.target.value})}
                                />
                            </div>
                            
                            <div className="danger-divider"></div>
                            
                            <div className="danger-actions form-full">
                                <div className="danger-text">
                                    <h4>Eliminar Cuenta</h4>
                                    <p>Esta acción es irreversible. Todos tus datos se perderán.</p>
                                </div>
                                <button 
                                    className="btn-delete" 
                                    onClick={() => {
                                        if(confirm("¿Estás 100% seguro? Esta acción no se puede deshacer.")) {
                                            alert("Funcionalidad pendiente de backend");
                                        }
                                    }}
                                >
                                    Eliminar Cuenta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}