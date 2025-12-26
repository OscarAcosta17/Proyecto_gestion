import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ConfigurationPage.css";

export default function ConfigurationPage() {
  const navigate = useNavigate();
  // CAMBIO 1: Inicia en null para que todo esté cerrado al abrir
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [userData, setUserData] = useState({
    first_name: "", last_name: "", phone: "", address: "", email: "", password: ""
  });

  // Estado para configuraciones locales (Simuladas por ahora, útiles para UI)
  const [systemPrefs, setSystemPrefs] = useState({
    lowStockAlert: 5,
    currency: "CLP"
  });

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
      if (response.ok) alert("✅ Datos actualizados en la base de datos");
      else alert("❌ Error al actualizar");
    } catch (error) {
      alert("Error de conexión");
    }
  };

  if (loading) return <div className="config-main-container"><h1>Cargando datos...</h1></div>;

  return (
    <div className="config-main-container">
      <div className="config-header-box shadow">
        <h1>Configuración de Perfil</h1>
        {/* El CSS se encarga del hover rojo, ver abajo */}
        <button className="btn-volver" onClick={() => navigate("/dashboard")}>Volver</button>
      </div>

      <div className="config-scroll-area">
        
        {/* SECCIÓN 1: DATOS PERSONALES */}
        <div className="config-accordion-item shadow">
          <button className="config-accordion-trigger" onClick={() => setActiveMenu(activeMenu === "user" ? null : "user")}>
            <span>👤 Mis Datos Personales</span>
            <span>{activeMenu === "user" ? "▲" : "▼"}</span>
          </button>
          
          {activeMenu === "user" && (
            <div className="config-accordion-content">
              <form onSubmit={handleUpdate} className="user-form-grid">
                <div className="form-group">
                  <label>Nombre</label>
                  <input className="config-input-field" value={userData.first_name} onChange={e => setUserData({...userData, first_name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input className="config-input-field" value={userData.last_name} onChange={e => setUserData({...userData, last_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input className="config-input-field" value={userData.phone} onChange={e => setUserData({...userData, phone: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input className="config-input-field" value={userData.address} onChange={e => setUserData({...userData, address: e.target.value})} />
                </div>
                <button type="submit" className="btn-guardar" style={{gridColumn: 'span 2'}}>
                  Guardar Cambios
                </button>
              </form>
            </div>
          )}
        </div>

        {/* SECCIÓN 2: PREFERENCIAS DEL SISTEMA (NUEVO Y ÚTIL) */}
        <div className="config-accordion-item shadow">
          <button className="config-accordion-trigger" onClick={() => setActiveMenu(activeMenu === "prefs" ? null : "prefs")}>
            <span>⚙️ Preferencias del Sistema</span>
            <span>{activeMenu === "prefs" ? "▲" : "▼"}</span>
          </button>

          {activeMenu === "prefs" && (
            <div className="config-accordion-content">
              <div className="user-form-grid">
                <div className="form-group">
                  <label>Alerta de Stock Bajo (Unidades)</label>
                  <input 
                    type="number" 
                    className="config-input-field" 
                    value={systemPrefs.lowStockAlert}
                    onChange={e => setSystemPrefs({...systemPrefs, lowStockAlert: parseInt(e.target.value)})}
                  />
                  <small style={{color: '#888'}}>Avisar cuando queden menos productos que esto.</small>
                </div>
                <div className="form-group">
                  <label>Moneda Visual</label>
                  <select 
                    className="config-input-field"
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
          )}
        </div>

        {/* SECCIÓN 3: SEGURIDAD (NUEVO Y ÚTIL) */}
        <div className="config-accordion-item shadow" style={{borderLeft: '4px solid #dc3545'}}>
          <button className="config-accordion-trigger" onClick={() => setActiveMenu(activeMenu === "security" ? null : "security")}>
            <span>🔒 Seguridad y Cuenta</span>
            <span>{activeMenu === "security" ? "▲" : "▼"}</span>
          </button>

          {activeMenu === "security" && (
            <div className="config-accordion-content">
              <div className="form-group" style={{marginBottom: '20px'}}>
                <label>Cambiar Contraseña</label>
                <input 
                  type="password" 
                  className="config-input-field" 
                  placeholder="Escribe nueva contraseña..." 
                  onChange={e => setUserData({...userData, password: e.target.value})}
                />
              </div>
              
              <div style={{borderTop: '1px solid #444', paddingTop: '15px'}}>
                 <p style={{color: '#ff6b6b', fontSize: '0.9rem'}}>Zona de Peligro</p>
                 <button className="btn-guardar" style={{backgroundColor: '#dc3545', width: '100%'}} onClick={() => {
                    if(confirm("¿Estás seguro de eliminar tu cuenta y todos tus datos?")) {
                        // Aquí iría la lógica de borrado
                        alert("Funcionalidad de borrado pendiente de confirmación");
                    }
                 }}>
                   Eliminar Cuenta Permanentemente
                 </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}