import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import "../styles/StatsPage.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Interfaces
interface InventoryStats {
  total_products: number;
  low_stock: number;
  inventory_value: number;
  recent_movements: { product: string; type: string; quantity: number; date: string; }[];
}

interface SalesStats {
  today_income: number;
  month_income: number;
  month_profit: number; 
  total_profit: number; // <--- NUEVO CAMPO
  sales_history: { id: number; date: string; total: number; items_count: number; }[];
  top_products: { name: string; sold: number; }[];
}

export default function StatsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory'>('sales');
  const [timeFilter, setTimeFilter] = useState<'recent' | 'daily' | 'weekly' | 'monthly'>('recent');
  const [showStockModal, setShowStockModal] = useState(false);

  const [invStats, setInvStats] = useState<InventoryStats | null>(null);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { "Authorization": `Bearer ${token}` };

        const [invRes, salesRes, prodRes] = await Promise.all([
            fetch(`${API_URL}/dashboard/stats`, { headers }),
            fetch(`${API_URL}/sales/stats?range=${timeFilter}`, { headers }),
            fetch(`${API_URL}/products`, { headers })
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
  }, [API_URL, token, timeFilter]);

  const lowStockItems = products.filter(p => p.stock < 5);

  const downloadExcel = async () => {
    try {
        const response = await fetch(`${API_URL}/sales/export`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Error");
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const now = new Date();
        const fileName = `Reporte_Ventas_${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()}.xlsx`;
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (error) {
        alert("Error descargando reporte.");
    }
  };

  const chartData = {
    labels: products.map(p => p.name),
    datasets: [{
      label: 'Stock',
      data: products.map(p => p.stock),
      backgroundColor: 'rgba(52, 152, 219, 0.6)',
      borderColor: '#3498db',
      borderWidth: 1,
    }],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: false } },
    scales: { y: { ticks: { color: '#888' }, grid: { color: '#333' } }, x: { ticks: { color: '#888' }, grid: { display: false } } }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
    });
  };

  if (loading) return <div className="loading-container">Cargando...</div>;

  return (
    <div className="stats-container">
      <div className="stats-header shadow">
        <div>
          <h1>📊 Dashboard Gerencial</h1>
          <p style={{color: '#aaa', margin: 0}}>Visión integral del negocio</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate("/dashboard")}>← Volver</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card income shadow">
          <h3>Ventas Hoy</h3>
          <span className="number">${(salesStats?.today_income || 0).toLocaleString('es-CL')}</span>
          <small style={{color: '#2ecc71'}}>Ingresos diarios</small>
        </div>
        
        <div className="kpi-card shadow">
            <h3>Ventas Mes</h3>
            <span className="number" style={{color: '#3498db'}}>${(salesStats?.month_income || 0).toLocaleString('es-CL')}</span>
            <small style={{color: '#aaa'}}>Acumulado</small>
        </div>

        {/* --- TARJETA GANANCIA ACTUALIZADA --- */}
        <div className="kpi-card profit shadow">
            <h3>Ganancia Neta (Mes)</h3>
            <span className="number" style={{color: '#f1c40f'}}>${(salesStats?.month_profit || 0).toLocaleString('es-CL')}</span>
            {/* Aquí agregamos el Total Histórico en pequeño */}
            <small style={{color: '#aaa'}}>
                Histórico: <strong style={{color: '#f1c40f'}}>${(salesStats?.total_profit || 0).toLocaleString('es-CL')}</strong>
            </small>
        </div>

        {/* --- TARJETA PATRIMONIO ACTUALIZADA --- */}
        <div className="kpi-card iva shadow">
          <h3>Patrimonio (Bruto)</h3>
          <span className="number">${((invStats?.inventory_value || 0) * 1.19).toLocaleString('es-CL', {maximumFractionDigits:0})}</span>
          {/* Aquí agregamos el valor Neto (Sin IVA) */}
          <small style={{color: '#aaa'}}>
              Sin IVA: < strong style={{color: '#d63384'}}>${(invStats?.inventory_value || 0).toLocaleString('es-CL', {maximumFractionDigits:0})}</strong>
          </small>
        </div>

        <div 
            className={`kpi-card shadow clickable ${(invStats?.low_stock || 0) > 0 ? 'alert' : ''}`}
            onClick={() => setShowStockModal(true)}
        >
          <h3>Alerta Stock</h3>
          <span className="number">{(invStats?.low_stock || 0)}</span>
          <small style={{color: (invStats?.low_stock || 0) > 0 ? '#ff6b6b' : '#aaa'}}>
             {(invStats?.low_stock || 0) > 0 ? 'Click para ver detalles' : 'Todo en orden'}
          </small>
        </div>
      </div>

      <div className="tabs-header">
          <button className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>🛒 Ventas</button>
          <button className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>📦 Inventario</button>
      </div>

      <div className="tab-content shadow">
        {activeTab === 'sales' && (
            <div className="sales-dashboard-grid animate-fade">
                <div className="top-products-card">
                    <div className="card-header-flex">
                        <h3>🏆 Ranking</h3>
                        <small>Más vendidos (Mes)</small>
                    </div>
                    <div className="ranking-list">
                        {salesStats?.top_products?.map((prod, index) => (
                            <div key={index} className="ranking-item">
                                <div className="rank-info">
                                    <span className="rank-name">#{index + 1} {prod.name}</span>
                                    <span className="rank-val">{prod.sold}</span>
                                </div>
                                <div className="progress-bg">
                                    <div className="progress-fill" style={{width: `${(prod.sold / (salesStats.top_products[0].sold || 1)) * 100}%`}}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="history-container">
                    <div className="table-header-actions">
                        <h3>Historial</h3>
                        <button className="btn-excel" onClick={downloadExcel}>📥 Excel</button>
                    </div>

                    <div className="filter-buttons">
                        <button className={`filter-btn ${timeFilter === 'recent' ? 'active' : ''}`} onClick={() => setTimeFilter('recent')}>Recientes</button>
                        <button className={`filter-btn ${timeFilter === 'daily' ? 'active' : ''}`} onClick={() => setTimeFilter('daily')}>Hoy</button>
                        <button className={`filter-btn ${timeFilter === 'weekly' ? 'active' : ''}`} onClick={() => setTimeFilter('weekly')}>Semanal</button>
                        <button className={`filter-btn ${timeFilter === 'monthly' ? 'active' : ''}`} onClick={() => setTimeFilter('monthly')}>Mensual</button>
                    </div>

                    <div className="table-responsive">
                        <table className="custom-table">
                            <thead>
                                <tr><th>ID</th><th>Fecha</th><th>Total</th><th>Estado</th></tr>
                            </thead>
                            <tbody>
                                {salesStats?.sales_history.map(sale => (
                                    <tr key={sale.id}>
                                        <td>#{sale.id}</td>
                                        <td>{formatDate(sale.date)}</td>
                                        <td className="amount-col">${sale.total.toLocaleString('es-CL')}</td>
                                        <td><span className="badge-success">Pagado</span></td>
                                    </tr>
                                ))}
                                {(!salesStats?.sales_history || salesStats.sales_history.length === 0) && (
                                    <tr><td colSpan={4} className="empty-msg">No hay ventas en este periodo.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'inventory' && (
            <div className="animate-fade">
                <div className="chart-container">
                     <Bar options={chartOptions} data={chartData} />
                </div>
                <h3 className="section-title">Movimientos Recientes</h3>
                <div className="table-responsive">
                    <table className="custom-table">
                        <thead>
                            <tr><th>Producto</th><th>Tipo</th><th>Cant.</th><th>Fecha</th></tr>
                        </thead>
                        <tbody>
                            {invStats?.recent_movements.map((mov, i) => (
                                <tr key={i}>
                                    <td className="bold-text">{mov.product}</td>
                                    <td><span className={`tag ${mov.type}`}>{mov.type === 'suma' ? 'Entrada' : mov.type === 'resta' || mov.type === 'venta' ? 'Salida' : 'Ajuste'}</span></td>
                                    <td>{mov.quantity}</td>
                                    <td>{formatDate(mov.date)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>

      {showStockModal && (
        <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Productos Críticos (Stock &lt; 5)</h3>
                    <button className="btn-close" onClick={() => setShowStockModal(false)}>×</button>
                </div>
                <div className="modal-body">
                    {lowStockItems.length === 0 ? (
                        <p style={{textAlign:'center', color:'#aaa', padding:'20px'}}>
                            ¡Excelente! Todo el inventario está saludable.
                        </p>
                    ) : (
                        lowStockItems.map(p => (
                            <div key={p.id} className="low-stock-item">
                                <span style={{color: '#fff', fontWeight:500}}>{p.name}</span>
                                <span className="stock-badge-alert">Quedan: {p.stock}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}