import React, { useState } from 'react';
import '../styles/AboutModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// --- DATOS AMPLIADOS (7 PESTAÑAS) ---
const slides = [
  {
    icon: "🚀",
    title: "Tu Negocio, Bajo Control",
    text: "Centraliza toda la operación de tu almacén en una sola plataforma. Dile adiós al caos de los cuadernos y hojas de cálculo. Gestiona tu inventario de forma rápida, moderna y sin complicaciones."
  },
  {
    icon: "📱", // NUEVO
    title: "Acceso Total",
    text: "Lleva tu negocio en el bolsillo. Nuestra interfaz es 100% responsiva, lo que significa que puedes revisar el stock, hacer ajustes o ver reportes desde tu celular, tablet o computadora."
  },
  {
    icon: "📦",
    title: "Inventario Inteligente",
    text: "Agrega productos, actualiza precios y ajusta el stock en segundos. El sistema trabaja por ti: te avisa automáticamente con alertas visuales rojas cuando un producto está por agotarse."
  },
  {
    icon: "⚡", // NUEVO
    title: "Flujo de Trabajo Veloz",
    text: "Diseñado para la velocidad. Escanea códigos, busca productos instantáneamente y registra movimientos con menos clics. Ahorra horas de trabajo administrativo cada semana."
  },
  {
    icon: "📈",
    title: "Decisiones con Datos",
    text: "No adivines, mide. Visualiza el valor monetario real de tu bodega y analiza el rendimiento general mediante gráficos interactivos y métricas financieras en tiempo real."
  },
  {
    icon: "📝",
    title: "Trazabilidad Total",
    text: "Seguridad y transparencia. Cada entrada o salida queda registrada en un historial inmutable. Sabrás exactamente qué pasó, cuándo pasó y qué usuario realizó el ajuste."
  },
  {
    icon: "🛡️",
    title: "Seguridad y Soporte",
    text: "Tu información está blindada con estándares de seguridad modernos (JWT). Además, cuentas con un módulo de soporte técnico integrado para resolver cualquier duda al instante."
  }
];

const AboutModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const next = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(curr => curr + 1);
  };

  const prev = () => {
    if (currentSlide > 0) setCurrentSlide(curr => curr - 1);
  };

  // Función para volver al inicio
  const reset = () => {
    setCurrentSlide(0);
  };

  return (
    <div className="about-overlay" onClick={onClose}>
      <div className="about-box" onClick={e => e.stopPropagation()}>
        <button className="btn-close-about" onClick={onClose}>×</button>
        
        <div className="slide-container" key={currentSlide}>
          <span className="slide-icon">{slides[currentSlide].icon}</span>
          <h2 className="slide-title">{slides[currentSlide].title}</h2>
          <p className="slide-description">{slides[currentSlide].text}</p>
        </div>

        {/* BARRA DE NAVEGACIÓN */}
        <div className="about-navigation">
          
          <div style={{display: 'flex', alignItems: 'center'}}>
            {/* BOTÓN REINICIAR (NUEVO) */}
            {currentSlide > 0 && (
                <button className="nav-reset" onClick={reset} title="Volver al inicio">
                    ↺
                </button>
            )}

            <button className="nav-arrow" onClick={prev} disabled={currentSlide === 0}>
                &#10094;
            </button>
          </div>
          
          <div className="nav-dots">
            {slides.map((_, index) => (
              <span 
                key={index} 
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                style={{cursor: 'pointer'}}
              />
            ))}
          </div>

          <button className="nav-arrow" onClick={next} disabled={currentSlide === slides.length - 1}>
            &#10095;
          </button>
        </div>

      </div>
    </div>
  );
};

export default AboutModal;