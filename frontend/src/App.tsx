import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage'; // Ojo: si usas "export default", va sin llaves {}

// ... tu dashboard ...
// Agrega esto en App.tsx para que no falle la ruta /dashboard
const Dashboard = () => {
  return <h2>Bienvenido al Dashboard (Vista Protegida)</h2>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ahora esta única ruta maneja Login Y Registro */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Redirigir la raíz al login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Tu ruta protegida */}
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;