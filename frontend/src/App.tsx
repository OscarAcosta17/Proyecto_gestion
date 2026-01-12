import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 1. IMPORTAR CONTEXTO Y MODAL (LO NUEVO)
import { AuthProvider } from './context/AuthContext';
import SessionExpiredModal from './components/SessionExpiredModal';

// Importa tus páginas (Mantenemos las tuyas intactas)
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import SupportPage from './pages/SupportPage';
import ConfigurationPage from './pages/ConfigurationPage';
import StatsPage from './pages/StatsPage';
import SalesPage from './pages/SalesPage';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    // 2. ENVOLVER TODA LA APP CON EL PROVEEDOR DE AUTENTICACIÓN
    <AuthProvider>
      
      {/* 3. AGREGAR EL MODAL AQUÍ (Para que flote sobre cualquier página) */}
      <SessionExpiredModal />

      <BrowserRouter>
        <Routes>
          {/* Redirección inicial */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Tus Rutas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/configuration" element={<ConfigurationPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
      
    </AuthProvider>
  );
}

export default App;