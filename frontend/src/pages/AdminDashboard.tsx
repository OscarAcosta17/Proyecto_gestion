import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
    getAllUsers, 
    getAdminTickets, 
    closeTicket, 
    getAdminStats, 
    createAnnouncement, 
    getAllProductsGlobal,
    getAnnouncements // <--- 1. IMPORTAR ESTO
} from "../services/api";
import "../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // 2. AGREGAMOS 'announcements' A LAS PESTAÑAS
  const [activeTab, setActiveTab] = useState<'tickets' | 'users' | 'products' | 'announcements'>('tickets'); 

  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]); // <--- 3. NUEVO ESTADO
  
  const [stats, setStats] = useState({ total_users: 0, total_sales: 0, total_products: 0, platform_revenue: 0 });
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [ticketFilter, setTicketFilter] = useState<'open' | 'closed' | 'all'>('open'); 

  // Modales
  const [modalTicket, setModalTicket] = useState<any>(null);
  const [responseMsg, setResponseMsg] = useState("");
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [announceData, setAnnounceData] = useState({ title: "", message: "" });

  useEffect(() => {
    if (localStorage.getItem('isAdmin') !== 'true') { navigate('/dashboard'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        // 4. CARGAMOS LOS ANUNCIOS TAMBIÉN
        const [u, t, s, p, a] = await Promise.all([
            getAllUsers(), 
            getAdminTickets(), 
            getAdminStats(), 
            getAllProductsGlobal(),
            getAnnouncements() 
        ]);
        setUsers(u); 
        setTickets(t); 
        setStats(s); 
        setProducts(p);
        setAnnouncements(a); // Guardamos historial
    } catch (e) { 
        console.error("Error cargando datos", e); 
    } finally { 
        setLoading(false); 
    }
  };

  const totalUsers = users.length;
  const activeUsersCount = users.filter(u => u.is_active).length;
  const activityPercentage = totalUsers > 0 ? Math.round((activeUsersCount / totalUsers) * 100) : 0;

  const getFilteredData = () => {
      const term = searchTerm.toLowerCase();
      
      if (activeTab === 'users') {
          return users.filter(u => u.email.toLowerCase().includes(term) || (u.first_name && u.first_name.toLowerCase().includes(term)));
      }
      if (activeTab === 'products') {
          return products.filter(p => p.name.toLowerCase().includes(term) || p.owner.toLowerCase().includes(term));
      }
      if (activeTab === 'tickets') {
          return tickets.filter(t => {
              const matchesSearch = t.user.toLowerCase().includes(term) || t.issue.toLowerCase().includes(term);
              const matchesStatus = ticketFilter === 'all' ? true : t.status === ticketFilter;
              return matchesSearch && matchesStatus;
          });
      }
      // 5. FILTRO PARA HISTORIAL DE ANUNCIOS
      if (activeTab === 'announcements') {
          return announcements.filter(a => a.title.toLowerCase().includes(term) || a.message.toLowerCase().includes(term));
      }
      return [];
  };

  const filteredData = getFilteredData();

  const handleResolve = async () => {
      if(!modalTicket || !responseMsg) return;
      try {
        await closeTicket(modalTicket.id, responseMsg);
        setModalTicket(null); loadData(); alert("Ticket Resuelto.");
      } catch (error) { alert("Error."); }
  };

  const handleAnnounce = async () => {
      if(!announceData.title) return;
      if(window.confirm("¿Publicar aviso?")) {
        try {
            await createAnnouncement(announceData.title, announceData.message);
            setShowAnnounce(false); 
            setAnnounceData({title:"", message:""}); 
            loadData(); // Recargamos para ver el nuevo en la lista
            alert("Publicado.");
        } catch (error) { alert("Error."); }
      }
  };

  const insertTemplate = (text: string) => setResponseMsg(text);

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="header-title">
            <h1>PANEL DE CONTROL DEL ADMIN</h1>
        </div>
        <div>
            <button className="btn-new-announce" onClick={() => setShowAnnounce(true)}> Nuevo Aviso Global</button>
            <button className="btn-exit" onClick={() => navigate('/login')}>Cerrar Sesión</button>
        </div>
      </header>

      <div className="admin-container fade-in">
        
        {/* KPI STATS */}
        <div className="kpi-grid">
            <div className="kpi-card blue">
                <span className="kpi-label">Base de Usuarios</span>
                <span className="kpi-number">{totalUsers}</span>
            </div>
            <div className="kpi-card green">
                <span className="kpi-label">Tasa de Actividad</span>
                <span className="kpi-number">
                    {activeUsersCount} <span style={{fontSize: '1.5rem', color: '#555', marginLeft: '5px'}}>/ {totalUsers}</span>
                </span>
                <span className="kpi-subtext" style={{color:' white'}}>{activityPercentage}% Activos</span>
            </div>
            <div className="kpi-card yellow" onClick={() => setActiveTab('products')}>
                <span className="kpi-label">Productos DB ↗</span>
                <span className="kpi-number">{stats.total_products}</span>
            </div>
            <div className="kpi-card red" style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('tickets'); setTicketFilter('open'); }}>
                <span className="kpi-label">Tickets Pendientes ↗</span>
                <span className="kpi-number">{tickets.filter(t => t.status === 'open').length}</span>
            </div>
        </div>

        <div className="main-panel">
            
            {/* 6. PESTAÑAS PRINCIPALES (Con la nueva de Historial) */}
            <div className="panel-tabs">
                <button className={`tab-btn ${activeTab === 'tickets' ? 'active' : ''}`} onClick={() => setActiveTab('tickets')}>🎫 Soporte</button>
                <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 Usuarios</button>
                <button className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>📦 Inventario</button>
                <button className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => setActiveTab('announcements')}>📢 Anuncios</button>
            </div>

            <div className="panel-content">
                {loading ? <div className="loading">Cargando sistema...</div> : (
                    <>
                        {/* VISTA TICKETS */}
                        {activeTab === 'tickets' && (
                            <div className="fade-in">
                                <div className="folder-tabs-container">
                                    <button className={`folder-tab tab-pending ${ticketFilter === 'open' ? 'active' : ''}`} onClick={() => setTicketFilter('open')}>Pendientes ({tickets.filter(t => t.status === 'open').length})</button>
                                    <button className={`folder-tab tab-resolved ${ticketFilter === 'closed' ? 'active' : ''}`} onClick={() => setTicketFilter('closed')}>Resueltos</button>
                                    <button className={`folder-tab tab-all ${ticketFilter === 'all' ? 'active' : ''}`} onClick={() => setTicketFilter('all')}>Todos</button>
                                </div>
                                <div className="toolbar-search-container">
                                    <input className="search-input-large" placeholder="🔍 Buscar ticket..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="tickets-grid">
                                    {filteredData.length === 0 && <p style={{color:'#666', padding:'20px', textAlign:'center'}}>No hay tickets.</p>}
                                    {filteredData.map((t: any) => (
                                        <div key={t.id} className={`ticket-card ${t.status}`}>
                                            <div className="ticket-header">
                                                <div className="user-info"><h4>{t.user}</h4><span>ID: #{t.id}</span></div>
                                                <span className={`status-badge ${t.status}`}>{t.status === 'open' ? 'Pendiente' : 'Resuelto'}</span>
                                            </div>
                                            <strong className="ticket-issue">{t.issue}</strong>
                                            <div className="ticket-body">"{t.message}"</div>
                                            {t.status === 'open' ? (
                                                <button className="btn-action" onClick={() => { setModalTicket(t); setResponseMsg(""); }}>Responder</button>
                                            ) : <div style={{fontSize:'0.8rem', color:'#555', textAlign:'center'}}>Archivado</div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* VISTA USUARIOS */}
                        {activeTab === 'users' && (
                            <div className="fade-in">
                                <div className="toolbar-search-container" style={{justifyContent:'space-between'}}>
                                    <h3 style={{margin:0, color:'white', alignSelf:'center'}}>Base de Datos</h3>
                                    <input className="search-input-large" style={{maxWidth:'400px', marginRight: '0px'}} placeholder="🔍 Buscar usuario..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <table className="cyber-table">
                                    <thead><tr><th>ID</th><th>Usuario</th><th>Teléfono</th><th>Rol</th><th>Estado</th></tr></thead>
                                    <tbody>
                                        {filteredData.map((u: any) => (
                                            <tr key={u.id}>
                                                <td style={{color:'#666'}}>#{u.id}</td>
                                                <td><div style={{fontWeight:'bold', color:'white'}}>{u.first_name} {u.last_name}</div><div style={{fontSize:'0.8rem', color:'#666'}}>{u.email}</div></td>
                                                <td>{u.phone || '-'}</td>
                                                <td><span className={`role-badge ${u.is_admin ? 'admin' : 'client'}`}>{u.is_admin ? 'ADMIN' : 'CLIENTE'}</span></td>
                                                <td>{u.is_active ? <span style={{color:'var(--neon-green)', fontSize:'0.85rem'}}>● Activo</span> : <span style={{color:'var(--neon-red)', fontSize:'0.85rem'}}>● Inactivo</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* VISTA PRODUCTOS */}
                        {activeTab === 'products' && (
                            <div className="fade-in">
                                <div className="toolbar-search-container" style={{justifyContent:'space-between'}}>
                                    <h3 style={{margin:0, color:'white', alignSelf:'center'}}>Inventario Global</h3>
                                    <input className="search-input-large" style={{maxWidth:'400px', marginRight: '0px' }} placeholder="🔍 Buscar producto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <table className="cyber-table">
                                    <thead><tr><th>ID</th><th>Producto</th><th>Stock</th><th>Dueño</th></tr></thead>
                                    <tbody>
                                        {filteredData.map((p: any) => (
                                            <tr key={p.id}>
                                                <td style={{color:'#666'}}>#{p.id}</td>
                                                <td style={{fontWeight:'bold'}}>{p.name} <span style={{fontWeight:'normal', color:'#555'}}>({p.barcode})</span></td>
                                                <td style={{color: p.stock < 5 ? 'var(--neon-red)' : 'var(--neon-green)'}}>{p.stock}</td>
                                                <td>{p.owner}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 7. NUEVA VISTA: HISTORIAL DE ANUNCIOS */}
                        {activeTab === 'announcements' && (
                            <div className="fade-in">
                                <div className="toolbar-search-container" style={{justifyContent:'space-between'}}>
                                    <h3 style={{margin:0, alignSelf:'center'}}>Historial de Comunicados</h3>
                                    <input className="search-input-large" style={{maxWidth:'400px', marginRight: '0px'}} placeholder="🔍 Buscar anuncio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <table className="cyber-table">
                                    <thead><tr><th>ID</th><th>Fecha</th><th>Título</th><th>Mensaje</th></tr></thead>
                                    <tbody>
                                        {filteredData.length === 0 && <tr><td colSpan={4} style={{textAlign:'center', padding:'20px'}}>No hay anuncios registrados.</td></tr>}
                                        {filteredData.map((a: any) => (
                                            <tr key={a.id}>
                                                <td style={{color:'#666'}}>#{a.id}</td>
                                                <td style={{color:'#888', fontSize:'0.85rem'}}>
                                                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Reciente'}
                                                </td>
                                                <td style={{fontWeight:'bold', color:'var(--neon-purple)'}}>{a.title}</td>
                                                <td style={{color:'#ccc', fontStyle:'italic', maxWidth:'400px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                                    {a.message}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
      </div>

      {/* MODALES (Igual que antes) */}
      {modalTicket && (
        <div className="modal-overlay" onClick={() => setModalTicket(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <h3 style={{margin:0, color:'white'}}>Responder Ticket</h3>
                <p style={{color:'#888', fontStyle:'italic', borderLeft:'2px solid var(--neon-red)', paddingLeft:'10px', margin:'15px 0'}}>"{modalTicket.message}"</p>
                <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                    <button className="filter-pill" onClick={()=>insertTemplate("Hola, ya hemos solucionado tu problema.")}>Listo</button>
                    <button className="filter-pill" onClick={()=>insertTemplate("Hola, necesitamos más detalles.")}>Info</button>
                </div>
                <textarea className="modal-textarea" rows={5} placeholder="Respuesta..." value={responseMsg} onChange={e => setResponseMsg(e.target.value)} />
                <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                    <button className="btn-exit" onClick={() => setModalTicket(null)}>Cancelar</button>
                    <button className="btn-new-announce" style={{background:'var(--neon-blue)'}} onClick={handleResolve}>Enviar</button>
                </div>
            </div>
        </div>
      )}
      
      {showAnnounce && (
         <div className="modal-overlay" onClick={() => setShowAnnounce(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <h3 style={{color:'var(--neon-purple)', margin:0}}>Nuevo Aviso Global </h3>
                <input className="search-input-large" style={{width:'100%', marginTop:'20px', background:'#050505'}} placeholder="Título" value={announceData.title} onChange={e=>setAnnounceData({...announceData, title:e.target.value})} />
                <textarea className="modal-textarea" rows={4} placeholder="Mensaje..." value={announceData.message} onChange={e=>setAnnounceData({...announceData, message:e.target.value})} />
                <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                    <button className="btn-exit" onClick={() => setShowAnnounce(false)}>Cancelar</button>
                    <button className="btn-new-announce" onClick={handleAnnounce}>Publicar</button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default AdminDashboard;