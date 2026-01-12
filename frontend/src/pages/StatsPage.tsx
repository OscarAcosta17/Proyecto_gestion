import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import "../styles/StatsPage.css";
import { getGeminiAnalysis } from '../services/api'; 
// 1. IMPORTAR EL HOOK
import { useAuth } from '../context/AuthContext';

// --- ICONOS ---
const ArrowLeft = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
const CalculatorIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h2M14 18h2"/></svg>;
const TrendingUpIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>;
const ArchiveIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
const DownloadIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const GeminiSparkle = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="gemini-spin"><path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" fill="url(#geminiGradient)"/><defs><linearGradient id="geminiGradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#60a5fa"/><stop offset="1" stopColor="#c084fc"/></linearGradient></defs></svg>;

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// --- INTERFACES ---
interface InventoryStats {
  total_products: number;
  low_stock: number;
  inventory_value: number; 
  recent_movements: { product: string; type: string; quantity: number; date: string; }[];
  zombie_products: { name: string; stock: number; }[]; 
}

interface SalesStats {
  today_income: number;
  month_income: number;
  month_profit: number; 
  total_profit: number; 
  sales_history: { 
      id: number; 
      date: string; 
      total: number; 
      items_count: number; 
      payment_method: string;
      profit?: number; 
  }[];
  top_products: { name: string; sold: number; }[];
  margin_percent: number;
  items_per_basket: number;
  payment_methods: { efectivo: number; debito: number };
}

// --- COLORES ---
const CHART_COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6'];
const BADGE_STYLES = [
  { bg: 'rgba(99, 102, 241, 0.2)', color: '#6366f1' }, 
  { bg: 'rgba(14, 165, 233, 0.2)', color: '#0ea5e9' },
  { bg: 'rgba(245, 158, 11, 0.2)',  color: '#f59e0b' }, 
  { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }, 
  { bg: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6' },
];

export default function StatsPage() {
    document.title = "Estadísticas | NexusERP";
  const navigate = useNavigate();
  
  // 2. OBTENER apiCall DEL CONTEXTO
  const { apiCall } = useAuth();

  const [activeTab, setActiveTab] = useState<'sales' | 'inventory'>('sales');
  const [listFilter, setListFilter] = useState<'recent' | 'daily' | 'weekly' | 'monthly'>('recent');
  const [loading, setLoading] = useState(true);

  // Datos
  const [invStats, setInvStats] = useState<InventoryStats | null>(null);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [products, setProducts] = useState<any[]>([]);

  // Modales
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);

  // IA States
  const [costInput, setCostInput] = useState("");
  const [costInsight, setCostInsight] = useState("");
  const [costLoading, setCostLoading] = useState(false);
  const [growthInsight, setGrowthInsight] = useState("");
  const [growthLoading, setGrowthLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 3. REEMPLAZO DE FETCH POR apiCall
        // apiCall añade el token y verifica si expiró automáticamente
        const [invRes, salesRes, prodRes] = await Promise.all([
            apiCall(`${API_URL}/dashboard/stats`),
            apiCall(`${API_URL}/sales/stats?range=monthly`),
            apiCall(`${API_URL}/products`)
        ]);

        if (invRes.ok) setInvStats(await invRes.json());
        if (salesRes.ok) setSalesStats(await salesRes.json());
        if (prodRes.ok) setProducts(await prodRes.json());

      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [API_URL, token]); // apiCall es estable, no es estrictamente necesario en dep

  // --- LÓGICA IA ---
  const handleCostAnalysis = async () => {
    if (!costInput) return alert("Por favor ingresa un monto aproximado.");
    setCostLoading(true);
    try {
        const data = await getGeminiAnalysis({
            analysis_type: 'costs',
            context_data: { user_fixed_costs: parseInt(costInput), month_income: salesStats?.month_income || 0 }
        });
        setCostInsight(data.insight);
    } catch (e) { setCostInsight("Error al calcular rentabilidad."); } finally { setCostLoading(false); }
  };

  const handleGrowthAnalysis = async () => {
    if (growthInsight) return;
    setGrowthLoading(true);
    try {
        const data = await getGeminiAnalysis({
            analysis_type: 'growth',
            context_data: { month_income: salesStats?.month_income || 0, month_profit: salesStats?.month_profit || 0, trend_desc: "Datos basados en historial de 30 días" }
        });
        setGrowthInsight(data.insight);
    } catch (e) { setGrowthInsight("No se pudo proyectar el crecimiento."); } finally { setGrowthLoading(false); }
  };

  const handleExport = () => {
    if (!salesStats?.sales_history) return;
    const headers = ["ID,Fecha,Total,Items,MetodoPago\n"];
    const rows = salesStats.sales_history.map(s => `${s.id},${new Date(s.date).toLocaleDateString()},${s.total},${s.items_count},${s.payment_method}`);
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows.join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Ventas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // --- HELPERS ---
  const paymentPercentages = useMemo(() => {
    const cash = salesStats?.payment_methods.efectivo || 0;
    const debit = salesStats?.payment_methods.debito || 0;
    const total = cash + debit;
    if (total === 0) return { cash: 0, debit: 0 };
    return { cash: Math.round((cash / total) * 100), debit: Math.round((debit / total) * 100) };
  }, [salesStats]);

  const totalItemsSoldPeriod = useMemo(() => {
    if (!salesStats?.sales_history) return 1;
    return salesStats.sales_history.reduce((acc, sale) => acc + sale.items_count, 0);
  }, [salesStats]);

  const totalStockUnits = useMemo(() => products.reduce((acc, curr) => acc + curr.stock, 0), [products]);

  // --- CÁLCULO DE GRÁFICOS (CORREGIDO PARA CUADRAR TOTALES) ---
  const processedHistory = useMemo(() => {
    if (!salesStats?.sales_history) return { labels: [], income: [], profit: [] };
    
    // 1. Calcular el margen real global para ajustar el gráfico
    const totalIncome = salesStats.month_income || 1; 
    const totalProfit = salesStats.month_profit || 0;
    const averageMargin = totalProfit / totalIncome; // Ej: 0.5 si ganaste la mitad

    const sorted = [...salesStats.sales_history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const grouped: Record<string, {income: number, profit: number}> = {};
    
    sorted.forEach(sale => {
        const d = new Date(sale.date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
        if (!grouped[d]) grouped[d] = { income: 0, profit: 0 };
        
        grouped[d].income += sale.total;
        
        // CORRECCIÓN MAESTRA:
        // Si sale.profit existe (backend actualizado) lo usamos.
        // Si NO existe (backend antiguo o caché), usamos el margen promedio global.
        // Esto asegura que la suma del gráfico sea IGUAL al total del encabezado.
        const computedProfit = (sale.profit !== undefined && sale.profit !== 0) 
            ? sale.profit 
            : (sale.total * averageMargin);

        grouped[d].profit += Math.round(computedProfit);
    });
    
    return { 
        labels: Object.keys(grouped), 
        income: Object.values(grouped).map(g => g.income), 
        profit: Object.values(grouped).map(g => g.profit) 
    };
  }, [salesStats]);

  const incomeChartData = {
    labels: processedHistory.labels,
    datasets: [{ label: 'Ingresos', data: processedHistory.income, borderColor: '#10b981', backgroundColor: (ctx: any) => { const gradient = ctx.chart.ctx.createLinearGradient(0,0,0,200); gradient.addColorStop(0, 'rgba(16,185,129,0.4)'); gradient.addColorStop(1, 'rgba(16,185,129,0)'); return gradient; }, fill: true, tension: 0.4, pointBackgroundColor: '#0f1014' }]
  };
  const profitChartData = {
    labels: processedHistory.labels,
    datasets: [{ label: 'Ganancia', data: processedHistory.profit, borderColor: '#f59e0b', backgroundColor: (ctx: any) => { const gradient = ctx.chart.ctx.createLinearGradient(0,0,0,200); gradient.addColorStop(0, 'rgba(245,158,11,0.4)'); gradient.addColorStop(1, 'rgba(245,158,11,0)'); return gradient; }, fill: true, tension: 0.4, pointBackgroundColor: '#0f1014' }]
  };
  const doughnutData = {
    labels: salesStats?.top_products?.slice(0, 5).map(p => p.name) || [],
    datasets: [{ data: salesStats?.top_products?.slice(0, 5).map(p => p.sold) || [], backgroundColor: CHART_COLORS, borderColor: '#0f1014', borderWidth: 2 }]
  };
  const stockChartData = {
    labels: products.map(p => p.name).slice(0, 8),
    datasets: [{ label: 'Stock', data: products.map(p => p.stock).slice(0, 8), backgroundColor: products.map(p => p.stock < 5 ? '#ef4444' : '#6366f1'), borderRadius: 4 }]
  };
  
  const paymentChartData = {
    labels: ['Efectivo', 'Débito'],
    datasets: [{
        data: [salesStats?.payment_methods.efectivo || 0, salesStats?.payment_methods.debito || 0],
        backgroundColor: ['#10b981', '#0ea5e9'],
        borderColor: '#0f1014',
        borderWidth: 2
    }]
  };

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { ticks: { color: '#6b7280' }, grid: { display: false } } } };
  
  const filteredSalesHistory = useMemo(() => {
    if (!salesStats?.sales_history) return [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return salesStats.sales_history.filter(sale => {
        const saleDate = new Date(sale.date);
        const saleTime = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate()).getTime();
        if (listFilter === 'recent') return true;
        if (listFilter === 'daily') return saleTime === todayStart;
        if (listFilter === 'weekly') return saleTime >= todayStart - (7 * 24 * 60 * 60 * 1000);
        if (listFilter === 'monthly') return saleDate.getMonth() === now.getMonth();
        return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [salesStats, listFilter]);

  const lowStockItems = products.filter(p => p.stock < 5);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-CL', {day: '2-digit', month: '2-digit', year: 'numeric'});

  if (loading) return <div className="master-container loading-screen"><div className="loading-spinner"></div></div>;

  return (
    <div className="master-container">
      <div className="moving-grid-background"><div className="grid-plane"></div></div>
      <div className="ambient-glow glow-top-left"></div>
      
      <div className="stats-layout">
        <header className="stats-header">
            <div className="header-left">
                <button onClick={() => navigate("/dashboard")} className="btn-icon-back"><ArrowLeft /></button>
                <div className="header-text"><h1>Dashboard Gerencial</h1><p>Visión estratégica en tiempo real.</p></div>
            </div>
        </header>

        <div className="tabs-container-center">
            <button className={`tab-pill-large ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>Gestión de Ventas</button>
            <button className={`tab-pill-large ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>Inventario y Stock</button>
        </div>

        <div className="stats-content-area">
            {activeTab === 'sales' && (
                <div className="sales-view-container">
                    
                    {/* KPIs */}
                    <div className="kpi-grid">
                        <div className="kpi-card gold-glow"><div className="kpi-icon icon-gold">📊</div><div className="kpi-content"><h3>Margen Real</h3><div className="kpi-value">{salesStats?.margin_percent || 0}%</div><small className="text-muted">Rentabilidad neta</small></div></div>
                        <div className="kpi-card purple-glow"><div className="kpi-icon icon-purple">🛍️</div><div className="kpi-content"><h3>Items / Canasta</h3><div className="kpi-value">{salesStats?.items_per_basket || 0}</div><small className="text-muted">Promedio productos</small></div></div>
                        <div className="kpi-card green-glow"><div className="kpi-icon icon-green">💰</div><div className="kpi-content"><h3>Ventas Hoy</h3><div className="kpi-value">${(salesStats?.today_income || 0).toLocaleString('es-CL')}</div><small className="text-muted">Cierre diario</small></div></div>
                    </div>

                    {/* Charts */}
                    <div className="charts-split-grid">
                        <div className="panel-card"><div className="panel-header-mini"><span className="label">Ingresos Brutos</span><span className="value success">${(salesStats?.month_income || 0).toLocaleString('es-CL')}</span></div><div className="chart-wrapper-mini"><Line options={chartOptions} data={incomeChartData} /></div></div>
                        <div className="panel-card"><div className="panel-header-mini"><span className="label">Ganancia Neta</span><span className="value warning">${(salesStats?.month_profit || 0).toLocaleString('es-CL')}</span></div><div className="chart-wrapper-mini"><Line options={chartOptions} data={profitChartData} /></div></div>
                    </div>

                    {/* Tools */}
                    <div className="analysis-tools-grid">
                        <button className="tool-card" onClick={() => setShowCostModal(true)}><div className="tool-icon blue"><CalculatorIcon /></div><div className="tool-info"><span>Herramienta</span><strong>Estimar Costos</strong></div></button>
                        <button className="tool-card" onClick={() => { setShowGrowthModal(true); handleGrowthAnalysis(); }}><div className="tool-icon green"><TrendingUpIcon /></div><div className="tool-info"><span>Análisis</span><strong>Proyección</strong></div></button>
                        <button className="tool-card" onClick={() => setShowCashModal(true)}><div className="tool-icon purple"><ArchiveIcon /></div><div className="tool-info"><span>Historial</span><strong>Cierres Caja</strong></div></button>
                    </div>

                    {/* Secondary Charts */}
                    <div className="charts-split-grid">
                         <div className="panel-card ranking-panel">
                            <div className="panel-header"><h3>💳 Medios de Pago</h3></div>
                            <div className="ranking-content-flex">
                                <div className="doughnut-container">
                                    <Doughnut data={paymentChartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                                </div>
                                <div className="ranking-list">
                                    <div className="ranking-item">
                                        <div className="rank-dot" style={{backgroundColor: '#10b981'}}></div>
                                        <span>Efectivo</span>
                                        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
                                            <strong style={{fontSize:'0.9rem'}}>{salesStats?.payment_methods.efectivo}</strong>
                                            <span style={{backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'}}>
                                                {paymentPercentages.cash}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="ranking-item">
                                        <div className="rank-dot" style={{backgroundColor: '#0ea5e9'}}></div>
                                        <span>Débito</span>
                                        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
                                            <strong style={{fontSize:'0.9rem'}}>{salesStats?.payment_methods.debito}</strong>
                                            <span style={{backgroundColor: 'rgba(14, 165, 233, 0.2)', color: '#0ea5e9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'}}>
                                                {paymentPercentages.debit}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="panel-card ranking-panel">
                            <div className="panel-header"><h3>🏆 Participación</h3></div>
                            <div className="ranking-content-flex">
                                <div className="doughnut-container">
                                    <Doughnut data={doughnutData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                                </div>
                                <div className="ranking-list">
                                    {salesStats?.top_products?.slice(0,4).map((prod, index) => {
                                        const share = Math.round((prod.sold / totalItemsSoldPeriod) * 100);
                                        const style = BADGE_STYLES[index % BADGE_STYLES.length]; 

                                        return (
                                            <div key={index} className="ranking-item">
                                                <div className="rank-dot" style={{backgroundColor: doughnutData.datasets[0].backgroundColor[index]}}></div>
                                                <div className="rank-info-compact" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>
                                                    <span>{prod.name}</span>
                                                </div>
                                                
                                                <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
                                                    <strong style={{fontSize:'0.9rem', whiteSpace: 'nowrap'}}>
                                                        {prod.sold} un.
                                                    </strong>
                                                    
                                                    <span style={{backgroundColor: style.bg, color: style.color, padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'}}>
                                                        {share}%
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5. Historial (ALINEACIÓN CORREGIDA POR CLASES) */}
                    <div className="panel-card">
                        <div className="panel-header-actions">
                            <h3>Historial de Ventas</h3>
                            <div className="actions-right">
                                <div className="filter-pills">
                                    <button onClick={() => setListFilter('recent')} className={listFilter === 'recent' ? 'active' : ''}>Todos</button>
                                    <button onClick={() => setListFilter('daily')} className={listFilter === 'daily' ? 'active' : ''}>Hoy</button>
                                    <button onClick={() => setListFilter('weekly')} className={listFilter === 'weekly' ? 'active' : ''}>Semana</button>
                                    <button onClick={() => setListFilter('monthly')} className={listFilter === 'monthly' ? 'active' : ''}>Mes</button>
                                </div>
                                <button className="btn-download-icon" onClick={handleExport}><DownloadIcon /></button>
                            </div>
                        </div>
                        <div className="table-responsive-wrapper">
                            <table className="cyber-table">
                                <thead>
                                    <tr>
                                        <th className="text-left">Fecha</th>
                                        <th className="text-right">Total</th>
                                        <th className="text-center">Método</th> 
                                        <th className="text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSalesHistory.map(sale => (
                                        <tr key={sale.id} className="row-hover">
                                            <td>{formatDate(sale.date)}</td>
                                            <td className="text-right amount">${sale.total.toLocaleString('es-CL')}</td>
                                            <td className="text-center">
                                                <span className={`method-badge ${sale.payment_method === 'Débito' ? 'debit' : 'cash'}`}>
                                                    {sale.payment_method === 'Débito' ? 'Débito' : 'Efectivo'}
                                                </span>
                                            </td>
                                            <td className="text-center"><span className="status-badge paid">OK</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className="inventory-view">
                     <div className="kpi-grid">
                        <div className={`kpi-card red-alert clickable`} onClick={() => setShowStockModal(true)}>
                            <div className="kpi-icon icon-red">⚠️</div>
                            <div className="kpi-content">
                                <h3>Stock Crítico</h3>
                                <div className="kpi-value">{invStats?.low_stock || 0}</div>
                                <small style={{color:'#fca5a5'}}>Ver productos</small>
                            </div>
                        </div>
                        <div className="kpi-card blue-glow">
                            <div className="kpi-icon icon-blue">📦</div>
                            <div className="kpi-content">
                                <h3>Resumen Global</h3>
                                <div style={{fontSize: '0.9rem', color: '#e2e8f0', marginTop: '2px'}}>
                                    <div><strong>{invStats?.total_products || 0}</strong> Prod. Únicos</div>
                                    <div><strong>{totalStockUnits.toLocaleString()}</strong> U. Totales</div>
                                </div>
                            </div>
                        </div>
                        <div className="kpi-card green-glow">
                            <div className="kpi-icon icon-green">💰</div>
                            <div className="kpi-content">
                                <h3>Valor Bodega</h3>
                                <div className="kpi-value" style={{fontSize: '1.4rem'}}>${(invStats?.inventory_value || 0).toLocaleString('es-CL')}</div>
                                <small className="text-muted">Costo total</small>
                            </div>
                        </div>
                    </div>
                    <div className="inventory-grid-split">
                        <div className="panel-card chart-card"><div className="panel-header"><h3>Niveles de Stock</h3></div><div className="chart-wrapper"><Bar options={chartOptions} data={stockChartData} /></div></div>
                        <div className="panel-card">
                            <div className="panel-header"><h3>🧟 Productos Zombie</h3><span className="badge-gray">Sin ventas 30d</span></div>
                            <div className="table-responsive-wrapper">
                                <table className="cyber-table">
                                    <thead><tr><th>Producto</th><th className="text-right">Stock</th></tr></thead>
                                    <tbody>
                                        {invStats?.zombie_products?.length === 0 ? (
                                            <tr><td colSpan={2} style={{textAlign:'center', padding:'20px', color:'#666'}}>¡Excelente! Todo se mueve.</td></tr>
                                        ) : (
                                            invStats?.zombie_products?.map((z, i) => (
                                                <tr key={i}><td>{z.name}</td><td className="text-right" style={{color: '#fca5a5'}}>{z.stock}</td></tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <div className="panel-card"><div className="panel-header"><h3>Últimos Movimientos</h3></div>
                        <div className="table-responsive-wrapper">
                            <table className="cyber-table">
                                <thead>
                                    <tr>
                                        <th className="text-left">Producto</th>
                                        <th className="text-center">Tipo</th>
                                        <th className="text-right">Cant.</th>
                                        <th className="text-right">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invStats?.recent_movements.map((mov, i) => (
                                        <tr key={i} className="row-hover">
                                            <td className="product-name">{mov.product}</td>
                                            <td className="text-center"><span className={`type-badge ${mov.type}`}>{mov.type === 'suma' ? 'Entrada' : 'Salida'}</span></td>
                                            <td className="text-right">{mov.quantity}</td>
                                            <td className="text-right date-col">{formatDate(mov.date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {showStockModal && <div className="modal-backdrop" onClick={() => setShowStockModal(false)}><div className="modal-cyber" onClick={e => e.stopPropagation()}><div className="modal-cyber-header"><h3>⚠️ Stock Crítico</h3><button onClick={() => setShowStockModal(false)}>×</button></div><div className="modal-cyber-body"><ul className="critical-list">{lowStockItems.map(p => <li key={p.id}><span className="prod-name">{p.name}</span><span className="stock-count">{p.stock}</span></li>)}</ul></div></div></div>}
      {showCostModal && <div className="modal-backdrop" onClick={() => setShowCostModal(false)}><div className="modal-cyber modal-lg" onClick={e => e.stopPropagation()}><div className="modal-cyber-header"><h3>🧮 Calculadora Inteligente</h3><button onClick={() => setShowCostModal(false)}>×</button></div><div className="modal-cyber-body"><div className="cost-form"><label>Ingresa tus Costos Fijos Mensuales ($)</label><input type="number" className="cyber-input" placeholder="Ej: 500000" value={costInput} onChange={e => setCostInput(e.target.value)} /><button className="btn-primary-small" onClick={handleCostAnalysis} disabled={costLoading}>{costLoading ? "Calculando..." : "Analizar con IA"}</button>{costInsight && <div className="ai-result-box"><div className="ai-badge-small"><GeminiSparkle /> <span>Análisis Financiero</span></div><div className="markdown-content" style={{whiteSpace: 'pre-line'}}>{costInsight}</div></div>}</div></div></div></div>}
      {showGrowthModal && <div className="modal-backdrop" onClick={() => setShowGrowthModal(false)}><div className="modal-cyber modal-lg" onClick={e => e.stopPropagation()}><div className="modal-cyber-header"><h3>🚀 Proyección de Crecimiento</h3><button onClick={() => setShowGrowthModal(false)}>×</button></div><div className="modal-cyber-body">{growthLoading ? <div className="typing-indicator" style={{textAlign:'center', padding:'20px'}}>Analizando tendencias de mercado...</div> : <div className="ai-result-box"><div className="ai-badge-small"><GeminiSparkle /> <span>Predicción IA</span></div><div className="markdown-content" style={{whiteSpace: 'pre-line'}}>{growthInsight}</div></div>}</div></div></div>}
      {showCashModal && <div className="modal-backdrop" onClick={() => setShowCashModal(false)}><div className="modal-cyber" onClick={e => e.stopPropagation()}><div className="modal-cyber-header"><h3>📦 Cierres Diarios</h3><button onClick={() => setShowCashModal(false)}>×</button></div><div className="modal-cyber-body"><table className="cash-table"><thead><tr><th>Fecha</th><th className="text-right">Total Vendido</th></tr></thead><tbody>{processedHistory.labels.map((date, index) => (<tr key={date}><td>{date}</td><td className="text-right cash-total">${processedHistory.income[index].toLocaleString('es-CL')}</td></tr>))}</tbody></table></div></div></div>}
    </div>
  );
}