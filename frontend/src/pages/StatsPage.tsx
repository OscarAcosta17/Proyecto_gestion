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

// Registrar componentes del gráfico
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function StatsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>("chart"); // Gráfico abierto por defecto
  
  const [stats, setStats] = useState({
    total_products: 0,
    low_stock: 0,
    inventory_value: 0,
    recent_movements: []
  });

  // Estado para los datos de productos (para el gráfico)
  const [products, setProducts] = useState<any[]>([]);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Cargar Estadísticas Generales
        const statsRes = await fetch(`${API_URL}/dashboard/stats`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (statsRes.ok) setStats(await statsRes.json());

        // 2. Cargar Productos para el Gráfico
        const prodRes = await fetch(`${API_URL}/products`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (prodRes.ok) setProducts(await prodRes.json());

      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    };
    fetchData();
  }, [API_URL, token]);

  // Configuración de datos para el gráfico de barras
  const chartData = {
    labels: products.map(p => p.name), // Nombres de productos en el eje X
    datasets: [
      {
        label: 'Unidades en Stock',
        data: products.map(p => p.stock), // Cantidad de stock en el eje Y
        backgroundColor: 'rgba(40, 167, 69, 0.6)', // Verde semitransparente
        borderColor: '#28a745',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: 'white' } },
      title: { display: false },
    },
    scales: {
        y: { ticks: { color: '#aaa' }, grid: { color: '#444' } },
        x: { ticks: { color: '#aaa' }, grid: { display: false } }
    }
  };

  const toggleSection = (section: string) => {
      setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="stats-container">
      {/* HEADER */}
      <div className="stats-header shadow">
        <div>
          <h1>📊 Centro de Estadísticas</h1>
          <p style={{color: '#aaa', margin: 0}}>Visión más detallada de tu negocio</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate("/dashboard")}>
          ← Volver
        </button>
      </div>

      {/* 1. TARJETAS DE KPIs (ARREGLADAS) */}
      <div className="kpi-grid">
        <div className="kpi-card shadow">
          <h3>Total en Bodega</h3>
          <span className="number">{stats.total_products}</span>
          <small style={{color: '#aaaaaaff'}}>Productos únicos</small>
        </div>
        
        <div className={`kpi-card shadow ${stats.low_stock > 0 ? 'alert' : ''}`}>
          <h3>Alerta Stock</h3>
          <span className="number">{stats.low_stock}</span>
          <small style={{color: stats.low_stock > 0 ? '#ff6b6b' : '#aaa'}}>
             {stats.low_stock > 0 ? 'Requieren reposición' : 'Todo en orden'}
          </small>
        </div>

        <div className="kpi-card money shadow">
          <h3>Valorización Total</h3>
          <span className="number">${stats.inventory_value.toLocaleString()}</span>
          <small style={{color: '#aaa'}}>Capital invertido</small>
        </div>
      </div>

      {/* 2. ACORDEÓN: GRÁFICO VISUAL */}
      <div className="accordion-section shadow">
        <button className="accordion-trigger" onClick={() => toggleSection("chart")}>
          <span>Visualización de Stock por Producto</span>
          <span>{activeSection === "chart" ? "▲" : "▼"}</span>
        </button>
        
        {activeSection === "chart" && (
            <div className="accordion-content chart-container">
                {products.length > 0 ? (
                    <Bar options={chartOptions} data={chartData} />
                ) : (
                    <p style={{textAlign: 'center', color: '#666'}}>No hay productos para graficar.</p>
                )}
            </div>
        )}
      </div>

      {/* 3. ACORDEÓN: HISTORIAL DETALLADO */}
      <div className="accordion-section shadow">
        <button className="accordion-trigger" onClick={() => toggleSection("history")}>
          <span>Últimos Movimientos de Inventario</span>
          <span>{activeSection === "history" ? "▲" : "▼"}</span>
        </button>

        {activeSection === "history" && (
            <div className="accordion-content recent-activity">
                <table className="activity-table">
                <thead>
                    <tr>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cant.</th>
                    <th>Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.recent_movements.length === 0 ? (
                    <tr><td colSpan={4} style={{textAlign: 'center', padding: '20px'}}>Sin actividad reciente</td></tr>
                    ) : (
                    stats.recent_movements.map((mov: any, index) => (
                        <tr key={index}>
                        <td style={{fontWeight: 'bold', color: 'white'}}>{mov.product}</td>
                        <td>
                            <span className={`tag ${mov.type}`}>
                            {mov.type === 'suma' ? 'Entrada' : mov.type === 'resta' ? 'Salida' : 'Ajuste'}
                            </span>
                        </td>
                        <td>{mov.quantity}</td>
                        <td style={{color: '#aaa', fontSize: '0.85rem'}}>
                            {new Date(mov.date).toLocaleDateString()}
                        </td>
                        </tr>
                    ))
                    )}
                </tbody>
                </table>
            </div>
        )}
      </div>

    </div>
  );
}