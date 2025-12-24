import { useNavigate } from 'react-router-dom';
import '../styles/DashboardPage.css';

const DashboardPage = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token'); 
    navigate('/login'); 
  };

  return (
    <div className="dashboard-container">
      
      {/* HEADER */}
      <header className="dashboard-header">
        <h1>📦 Sistema de Gestión</h1>
        <button onClick={handleLogout} className="btn-logout">
          Cerrar Sesión
        </button>
      </header>

      {/* GRID DE OPCIONES */}
      <div className="dashboard-grid">
        
        {/* TARJETA 1: INVENTARIO */}
        <div className="menu-card">
          <div className="card-icon">📊</div>
          <h3>Inventario</h3>
          <p>Gestión completa de productos, precios, stock y escáner de códigos.</p>
          <button 
            className="btn-card btn-primary" 
            onClick={() => navigate('/inventory')}
          >
            Acceder al Inventario
          </button>
        </div>

        {/* TARJETA 2: SOPORTE */}
        <div className="menu-card">
          <div className="card-icon">🎧</div>
          <h3>Soporte Técnico</h3>
          <p>¿Tienes problemas? Reporta errores o solicita ayuda aquí.</p>
          <button 
            className="btn-card"
            onClick={() => navigate('/support')} // <--- AHORA VA A LA NUEVA PÁGINA
          >
            Contactar Soporte
          </button>
        </div>

        {/* TARJETA 3: CONFIGURACIÓN */}
        <div className="menu-card">
          <div className="card-icon">⚙️</div>
          <h3>Configuración</h3>
          <p>Ajustes generales de la plataforma y preferencias del sistema.</p>
          <button className="btn-card btn-disabled">
            En construcción
          </button>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;