import { useNavigate } from "react-router-dom";
import "../styles/DashboardPage.css";

const DashboardPage = () => {
  const navigate = useNavigate();
  // Recuperamos el nombre del usuario
  const userName = localStorage.getItem("first_name") || "Admin"; 
  
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      
      {/* 1. HEADER: BIENVENIDA */}
      <header className="dashboard-header">
        <div>
           <h1>Hola, {userName}!</h1>
           <p style={{margin: '5px 0 0 0', color: '#a0a0a0'}}>Bienvenido a tu sistema de gestión.</p>
        </div>
        <button onClick={handleLogout} className="btn-logout">
          Cerrar Sesión
        </button>
      </header>

      {/* 2. GRID DE MENÚ PRINCIPAL (Tarjetas Grandes y Brillantes) */}
      <div className="dashboard-grid">

        {/* TARJETA INVENTARIO (VERDE) */}
        <div className="menu-card" style={{ '--card-color': '#2ecc71' } as React.CSSProperties}>
          <div className="card-icon">📊</div>
          <h3>Inventario</h3>
          <p>Gestión completa de productos, precios, stock y escáner de códigos.</p>
          <button className="btn-card" onClick={() => navigate('/inventory')}>
            Acceder al Inventario
          </button>
        </div>

        {/* TARJETA ESTADÍSTICAS (AZUL) */}
        <div className="menu-card" style={{ '--card-color': '#3498db' } as React.CSSProperties}>
          <div className="card-icon">📈</div>
          <h3>Estadísticas</h3>
          <p>Visualiza gráficos de rendimiento y movimientos de stock.</p>
          <button className="btn-card" onClick={() => navigate('/stats')}>
            Ver Reportes
          </button>
        </div>

        {/* TARJETA CONFIGURACIÓN (NARANJA) */}
        <div className="menu-card" style={{ '--card-color': '#f39c12' } as React.CSSProperties}>
          <div className="card-icon">⚙️</div>
          <h3>Configuración</h3>
          <p>Ajustes de perfil, contraseñas y preferencias del sistema.</p>
          <button className="btn-card" onClick={() => navigate('/configuration')}>
            Ir a Ajustes
          </button>
        </div>

        {/* TARJETA SOPORTE (MORADO) */}
        <div className="menu-card" style={{ '--card-color': '#9b59b6' } as React.CSSProperties}>
          <div className="card-icon">🎧</div>
          <h3>Soporte Técnico</h3>
          <p>¿Tienes problemas? Reporta errores o solicita ayuda aquí.</p>
          <button className="btn-card" onClick={() => navigate('/support')}>
            Contactar Soporte
          </button>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;