import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface AuthContextType {
  isSessionExpired: boolean;
  setIsSessionExpired: (value: boolean) => void;
  apiCall: (url: string, options?: RequestInit) => Promise<Response>;
  login: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Función envoltorio para fetch que detecta 401 automáticamente
  const apiCall = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");
    
    const headers = {
      ...options.headers,
      "Authorization": token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(url, { ...options, headers });

      // SI LA RESPUESTA ES 401 (NO AUTORIZADO), ACTIVAMOS EL MODAL
      if (response.status === 401) {
        setIsSessionExpired(true);
      }

      return response;
    } catch (error) {
      console.error("Error en apiCall:", error);
      throw error;
    }
  };

  const login = (token: string) => {
    localStorage.setItem("token", token);
    setIsSessionExpired(false); // Cerramos el modal si estaba abierto
  };

  return (
    <AuthContext.Provider value={{ isSessionExpired, setIsSessionExpired, apiCall, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};