import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/DashboardPage.css";
import AboutModal from "../components/AboutModal";

const DashboardPage = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem("first_name") || "Admin"; 
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <AboutModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      {/* HEADER */}
      <header className="dashboard-header">
        <div>
           <h1>Hola, {userName}!</h1>
           <p style={{margin: '5px 0 0 0', color: '#a0a0a0'}}>Bienvenido a tu sistema de gestión.</p>
        </div>

        {/* --- CAMBIO AQUÍ: Contenedor para agrupar los botones --- */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          
          {/* Botón Info con clase nueva */}
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="btn-info"
          >
            Acerca de
          </button>
          
          {/* Botón Salir */}
          <button onClick={handleLogout} className="btn-logout">
            Cerrar Sesión
          </button>

        </div>
      </header>

      {/* GRID DE MENÚ PRINCIPAL */}
      <div className="dashboard-grid">

        {/* INVENTARIO */}
        <div className="menu-card" style={{ '--card-color': '#2ecc71' } as React.CSSProperties}>
          <div className="card-icon">📊</div>
          <h3>Inventario</h3>
          <p>Gestión completa de productos, precios, stock y escáner de códigos.</p>
          <button className="btn-card" onClick={() => navigate('/inventory')}>
            Acceder al Inventario
          </button>
        </div>

        {/* TARJETA PUNTO DE VENTA (NUEVO) */}
        <div className="menu-card" style={{ '--card-color': '#00d2d3' } as React.CSSProperties}>
          <div className="card-icon">💰</div>
          <h3>Punto de Venta</h3>
          <p>Realizar ventas, facturación rápida y descuenta stock automáticamente.</p>
          <button className="btn-card" onClick={() => navigate('/sales')}>
            Ir a Vender
          </button>
        </div>
        
        {/* ESTADÍSTICAS */}
        <div className="menu-card" style={{ '--card-color': '#3498db' } as React.CSSProperties}>
          <div className="card-icon">📈</div>
          <h3>Estadísticas</h3>
          <p>Visualiza gráficos de rendimiento y movimientos de stock.</p>
          <button className="btn-card" onClick={() => navigate('/stats')}>
            Ver Reportes
          </button>
        </div>

        {/* CONFIGURACIÓN */}
        <div className="menu-card" style={{ '--card-color': '#f39c12' } as React.CSSProperties}>
          <div className="card-icon">⚙️</div>
          <h3>Configuración</h3>
          <p>Ajustes de perfil, contraseñas y preferencias del sistema.</p>
          <button className="btn-card" onClick={() => navigate('/configuration')}>
            Ir a Ajustes
          </button>
        </div>

        {/* SOPORTE */}
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