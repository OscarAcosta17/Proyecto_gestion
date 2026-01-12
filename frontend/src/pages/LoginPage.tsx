import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LoginPage.css'; 
import AboutModal from '../components/AboutModal';


// --- ANIMACIÓN AL SCROLLEAR ---
interface RevealProps {
  children: ReactNode;
  className?: string;
}

const RevealOnScroll = ({ children, className = "" }: RevealProps) => {
  const [isVisible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 } 
    );
    if (currentRef) observer.observe(currentRef);
    return () => { if (currentRef) observer.unobserve(currentRef); };
  }, []);

  return (
    <div ref={ref} className={`reveal-wrapper ${isVisible ? 'active' : 'inactive'} ${className}`}>
      {children}
    </div>
  );
};

// --- COMPONENTE FAQ ---
const FaqItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={`faq-item ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(!isOpen)}>
            <div className="faq-question">
                {question}
                <span className="faq-toggle">{isOpen ? '−' : '+'}</span>
            </div>
            <div className="faq-answer-wrapper">
                <div className="faq-answer">{answer}</div>
            </div>
        </div>
    );
};

const LoginPage = () => {
  document.title = "Inicio | NexusERP";
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  // --- NUEVO ESTADO PARA LA ANIMACIÓN INICIAL ---
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // La animación dura en total unos 3.5 segundos
    // 2.5s de espera estática + 1s de transición
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // Tiempo que el logo se queda quieto antes de desvanecerse

    return () => clearTimeout(timer);
  }, []);
  // -------------------------------------------

  // --- LÓGICA FORMULARIO (Sin cambios) ---
  const [formData, setFormData] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '', address: '' });
  const [errors, setErrors] = useState<any>({});
  const [globalError, setGlobalError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: false });
    if (globalError) setGlobalError('');
  };

  const validateForm = () => {
    let newErrors: any = {};
    let isValid = true;
    if (!formData.email.trim()) newErrors.email = true;
    if (!formData.password.trim()) newErrors.password = true;
    if (!isLogin) {
      if (!formData.first_name.trim()) newErrors.first_name = true;
      if (!formData.last_name.trim()) newErrors.last_name = true;
      if (!formData.phone.trim()) newErrors.phone = true;
      if (!formData.address.trim()) newErrors.address = true;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setGlobalError('Complete los campos requeridos');
      isValid = false;
    }
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    // CORRECCIÓN: Usamos ruta relativa "/api" siempre.
    // Esto obliga a pasar por el Proxy de Vite que configuramos.
    let backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';; 
    if (backendUrl.endsWith('/')) {
      backendUrl = backendUrl.slice(0, -1);
    }
    
    const endpoint = isLogin ? '/login' : '/register';
    const bodyData = isLogin ? { email: formData.email, password: formData.password } : formData;
    
    try {
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || 'Error en la solicitud');
      
      if (isLogin) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('userEmail', formData.email); 
        localStorage.setItem('userId', data.user_id);
        localStorage.setItem('first_name', data.first_name || '');
        if(data.first_name) localStorage.setItem('userName', data.first_name);
        localStorage.setItem('isAdmin', String(data.is_admin));
        if (data.is_admin) navigate('/admin'); else navigate('/dashboard');
      } else {
        alert('¡Registro exitoso! Ahora por favor inicia sesión.');
        setFormData({ email: '', password: '', first_name: '', last_name: '', phone: '', address: '' });
        setIsLogin(true); 
      }
    } catch (error: any) {
      setGlobalError(error.message || 'Error de conexión con el servidor');
    }
  };
  // ------------------------------

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToAuth = (login: boolean) => {
    setIsLogin(login);
    scrollToSection('auth-target');
  };

  return (
    <>
      {/* --- 1. PANTALLA DE INTRODUCCIÓN (SPLASH) --- */}
      {/* Se mantiene en el DOM pero se desvanece con CSS */}
      <div className={`splash-overlay ${!showSplash ? 'splash-exit' : ''}`}>
        <div className="splash-content">
            <h1 className="splash-logo">Nexus<span className="text-highlight">ERP</span></h1>
            <div className="loading-bar"></div>
        </div>
      </div>

      {/* --- 2. CONTENEDOR PRINCIPAL (Se anima al entrar) --- */}
      <div className={`master-container ${!showSplash ? 'content-enter' : 'content-hidden'}`}>
        {/* FONDO ANIMADO */}
        <div className="moving-grid-background">
          <div className="grid-plane"></div>
          <div className="grid-glow"></div>
        </div>
        
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

        <nav className="glass-navbar">
          <div className="nav-brand">Nexus<span className="text-highlight">ERP</span></div>
          <div className="nav-menu">
              <button onClick={() => scrollToSection('benefits')}>Beneficios</button>
              <button onClick={() => scrollToSection('pricing')}>Suscripción</button>
              <button onClick={() => scrollToSection('faq')}>Preguntas</button>
          </div>
          <button className="nav-cta" onClick={() => goToAuth(true)}>Acceso Clientes</button>
        </nav>

        {/* HERO */}
        <section className="hero-fullscreen">
          <div className="hero-content">
              <div className="badge-new">POTENCIA TU NEGOCIO </div>
              <h1 className="hero-headline">
                  Todo tu negocio en una <br/> sola plataforma.
              </h1>

              {/* BADGE GEMINI CON LOGO SVG */}
              <div className="hero-ai-badge">
                <span className="ai-label">Potenciado por</span>
                <div className="ai-brand-container">
                    <svg className="gemini-logo-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                        <defs>
                            <linearGradient id="geminiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{stopColor:'#60a5fa', stopOpacity:1}} />
                                <stop offset="100%" style={{stopColor:'#c084fc', stopOpacity:1}} />
                            </linearGradient>
                        </defs>
                        <path fill="url(#geminiGradient)" d="M12,2 L14.4,8.6 L21,11 L14.4,13.4 L12,20 L9.6,13.4 L3,11 L9.6,8.6 L12,2 Z" />
                    </svg>
                    <span className="ai-name">Gemini</span>
                </div>
              </div>
              {/* ----------------------------- */}

              <p className="hero-subtext">
                  Centraliza inventario, ventas y facturación en una plataforma diseñada para empresas que no pueden darse el lujo de fallar.
              </p>
              <div className="hero-buttons">
                  <button className="btn-primary-big" onClick={() => scrollToSection('pricing')}>Ver Plan Único</button>
                  <button className="btn-secondary-big" onClick={() => scrollToSection('benefits')}>Descubrir Más</button>
              </div>
              
              <div className="trust-badges">
                  <span>⚡ Uptime 99.9%</span>
                  <span>🤝 Soporte Dedicado</span>
              </div>
          </div>
        </section>

        {/* SECCIONES (Contenido normal...) */}
        <section id="benefits" className="section-padding">
            <RevealOnScroll className="zigzag-row">
                <div className="zigzag-text">
                    <h2>Control Total del Stock.</h2>
                    <p>Deja de adivinar. Nuestro algoritmo predice cuándo se acabará tu producto estrella y te avisa antes de que pierdas ventas.</p>
                    <ul className="benefit-list">
                        <li>✅ Trazabilidad completa de movimientos</li>
                        <li>✅ Soporte para múltiples bodegas</li>
                        <li>✅ Integración con lectores de código de barras</li>
                    </ul>
                </div>
                <div className="zigzag-visual glass-box">
                    <div className="mockup-alert">
                        <div className="alert-icon">📊</div>
                        <div className="alert-text">
                            <strong>Predicción de Demanda</strong>
                            <span>Se requiere reponer "Monitores" en 3 días.</span>
                        </div>
                    </div>
                </div>
            </RevealOnScroll>

            <RevealOnScroll className="zigzag-row reverse">
                <div className="zigzag-text">
                    <h2>Rentabilidad en Tiempo Real.</h2>
                    <p>No esperes a fin de mes para saber si ganaste dinero. Visualiza tu margen de utilidad neto en vivo, descontando costos variables.</p>
                    <ul className="benefit-list">
                        <li>✅ Cálculo automático de márgenes</li>
                        <li>✅ Reportes exportables para SII</li>
                        <li>✅ Detección de fugas de dinero</li>
                    </ul>
                </div>
                <div className="zigzag-visual glass-box graph-visual">
                    <div className="floating-stat">
                        <span>Margen Neto (Hoy)</span>
                        <strong>+24.5%</strong>
                    </div>
                    <div className="simple-graph">
                        <div className="bar" style={{height:'40%'}}></div>
                        <div className="bar active" style={{height:'90%'}}></div>
                        <div className="bar" style={{height:'60%'}}></div>
                    </div>
                </div>
            </RevealOnScroll>

            <RevealOnScroll className="ecosystem-grid">
                <div className="eco-card"><span className="eco-icon">☁️</span><h4>100% Cloud</h4><p>Accede desde cualquier dispositivo, en cualquier lugar del mundo.</p></div>
                <div className="eco-card"><span className="eco-icon">🔐</span><h4>Roles y Permisos</h4><p>Define quién puede ver precios de costo y quién solo vende.</p></div>
                <div className="eco-card"><span className="eco-icon">🧾</span><h4>Facturación</h4><p>Preparado para integración directa con boleta electrónica.</p></div>
                <div className="eco-card"><span className="eco-icon">🚀</span><h4>API Abierta</h4><p>Conecta tu E-commerce o CRM favorito sin fricción.</p></div>
            </RevealOnScroll>
        </section>

        <section id="pricing" className="section-padding centered">
            <RevealOnScroll><h2 className="section-title">Un solo plan. Todo incluido.</h2><p className="section-subtitle">Sin letras chicas. Sin costos ocultos por módulos extra.</p></RevealOnScroll>
            <RevealOnScroll className="pricing-single-wrapper">
                <div className="pricing-titanium">
                    <div className="glow-effect"></div>
                    <div className="pricing-content">
                        <div className="plan-header"><h3>Licencia Enterprise</h3><div className="price">1.5 UF<span>/mes + IVA</span></div><p>La solución definitiva para escalar tu operación.</p></div>
                        <div className="plan-divider"></div>
                        <div className="features-grid">
                            <ul className="check-list"><li>Usuarios Ilimitados</li><li>Productos Ilimitados</li><li>Multisucursal</li><li>Soporte Prioritario WhatsApp</li></ul>
                            <ul className="check-list"><li>Backup Diario Automático</li><li>Dashboard de Business Intelligence</li><li>App Móvil de Consulta</li><li>Capacitación Inicial Incluida</li></ul>
                        </div>
                        <button className="btn-titanium" onClick={() => goToAuth(false)}>Comenzar Ahora</button>
                    </div>
                </div>
            </RevealOnScroll>
        </section>
      
        <section id="faq" className="section-padding centered narrow">
            <RevealOnScroll><h2 className="section-title faq-title">Preguntas Frecuentes</h2></RevealOnScroll>
            <div className="faq-container">
                <FaqItem question="¿El valor en UF es fijo?" answer="El pago se realiza en pesos chilenos según el valor de la UF del día de facturación. Esto garantiza que podamos mantener la calidad de nuestros servidores y soporte." />
                <FaqItem question="¿Incluye integración con el SII?" answer="El sistema genera los archivos necesarios para la contabilidad. Contamos con módulos adicionales para conexión directa de Boleta Electrónica (consultar factibilidad)." />
                <FaqItem question="¿Necesito un servidor propio?" answer="No. Nosotros nos encargamos del hosting en AWS (Amazon Web Services), seguridad y copias de respaldo. Tú solo te preocupas de vender." />
                <FaqItem question="¿Puedo migrar mis datos de Excel/PDF?" answer="Sí. Contamos con una herramienta que permite transpasar los datos de la plataforma a formato excel y pdf" />
                <FaqItem question="¿Hay contrato de permanencia?" answer="No. Puedes cancelar tu suscripción cuando quieras. Creemos en retenerte por la calidad del servicio, no por un contrato." />

            </div>
        </section>

        <section id="auth-target" className="auth-section-final">
            <div className="auth-container">
                <div className="cyber-auth-box">
                    <div className="auth-header-modern">
                        
                        {/* SWITCH CON ANIMACIÓN DE PASTILLA */}
                        <div className="auth-mode-switch">
                            {/* La pastilla que se mueve */}
                            <div 
                                className="auth-glider" 
                                style={{ transform: isLogin ? 'translateX(0%)' : 'translateX(100%)' }}
                            ></div>
                            
                            <button 
                                className={isLogin ? 'active' : ''} 
                                onClick={() => { setIsLogin(true); setErrors({}); setGlobalError(''); }}
                            >
                                Login
                            </button>
                            <button 
                                className={!isLogin ? 'active' : ''} 
                                onClick={() => { setIsLogin(false); setErrors({}); setGlobalError(''); }}
                            >
                                Registro
                            </button>
                        </div>

                        <h2>{isLogin ? 'Acceso Seguro' : 'Alta de Servicio'}</h2>
                    </div>

                    {globalError && <div className="cyber-error">{globalError}</div>}
                    
                    <form onSubmit={handleSubmit} className="cyber-form">
                        
                        {/* CAMPOS EXTRA SUPERIORES (NOMBRE/APELLIDO) */}
                        <div className={`expandable-container ${!isLogin ? 'open' : ''}`}>
                            <div className="expandable-inner">
                                <div className="input-row">
                                    <div className="input-field">
                                        <input 
                                            type="text" 
                                            name="first_name" 
                                            required={!isLogin} // Solo requerido si NO es login
                                            placeholder=" " 
                                            value={formData.first_name} 
                                            onChange={handleChange} 
                                        />
                                        <label>Nombre</label>
                                    </div>
                                    <div className="input-field">
                                        <input 
                                            type="text" 
                                            name="last_name" 
                                            required={!isLogin} 
                                            placeholder=" " 
                                            value={formData.last_name} 
                                            onChange={handleChange} 
                                        />
                                        <label>Apellido</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CAMPOS COMUNES (SIEMPRE VISIBLES) */}
                        <div className="input-field">
                            <input type="email" name="email" required placeholder=" " value={formData.email} onChange={handleChange} />
                            <label>Correo Electrónico</label>
                        </div>
                        <div className="input-field">
                            <input type="password" name="password" required placeholder=" " value={formData.password} onChange={handleChange} />
                            <label>Contraseña</label>
                        </div>

                        {/* CAMPOS EXTRA INFERIORES (TELÉFONO/DIRECCIÓN) */}
                        <div className={`expandable-container ${!isLogin ? 'open' : ''}`}>
                            <div className="expandable-inner">
                                <div className="input-row">
                                    <div className="input-field">
                                        <input 
                                            type="text" 
                                            name="phone" 
                                            required={!isLogin} 
                                            placeholder=" " 
                                            value={formData.phone} 
                                            onChange={handleChange} 
                                        />
                                        <label>Teléfono</label>
                                    </div>
                                    <div className="input-field">
                                        <input 
                                            type="text" 
                                            name="address" 
                                            required={!isLogin} 
                                            placeholder=" " 
                                            value={formData.address} 
                                            onChange={handleChange} 
                                        />
                                        <label>Dirección</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="btn-cyber-submit">
                            {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
                            <span className="btn-glare"></span>
                        </button>
                    </form>
                </div>
            </div>
        </section>

        {/* --- FOOTER ESTILO PRISMAL --- */}
        <footer className="modern-footer">
          <div className="footer-content">
            
            {/* Columna 1: Marca y Redes */}
            <div className="footer-col brand-col">
              <div className="footer-logo">Nexus<span className="text-highlight">ERP</span></div>
              <p className="footer-desc">
                Plataforma integral de gestión potenciada con IA para negocios que buscan escalar. Control de inventario, ventas y facturación en un solo lugar.
              </p>
              <div className="social-icons">
                {/* Icono LinkedIn */}
                <a href="#" className="social-btn">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                {/* Icono GitHub */}
                <a href="#" className="social-btn">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
            </div>

            {/* Columna 2: Producto */}
            <div className="footer-col">
              <h4>Producto</h4>
              <ul>
                <li><a href="#">Funciones</a></li>
                <li><a href="#">Precios</a></li>
                <li><a href="#">Integraciones</a></li>
              </ul>
            </div>

            {/* Columna 3: Empresa */}
            <div className="footer-col">
              <h4>Empresa</h4>
              <ul>
                <li><a href="#">Sobre nosotros</a></li>
                <li><a href="#">Contacto</a></li>
              </ul>
            </div>

            {/* Columna 4: Legal */}
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Términos y condiciones</a></li>
                <li><a href="#">Política de privacidad</a></li>
              </ul>
            </div>

          </div>
          
          <div className="footer-bottom">
            <p>© 2026 NexusERP Chile. Todos los derechos reservados.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LoginPage;