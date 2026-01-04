import React, { useState } from 'react';
import '../styles/AboutModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// --- DATOS COMPLETOS (10 PESTAÑAS) ---
const slides = [
  {
    icon: "🚀",
    title: "Gestión Integral",
    text: "Bienvenido a la evolución de tu negocio. Hemos integrado inventario, ventas y finanzas en una sola plataforma oscura, moderna y optimizada para la velocidad."
  },
  {
    icon: "🛒",
    title: "Punto de Venta",
    text: "Vende sin fricción. Agrega productos al carrito visualmente, calcula vueltos automáticos y cierra ventas en segundos. Una experiencia fluida tanto en PC como en celular."
  },
  {
    icon: "🏆",
    title: "Productos Estrella",
    text: "¿Sabes cuál es tu producto ganador? Nuestro Dashboard incluye un ranking en tiempo real de los artículos más vendidos para que nunca te falte lo que tus clientes más buscan."
  },
  {
    icon: "🚨",
    title: "Asistente de Compras",
    text: "No pierdas ventas por falta de stock. El sistema detecta automáticamente los productos con pocas unidades y te genera una lista de alerta para que sepas exactamente qué reponer."
  },
  {
    icon: "🧾",
    title: "Tickets Profesionales",
    text: "Dale seriedad a tu negocio. Genera automáticamente recibos estilo ticket térmico tras cada venta, listos para imprimir o compartir digitalmente con tus clientes."
  },
  {
    icon: "🔫",
    title: "Escáner & Cámara",
    text: "Olvídate de teclear códigos. Usa tu lector de códigos de barras o la cámara de tu celular para buscar productos y realizar ingresos de mercadería a la velocidad de la luz."
  },
  {
    icon: "💰",
    title: "Finanzas Claras",
    text: "Cuentas claras, negocio sano. Visualiza tu Ganancia Neta (Ventas - Costos), el patrimonio total invertido en bodega y tus ingresos diarios en un solo panel ejecutivo."
  },
  {
    icon: "📂",
    title: "Exportación de Datos",
    text: "Tu información te pertenece. Descarga reportes detallados de tu inventario o historial de ventas en formatos Excel (.xlsx) y PDF compatibles con cualquier sistema contable."
  },
  {
    icon: "👤",
    title: "Control Total",
    text: "Administra tu perfil, actualiza tu seguridad y mantén el control de tu sesión. Todo respaldado por una arquitectura segura (JWT) y una base de datos robusta (SQL)."
  },
  {
    icon: "🎧", // NUEVO: Soporte
    title: "Soporte Técnico",
    text: "No estás solo. Si encuentras un problema o tienes dudas, utiliza nuestro sistema de tickets integrado para contactar directamente con el equipo de soporte y recibir ayuda rápida."
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

  const reset = () => {
    setCurrentSlide(0);
  };

  return (
    <div className="about-overlay" onClick={onClose}>
      <div className="about-box" onClick={e => e.stopPropagation()}>
        <button className="btn-close-about" onClick={onClose}>×</button>
        
        {/* Contenido del Slide */}
        <div className="slide-container" key={currentSlide} style={{animation: 'fadeIn 0.3s'}}>
          <span className="slide-icon">{slides[currentSlide].icon}</span>
          <h2 className="slide-title">{slides[currentSlide].title}</h2>
          <p className="slide-description">{slides[currentSlide].text}</p>
        </div>

        {/* BARRA DE NAVEGACIÓN */}
        <div className="about-navigation">
          
          <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            {/* Botón de reinicio si no estamos en el inicio */}
            {currentSlide > 0 && (
                <button className="nav-reset" onClick={reset} title="Volver al inicio">
                    ↺
                </button>
            )}

            <button className="nav-arrow" onClick={prev} disabled={currentSlide === 0}>
                &#10094;
            </button>
          </div>
          
          {/* PUNTITOS DE NAVEGACIÓN */}
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