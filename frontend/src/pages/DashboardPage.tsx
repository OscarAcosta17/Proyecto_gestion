import React, { useState, useEffect, useRef } from "react"; // 1. Importar useRef
import { useNavigate } from "react-router-dom";
import "../styles/DashboardPage.css";
import AboutModal from "../components/AboutModal";
import { getMyTickets, getAnnouncements } from "../services/api"; 

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem("first_name") || "Usuario"; 
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados Notificaciones
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // 2. REFERENCIA PARA DETECTAR CLICS FUERA
  const notifWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();

    // 3. EVENT LISTENER PARA CERRAR AL CLICKEAR FUERA
    function handleClickOutside(event: MouseEvent) {
      if (notifWrapperRef.current && !notifWrapperRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    }
    // Agregamos el escuchador
    document.addEventListener("mousedown", handleClickOutside);
    
    // Limpieza al desmontar
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadNotifications = async () => {
    try {
        const [tickets, announcements] = await Promise.all([
            getMyTickets(),
            getAnnouncements()
        ]);
        
        const ticketNotifs = tickets
            .filter((t: any) => t.status === 'closed' || t.admin_response)
            .map((t: any) => ({
                unique_id: `ticket-${t.id}`,
                type: 'ticket',
                title: `Ticket #${t.id} Actualizado`,
                message: t.admin_response || 'Caso cerrado.',
                date: t.id
            }));

        const announceNotifs = announcements.map((a: any) => ({
            unique_id: `announce-${a.id}`,
            type: 'announcement',
            title: `📢 ${a.title}`,
            message: a.message,
            date: a.id + 100000 
        }));

        const allNotifs = [...announceNotifs, ...ticketNotifs]
            .sort((a, b) => b.date - a.date);
            
        setNotifications(allNotifs);
        
        const lastSeenId = localStorage.getItem('lastSeenNotificationId');
        if (allNotifs.length > 0) {
            const newestId = allNotifs[0].unique_id;
            if (newestId !== lastSeenId) {
                setHasUnread(true);
            }
        }
    } catch (error) {
        console.error("Error cargando notificaciones");
    }
  };

  const toggleNotifications = () => {
    const isOpen = !showNotifs;
    setShowNotifs(isOpen);

    if (isOpen && notifications.length > 0) {
        setHasUnread(false);
        localStorage.setItem('lastSeenNotificationId', notifications[0].unique_id);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <AboutModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      <header className="dashboard-header">
        <div>
           <h1>Hola, {userName}!</h1>
           <p style={{margin: '5px 0 0 0', color: '#a0a0a0'}}>Bienvenido a tu sistema de gestión.</p>
        </div>

        <div className="header-actions">
          
          {/* 4. ASIGNAMOS LA REF AL WRAPPER */}
          <div 
            className="notification-wrapper" 
            style={{position:'relative'}}
            ref={notifWrapperRef}
          >
              <button className="btn-bell" onClick={toggleNotifications} title="Notificaciones">
                  <BellIcon />
                  {hasUnread && <span className="notification-dot"></span>}
              </button>

              {showNotifs && (
                  <div className="notification-popup">
                      <div className="notif-header">
                          <h4>Notificaciones</h4>
                      </div>
                      <div className="notif-list">
                          {notifications.length === 0 ? (
                              <div className="notif-empty">No tienes notificaciones nuevas.</div>
                          ) : (
                              notifications.map((notif: any) => (
                                  <div key={notif.unique_id} className="notif-item">
                                      <div 
                                        className="notif-title"
                                        style={{
                                            color: notif.type === 'announcement' ? '#ffea00' : '#00e676'
                                        }}
                                      >
                                          {notif.title}
                                      </div>
                                      <div className="notif-response">
                                          "{notif.message}"
                                      </div>
                                      <div className="notif-date">
                                         {notif.type === 'announcement' ? 'Aviso General' : 'Soporte Técnico'}
                                      </div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              )}
          </div>

          <button onClick={() => setIsModalOpen(true)} className="btn-info">Acerca de</button>
          <button onClick={handleLogout} className="btn-logout">Cerrar Sesión</button>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="menu-card" style={{ '--card-color': '#2ecc71' } as React.CSSProperties}>
          <div className="card-icon">📊</div>
          <h3>Inventario</h3>
          <p>Gestión completa de productos, precios, stock y escáner de códigos.</p>
          <button className="btn-card" onClick={() => navigate('/inventory')}>Acceder al Inventario</button>
        </div>

        <div className="menu-card" style={{ '--card-color': '#00d2d3' } as React.CSSProperties}>
          <div className="card-icon">💰</div>
          <h3>Punto de Venta</h3>
          <p>Realizar ventas, facturación rápida y descuenta stock automáticamente.</p>
          <button className="btn-card" onClick={() => navigate('/sales')}>Ir a Vender</button>
        </div>
        
        <div className="menu-card" style={{ '--card-color': '#3498db' } as React.CSSProperties}>
          <div className="card-icon">📈</div>
          <h3>Estadísticas</h3>
          <p>Visualiza gráficos de rendimiento y movimientos de stock.</p>
          <button className="btn-card" onClick={() => navigate('/stats')}>Ver Reportes</button>
        </div>

        <div className="menu-card" style={{ '--card-color': '#f39c12' } as React.CSSProperties}>
          <div className="card-icon">⚙️</div>
          <h3>Configuración</h3>
          <p>Ajustes de perfil, contraseñas y preferencias del sistema.</p>
          <button className="btn-card" onClick={() => navigate('/configuration')}>Ir a Ajustes</button>
        </div>

        <div className="menu-card" style={{ '--card-color': '#9b59b6' } as React.CSSProperties}>
          <div className="card-icon">🎧</div>
          <h3>Soporte Técnico</h3>
          <p>¿Tienes problemas? Reporta errores o solicita ayuda aquí.</p>
          <button className="btn-card" onClick={() => navigate('/support')}>Contactar Soporte</button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;