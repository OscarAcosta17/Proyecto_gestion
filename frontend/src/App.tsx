import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importa tus páginas
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import SupportPage from './pages/SupportPage';
import ConfigurationPage from './pages/ConfigurationPage';
import StatsPage from './pages/StatsPage';
import SalesPage from './pages/SalesPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        
        {/* Agrega esta línea */}
        <Route path="/support" element={<SupportPage />} />
        <Route path="/configuration" element={<ConfigurationPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/sales" element={<SalesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;