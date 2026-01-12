import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/SalesPage.css";
// 1. IMPORTAR EL HOOK
import { useAuth } from "../context/AuthContext";

// --- INTERFACES ---
interface Product {
  id: number;
  name: string;
  sale_price: number; 
  stock: number;
}

interface CartItem extends Product {
  qty: number;
}

// Datos para el recibo/ticket
interface TicketData {
  id: number;
  date: string;
  total: number; // Este TOTAL viene del backend ya con IVA incluido
  items: CartItem[];
  payment_method: string;
}

const SalesPage = () => {
  document.title = "Punto de Venta | NexusERP";
  const navigate = useNavigate();
  
  // 2. OBTENER apiCall DEL CONTEXTO
  const { apiCall } = useAuth();

  // Estados de Negocio
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados de UI (Modales)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);

  const IVA_RATE = 0.19; 
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // 3. REEMPLAZO DE FETCH POR apiCall
      // Ya no es necesario poner headers manuales
      const res = await apiCall(`${API_URL}/products`);
      
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error cargando productos", error);
    }
  };

  // --- LÓGICA DEL CARRITO ---
  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      updateQuantity(product.id, existingItem.qty + 1);
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const updateQuantity = (productId: number, newQty: number) => {
    if (newQty < 1) return;
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    if (newQty > product.stock) {
      alert(`¡Stock insuficiente! Solo quedan ${product.stock}`);
      return;
    }
    setCart(cart.map(item => item.id === productId ? { ...item, qty: newQty } : item));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const calculateTotals = () => {
    const subtotalNeto = cart.reduce((acc, item) => acc + ((item.sale_price || 0) * item.qty), 0);
    const ivaTotal = subtotalNeto * IVA_RATE;
    const totalPagar = subtotalNeto + ivaTotal;
    return { subtotalNeto, ivaTotal, totalPagar };
  };

  const { subtotalNeto, ivaTotal, totalPagar } = calculateTotals();

  // --- PROCESO DE VENTA ---

  // 1. Abrir Modal de Selección
  const initiateCheckout = () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
  };

  // 2. Finalizar venta con el método elegido
  const finalizeSale = async (method: "Efectivo" | "Débito") => {
    setShowPaymentModal(false); 
    setLoading(true);

    const saleData = {
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.qty,
      })),
      payment_method: method, // Enviamos "Débito" con tilde y mayúscula
    };

    try {
      // 4. REEMPLAZO DE FETCH POR apiCall (Guardar Venta)
      // Esto protege el carrito: si falla por auth, sale el popup y no pierdes la venta
      const res = await apiCall(`${API_URL}/sales`, {
        method: "POST",
        body: JSON.stringify(saleData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Error al procesar venta");
      }

      const responseData = await res.json();

      // Guardamos datos para el Ticket
      setTicketData({
        id: responseData.id,
        date: responseData.date,
        total: responseData.total_amount, // Viene del backend ya con IVA
        items: [...cart],
        payment_method: method 
      });

      setShowTicket(true);
      setCart([]);
      fetchProducts(); // Actualizar stocks

    } catch (error: any) {
      // Si apiCall manejó el 401, aquí no llegamos, así que solo mostramos otros errores
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Acciones del Ticket
  const closeTicket = () => {
    setShowTicket(false);
    setTicketData(null);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    if (ticketData) {
        const date = new Date(ticketData.date);
        const formattedDate = date.toLocaleDateString("es-CL").replace(/-/g, "").replace(/\//g, "-");
        const formattedTime = date.toLocaleTimeString("es-CL", { hour12: false }).replace(/:/g, "-");
        document.title = `Comprobante_${formattedDate}_${formattedTime}`;
    }
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 1000);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="sales-container">
      
      {/* --- SECCIÓN IZQUIERDA: CATÁLOGO --- */}
      <div className="catalog-section">
        <div className="header-actions">
          <div>
            <h1 style={{margin:0, fontSize: '1.8rem'}}>Punto de Venta</h1>
            <p style={{color: '#888', margin: 0}}>Selecciona productos para añadir</p>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{background: '#333', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer'}}
          >
            Salir ✕
          </button>
        </div>

        <div style={{marginBottom: '30px'}}>
           <input
            type="text"
            placeholder="🔍 Buscar producto..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="products-grid">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`product-card-pos ${product.stock === 0 ? "disabled" : ""}`}
              onClick={() => product.stock > 0 && addToCart(product)}
            >
              <div className="card-icon-placeholder">📦</div>
              <div className="product-info">
                <h3>{product.name}</h3>
                <p>Stock: {product.stock}</p>
              </div>
              <div className="pos-price-tag">
                ${(product.sale_price || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- SECCIÓN DERECHA: CARRITO --- */}
      <div className="cart-section">
        <div className="cart-header">
          <h2 style={{margin: 0}}>Venta en Curso</h2>
          <span style={{color: '#aaa', fontSize: '0.9rem'}}>{new Date().toLocaleDateString()}</span>
        </div>

        <div className="cart-items-container">
          {cart.length === 0 ? (
            <div style={{textAlign: 'center', marginTop: '50px', opacity: 0.5}}>
              <div style={{fontSize: '3rem'}}>🛒</div>
              <p>Carrito vacío</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-details" style={{flex: 1}}>
                  <h4>{item.name}</h4>
                  <small>Unit: ${(item.sale_price || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 })}</small>
                </div>
                <div className="qty-controls">
                  <button className="btn-qty" onClick={() => updateQuantity(item.id, item.qty - 1)}>-</button>
                  <span className="qty-display">{item.qty}</span>
                  <button className="btn-qty" onClick={() => updateQuantity(item.id, item.qty + 1)}>+</button>
                </div>
                <div style={{fontWeight: 'bold', minWidth: '70px', textAlign: 'right', marginRight: '10px'}}>
                   ${((item.sale_price || 0) * item.qty).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </div>
                <button className="btn-delete" onClick={() => removeFromCart(item.id)}>×</button>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="summary-row">
            <span>Subtotal Neto</span>
            <span>${subtotalNeto.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="summary-row">
            <span>IVA (19%)</span>
            <span>${ivaTotal.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="total-row">
            <span>TOTAL A PAGAR</span>
            <span>${totalPagar.toLocaleString('es-CL', { maximumFractionDigits: 0 })}</span>
          </div>
          <button
            className="btn-pay"
            onClick={initiateCheckout}
            disabled={cart.length === 0 || loading}
          >
            {loading ? "Procesando..." : "💰 PAGAR AHORA"}
          </button>
        </div>
      </div>

      {/* --- NUEVO MODAL: SELECCIÓN DE MÉTODO DE PAGO --- */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="payment-modal-content">
            <h2 className="payment-title">Finalizar Venta</h2>
            
            <div className="payment-options">
                
                {/* OPCIÓN 1: EFECTIVO (Estilo Verde Dashboard) */}
                <button 
                    className="payment-card-btn style-green"
                    onClick={() => finalizeSale("Efectivo")}
                >
                    <div className="payment-icon-box">💵</div>
                    <div className="payment-text-group">
                        <span className="payment-label-small">Pago en Caja</span>
                        <span className="payment-value-large">Efectivo</span>
                    </div>
                </button>
                
                {/* OPCIÓN 2: DÉBITO (Estilo Azul Dashboard) */}
                <button 
                    className="payment-card-btn style-blue"
                    onClick={() => finalizeSale("Débito")}
                >
                    <div className="payment-icon-box">💳</div>
                    <div className="payment-text-group">
                        <span className="payment-label-small">Transbank / Tarjeta</span>
                        <span className="payment-value-large">Débito o Crédito</span>
                    </div>
                </button>

            </div>

            {/* BOTÓN CANCELAR CON EFECTO ROJO */}
            <button 
                className="btn-payment-cancel"
                onClick={() => setShowPaymentModal(false)}
            >
                Cancelar Operación
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL: COMPROBANTE DE PAGO --- */}
      {showTicket && ticketData && (
        <div className="modal-overlay">
          <div className="ticket-container">
            
            <div className="ticket-header">
              <h2 style={{textTransform: 'uppercase', marginBottom: '10px'}}>COMPROBANTE DE PAGO</h2>
              
              <div style={{fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '5px'}}>
                {new Date(ticketData.date).toLocaleDateString('es-CL')}
              </div>
              <div style={{fontSize: '0.9rem', color: '#555'}}>
                Hora: {new Date(ticketData.date).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}
              </div>
              
              <p style={{marginTop: '10px', fontSize: '0.8rem'}}>Ticket ID: #{ticketData.id}</p>
              
              {/* AQUÍ SE MUESTRA EL DÉBITO EN MAYÚSCULAS */}
              <p style={{fontSize: '0.9rem', marginTop: '5px', fontWeight: 'bold', color: '#333'}}>
                PAGO: {ticketData.payment_method.toUpperCase()}
              </p>
            </div>

            <div className="ticket-divider"></div>

            <div className="ticket-body">
              {ticketData.items.map((item, idx) => (
                <div key={idx} className="ticket-row">
                  <span>{item.qty} x {item.name}</span>
                  {/* PRECIO UNITARIO YA VIENE NETO, SOLO SE MULTIPLICA */}
                  <span>${((item.sale_price || 0) * item.qty).toLocaleString('es-CL')}</span>
                </div>
              ))}
            </div>

            <div className="ticket-divider"></div>

            {/* DESGLOSE DE IMPUESTOS */}
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginBottom: '4px'}}>
              <span>Neto</span>
              {/* Calculamos el neto dividiendo el TOTAL (que ya tiene IVA) por 1.19 */}
              <span>${Math.round(ticketData.total / 1.19).toLocaleString('es-CL')}</span>
            </div>
            
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginBottom: '10px'}}>
              <span>IVA (19%)</span>
              {/* El IVA es la diferencia entre Total y Neto */}
              <span>${(ticketData.total - Math.round(ticketData.total / 1.19)).toLocaleString('es-CL')}</span>
            </div>

            <div className="ticket-total">
              <span>TOTAL</span>
              <span>${ticketData.total.toLocaleString('es-CL')}</span>
            </div>

            <div style={{marginTop: '20px', fontSize: '0.8rem', color: '#555', fontStyle: 'italic'}}>
              <p>*** Gracias por su compra ***</p>
            </div>

            <div className="ticket-actions no-print">
              <button className="btn-print" onClick={handlePrint}>🖨️ Imprimir</button>
              <button className="btn-close-modal" onClick={closeTicket}>Nueva Venta ➜</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SalesPage;