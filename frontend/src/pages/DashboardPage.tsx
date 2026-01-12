import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/DashboardPage.css"; // Asegúrate de crear/actualizar este archivo
import AboutModal from "../components/AboutModal";
import { getMyTickets, getAnnouncements } from "../services/api";

// Iconos SVG simples
const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
);
const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);

const DashboardPage = () => {
    document.title = "Menú | NexusERP";
  const navigate = useNavigate();
  const userName = localStorage.getItem("first_name") || "Usuario"; 
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados Notificaciones
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const notifWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    function handleClickOutside(event: MouseEvent) {
      if (notifWrapperRef.current && !notifWrapperRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
        const [tickets, announcements] = await Promise.all([getMyTickets(), getAnnouncements()]);
        
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

        const allNotifs = [...announceNotifs, ...ticketNotifs].sort((a, b) => b.date - a.date);
        setNotifications(allNotifs);
        
        const lastSeenId = localStorage.getItem('lastSeenNotificationId');
        if (allNotifs.length > 0 && allNotifs[0].unique_id !== lastSeenId) {
            setHasUnread(true);
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
    navigate("/"); // Asumiendo que el login está en la raíz o /login
  };

  return (
    <div className="master-container">
      {/* FONDO ANIMADO Y ORBES */}
      <div className="ambient-glow glow-top-left"></div>
      <div className="ambient-glow glow-bottom-right"></div>
      <div className="moving-grid-background">
        <div className="grid-plane"></div>
      </div>

      <AboutModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      {/* NAVBAR SUPERIOR */}
      <nav className="glass-navbar dashboard-nav">
        <div className="nav-brand">Nexus<span className="text-highlight">ERP</span></div>
        
        <div className="nav-actions">
            {/* NOTIFICACIONES */}
            <div className="notification-wrapper" ref={notifWrapperRef}>
                <button className={`btn-icon ${hasUnread ? 'has-unread' : ''}`} onClick={toggleNotifications}>
                    <BellIcon />
                    {hasUnread && <span className="notification-dot"></span>}
                </button>

                {showNotifs && (
                    <div className="notification-popup cyber-popup">
                        <div className="popup-header">
                            <h4>Centro de Novedades</h4>
                        </div>
                        <div className="popup-body">
                            {notifications.length === 0 ? (
                                <div className="notif-empty">Todo está tranquilo por aquí.</div>
                            ) : (
                                notifications.map((notif: any) => (
                                    <div key={notif.unique_id} className={`notif-item ${notif.type}`}>
                                        <div className="notif-icon">{notif.type === 'announcement' ? '📢' : '🎫'}</div>
                                        <div className="notif-content">
                                            <h5>{notif.title}</h5>
                                            <p>{notif.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="user-separator"></div>

            <button onClick={() => setIsModalOpen(true)} className="btn-ghost">Ayuda</button>
            <button onClick={handleLogout} className="btn-logout-icon" title="Cerrar Sesión">
                <LogoutIcon />
            </button>
        </div>
      </nav>

      {/* CONTENIDO PRINCIPAL */}
      <div className="dashboard-content">
        <header className="welcome-header">
            <h1>Hola, <span className="text-gradient">{userName}</span></h1>
            <p>¿Qué gestión realizaremos hoy?</p>
        </header>

        <div className="dashboard-grid">
            {/* TARJETA INVENTARIO */}
            <div className="bento-card menu-card" onClick={() => navigate('/inventory')} style={{ '--hover-color': '#2ecc71' } as React.CSSProperties}>
                <div className="card-bg-icon">📦</div>
                <div className="card-content">
                    <div className="icon-badge green">📊</div>
                    <h3>Inventario</h3>
                    <p>Gestión de productos, stock y escáner.</p>
                </div>
                <div className="card-arrow">→</div>
            </div>

            {/* TARJETA VENTAS */}
            <div className="bento-card menu-card" onClick={() => navigate('/sales')} style={{ '--hover-color': '#00d2d3' } as React.CSSProperties}>
                <div className="card-bg-icon">💰</div>
                <div className="card-content">
                    <div className="icon-badge cyan">💰</div>
                    <h3>Punto de Venta</h3>
                    <p>Facturación rápida y control de caja.</p>
                </div>
                <div className="card-arrow">→</div>
            </div>

            {/* TARJETA ESTADISTICAS */}
            <div className="bento-card menu-card" onClick={() => navigate('/stats')} style={{ '--hover-color': '#3498db' } as React.CSSProperties}>
                <div className="card-bg-icon">📈</div>
                <div className="card-content">
                    <div className="icon-badge blue">📈</div>
                    <h3>Estadísticas</h3>
                    <p>Reportes de rendimiento y ganancias.</p>
                </div>
                <div className="card-arrow">→</div>
            </div>

            {/* TARJETA CONFIGURACION */}
            <div className="bento-card menu-card" onClick={() => navigate('/configuration')} style={{ '--hover-color': '#f39c12' } as React.CSSProperties}>
                <div className="card-bg-icon">⚙️</div>
                <div className="card-content">
                    <div className="icon-badge orange">⚙️</div>
                    <h3>Configuración</h3>
                    <p>Perfil, usuarios y preferencias.</p>
                </div>
                <div className="card-arrow">→</div>
            </div>

            {/* TARJETA SOPORTE (ANCHEA 2 COLUMNAS SI HAY ESPACIO) */}
            <div className="bento-card menu-card wide" onClick={() => navigate('/support')} style={{ '--hover-color': '#9b59b6' } as React.CSSProperties}>
                <div className="card-bg-icon">🎧</div>
                <div className="card-content">
                    <div className="icon-badge purple">🎧</div>
                    <h3>Soporte Técnico</h3>
                    <p>¿Problemas? Contacta a nuestros ingenieros directamente.</p>
                </div>
                <div className="card-arrow">→</div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;