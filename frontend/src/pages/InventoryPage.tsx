import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, createProduct, updateStock, updateProduct } from "../services/api";
import BarcodeScanner from "../components/BarcodeScanner";
import { exportToExcel, exportToPDF } from "../components/exportUtils"; 
import "../styles/InventoryPage.css"; 
import { useAuth } from "../context/AuthContext";

interface Product {
  id: number;
  barcode: string;
  name: string;
  stock: number;
  cost_price: number;
  sale_price: number;
}

const InventoryPage = () => {
  document.title = "Inventario | NexusERP";
  const navigate = useNavigate();
  const { apiCall } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  // --- ESTADOS GENERALES ---
  const [products, setProducts] = useState<Product[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  
  // Control de visualización de paneles
  const [showProductionForm, setShowProductionForm] = useState(false); 
  const [showStandardForm, setShowStandardForm] = useState(false);
  
  const [showStockModal, setShowStockModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [feedback, setFeedback] = useState<{msg: string, type: 'in' | 'out'} | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  
  // Estados del Modal de Ajuste
  const [stockMode, setStockMode] = useState<'unit' | 'box'>('unit');
  const [updateType, setUpdateType] = useState<'suma' | 'resta' | 'set'>('suma');
  const [boxDetails, setBoxDetails] = useState({ boxes: 1, unitsPerBox: 1 });
  const [quantityInput, setQuantityInput] = useState(0);
  const [modalPrices, setModalPrices] = useState({ cost: 0, sale: 0 });

  // --- FORMULARIO ESTÁNDAR ---
  const [formData, setFormData] = useState({
    barcode: "", name: "", stock: 0, cost_price: 0, sale_price: 0
  });

  // --- FORMULARIO DE PRODUCCIÓN (Elaboración Propia) ---
  const [prodForm, setProdForm] = useState({
    name: "", 
    cost_price: 0, 
    sale_price: 0, 
    stock: 0,
    weight_grams: 0, 
    pricing_mode: 'unit' as 'unit' | 'kilo'
  });

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const check = await apiCall(`${API_URL}/products?limit=1`); 
      if (check.status === 401) return;
      const data = await getProducts();
      setProducts(data);
    } catch (error) { console.error(error); }
  };

  const visibleProducts = useMemo(() => {
    let filtered = products;
    if (!showZeroStock) filtered = filtered.filter(p => p.stock > 0);
    
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(lowerTerm) || p.barcode.includes(lowerTerm));
    }
    
    if (sortConfig) {
      filtered.sort((a: any, b: any) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [products, sortConfig, searchTerm, showZeroStock]);

  const inventoryValue = useMemo(() => products.reduce((acc, p) => acc + (p.stock * p.cost_price), 0), [products]);
  const totalItems = useMemo(() => products.reduce((acc, p) => acc + p.stock, 0), [products]);

  const calculateTotalQuantity = () => stockMode === 'box' ? boxDetails.boxes * boxDetails.unitsPerBox : quantityInput;
  const showFeedback = (msg: string, type: 'in' | 'out') => { setFeedback({ msg, type }); setTimeout(() => setFeedback(null), 3000); };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <span style={{opacity:0.2, fontSize:'0.7rem'}}> ▼</span>;
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  // --- LÓGICA DE CÁLCULO DE CONVERSIÓN ---
  const getConversionPreview = (price: number) => {
      if (!prodForm.weight_grams || prodForm.weight_grams <= 0) return null;
      if (price <= 0) return null;

      if (prodForm.pricing_mode === 'unit') {
          // Tengo precio UNIDAD, calculo precio KILO
          const perKilo = (price / prodForm.weight_grams) * 1000;
          return `$${Math.round(perKilo).toLocaleString()}/kg`;
      } else {
          // Tengo precio KILO, calculo precio UNIDAD
          const perUnit = (price / 1000) * prodForm.weight_grams;
          return `$${Math.round(perUnit).toLocaleString()}/u`;
      }
  };

  const openAdjustModal = (product: Product) => {
      setSelectedProduct(product);
      setUpdateType('suma');
      setStockMode('unit');
      setQuantityInput(0);
      setBoxDetails({ boxes: 1, unitsPerBox: 1 });
      setModalPrices({ cost: product.cost_price, sale: product.sale_price });
      setShowStockModal(true);
  };

  const handleScan = (code: string) => {
    setScannerActive(false);
    const existing = products.find(p => p.barcode === code);
    if (existing) { 
        openAdjustModal(existing); 
    } else { 
        setFormData(p => ({...p, barcode: code})); 
        setShowStandardForm(true);
        showFeedback("Producto no existe. Créalo abajo.", 'in');
    }
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.barcode.trim() || !formData.name.trim()) return showFeedback("Faltan datos", 'out');
    
    try {
        await createProduct(formData);
        showFeedback("✅ Producto Creado", 'in');
        setFormData({barcode:"", name:"", stock:0, cost_price:0, sale_price:0});
        loadProducts();
    } catch (err:any) { showFeedback(err.message, 'out'); }
  };

  // --- NUEVA LÓGICA DE ID CORTO ---
  const handleProductionSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const userId = localStorage.getItem('userId') || '0';
      // Generamos un string aleatorio corto de 4 caracteres
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      // ID FINAL: INT-{USER}-{RANDOM} -> Ej: INT-15-X7Z9
      const autoCode = `INT-${userId}-${randomSuffix}`;
      
      if (!prodForm.name.trim()) return showFeedback("Nombre obligatorio", 'out');
      
      try {
          await createProduct({
              barcode: autoCode,
              name: prodForm.name,
              stock: prodForm.stock,
              cost_price: prodForm.cost_price,
              sale_price: prodForm.sale_price
          });

          showFeedback("👨‍🍳 Producción Registrada", 'in');
          setProdForm({ name: "", cost_price: 0, sale_price: 0, stock: 0, weight_grams: 0, pricing_mode: 'unit' });
          loadProducts();

      } catch (err: any) { showFeedback(err.message, 'out'); }
  };

  const handleUpdateSubmit = async () => {
    if (!selectedProduct) return;
    const qty = calculateTotalQuantity();
    const userId = Number(localStorage.getItem('userId')) || 0;
    try { 
        if (qty > 0) await updateStock({ barcode: selectedProduct.barcode, user_id: userId, movement_type: updateType, quantity: qty });
        if (modalPrices.cost !== selectedProduct.cost_price || modalPrices.sale !== selectedProduct.sale_price) {
             await updateProduct(selectedProduct.id, { cost_price: modalPrices.cost, sale_price: modalPrices.sale });
        }
        showFeedback("✅ Actualizado", 'in'); 
        setShowStockModal(false); 
        loadProducts(); 
    } catch (error: any) { showFeedback(error.message, 'out'); }
  };

  // Renderizadores de inputs
  const renderQuantityInputs = (isModal = false) => {
      const wrapperClass = "stock-input-container";
      if (stockMode === 'unit') {
          return (
            <div className={wrapperClass}>
                <input type="number" placeholder="0" value={isModal ? quantityInput : formData.stock} 
                       onChange={e => isModal ? setQuantityInput(Number(e.target.value)) : setFormData({...formData, stock: Number(e.target.value)})} />
            </div>
          );
      } else {
          return (
            <div className={wrapperClass}>
                <div className="box-inputs-row">
                    <input type="number" placeholder="Cajas" value={boxDetails.boxes} onChange={e => setBoxDetails({...boxDetails, boxes: Number(e.target.value)})} />
                    <span className="box-x">×</span>
                    <input type="number" placeholder="Unid." value={boxDetails.unitsPerBox} onChange={e => setBoxDetails({...boxDetails, unitsPerBox: Number(e.target.value)})} />
                </div>
            </div>
          );
      }
  };

  const renderModeSelector = () => (
    <div className="stock-mode-selector">
        <button type="button" className={`mode-btn ${stockMode === 'unit' ? 'active' : ''}`} onClick={() => setStockMode('unit')}>Por Unidad</button>
        <button type="button" className={`mode-btn ${stockMode === 'box' ? 'active' : ''}`} onClick={() => setStockMode('box')}>Por Caja</button>
    </div>
  );

  return (
    <div className="app">
      <div className="header-container">
        <div className="header-content">
          <h1>Gestión de Inventario</h1>
          <p>Administra tus productos y stock</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/dashboard')}>← Volver</button>
      </div>

      {feedback && <div className={`card ${feedback.type === 'in' ? 'form-card' : 'scanner-card'}`} style={{textAlign:'center',padding:'10px'}}>{feedback.msg}</div>}

      <div className="grid">
        <div className="left-column">
          <div className="kpi-container">
            <div className="kpi-card green"><span className="kpi-label">Capital</span><span className="kpi-value green-text">${inventoryValue.toLocaleString()}</span></div>
            <div className="kpi-card blue"><span className="kpi-label">Items</span><span className="kpi-value blue-text">{totalItems.toLocaleString()}</span></div>
          </div>

          {/* ========================================================= */}
          {/* TARJETA 1: ELABORACIÓN PROPIA (DISEÑO COMPACTO) */}
          {/* ========================================================= */}
          <div className="card panel-production">
             <div className="card-header-interactive" onClick={() => setShowProductionForm(!showProductionForm)}>
                 <div>
                     <h3 className="text-orange">👨‍🍳 Elaboración Propia</h3>
                     <small className="card-subtitle">Producción interna y a granel</small>
                 </div>
                 <span className="toggle-arrow text-orange">{showProductionForm ? '▲' : '▼'}</span>
             </div>
             
             {showProductionForm && (
                 <form onSubmit={handleProductionSubmit} className="slide-down-animation panel-content">
                     
                     {/* 1. NOMBRE */}
                     <div className="input-group">
                         <label>Nombre del Producto</label>
                         <input 
                            value={prodForm.name} 
                            onChange={e => setProdForm({...prodForm, name: e.target.value})}
                            placeholder="Ej: Pan Amasado, Torta..." 
                            required
                         />
                     </div>

                     {/* 2. PESO (Gramos) */}
                     <div className="input-group">
                        <label>Peso ({prodForm.pricing_mode === 'unit' ? 'por unidad' : 'referencia'})</label>
                        <div className="weight-input-wrapper">
                            <input 
                                type="number" 
                                placeholder="0" 
                                value={prodForm.weight_grams || ''} 
                                onChange={e => setProdForm({...prodForm, weight_grams: Number(e.target.value)})}
                            />
                            <span className="unit-label">gr</span>
                        </div>
                     </div>

                     {/* 3. MODO DE PRECIO (Botones grandes tipo toggle) */}
                     <div className="input-group">
                        <label>Modo de Precio</label>
                        <div className="production-toggle-group">
                            <button type="button" className={prodForm.pricing_mode === 'unit' ? 'active' : ''} onClick={() => setProdForm({...prodForm, pricing_mode: 'unit'})}>Unidad</button>
                            <button type="button" className={prodForm.pricing_mode === 'kilo' ? 'active' : ''} onClick={() => setProdForm({...prodForm, pricing_mode: 'kilo'})}>Kilo</button>
                        </div>
                     </div>

                     {/* 4. COSTO Y VENTA (En una fila) */}
                     <div className="prices-compact-row">
                         <div className="input-group">
                             <label>Costo ({prodForm.pricing_mode === 'unit' ? 'u' : 'kg'})</label>
                             <input 
                                type="number" 
                                placeholder="0" 
                                value={prodForm.cost_price || ''} 
                                onChange={e => setProdForm({...prodForm, cost_price: Number(e.target.value)})} 
                             />
                             <span className="conversion-hint">
                                {getConversionPreview(prodForm.cost_price)}
                             </span>
                         </div>
                         
                         <div className="input-group">
                             <label>Venta ({prodForm.pricing_mode === 'unit' ? 'u' : 'kg'})</label>
                             <input 
                                type="number" 
                                placeholder="0" 
                                value={prodForm.sale_price || ''} 
                                onChange={e => setProdForm({...prodForm, sale_price: Number(e.target.value)})} 
                             />
                             <span className="conversion-hint">
                                {getConversionPreview(prodForm.sale_price)}
                             </span>
                         </div>
                     </div>

                     {/* 5. CANTIDAD */}
                     <div className="input-group">
                          <label>Cantidad Producida</label>
                          <input 
                              type="number" 
                              placeholder="0" 
                              value={prodForm.stock || ''} 
                              onChange={e => setProdForm({...prodForm, stock: Number(e.target.value)})} 
                          />
                      </div>

                     {/* BOTÓN GUARDAR */}
                     <button type="submit" className="btn-orange" style={{width: '100%', marginTop: '5px'}}>
                        Guardar Producción
                     </button>
                 </form>
             )}
          </div>

          {/* ========================================================= */}
          {/* TARJETA 2: PRODUCTO ESTÁNDAR */}
          {/* ========================================================= */}
          <div className="card panel-standard form-card">
            <div className="card-header-interactive" onClick={() => setShowStandardForm(!showStandardForm)}>
                <div>
                    <h3 className="text-green">📦 Producto Nuevo</h3>
                    <small className="card-subtitle">Revendibles con código de barra</small>
                </div>
                <span className="toggle-arrow">{showStandardForm ? '▲' : '▼'}</span>
            </div>
            
            {showStandardForm && (
                <form onSubmit={handleStandardSubmit} className="slide-down-animation panel-content">
                    <div className="input-group">
                        <label>Código de Barras</label>
                        <input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} placeholder="Escanea aquí..." required />
                    </div>
                    <div className="input-group"><label>Nombre</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Coca Cola" required /></div>
                    
                    <div className="prices-grid">
                        <div className="input-group"><label>Costo $</label><input type="number" value={formData.cost_price || ''} onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})} placeholder="0" /></div>
                        <div className="input-group"><label>Venta $</label><input type="number" value={formData.sale_price || ''} onChange={e => setFormData({...formData, sale_price: Number(e.target.value)})} placeholder="0" /></div>
                    </div>
                    
                    <div className="input-group">
                        <label>Stock Inicial</label>
                        {renderModeSelector()}
                        {renderQuantityInputs(false)}
                    </div>
                    
                    <button type="submit" className="btn-primary">Guardar Producto</button>
                </form>
            )}
          </div>

          <div className="card scanner-card">
             <div className="card-header-static">
                 <h3 className="text-blue">Escáner Rápido</h3>
                 <small className="card-subtitle">Búsqueda por cámara</small>
             </div>
             <div className="panel-content">
                 {scannerActive ? (
                     <>
                        <div className="scanner-status">SISTEMA ACTIVO...</div>
                        <BarcodeScanner active={scannerActive} onScan={handleScan} />
                        <button onClick={() => setScannerActive(false)} className="btn-danger mt-10">Detener</button>
                     </>
                 ) : <button onClick={() => setScannerActive(true)} className="btn-secondary w-100">Activar Cámara</button>}
             </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (TABLA) - SIN CAMBIOS */}
        <div className="right-column">
          <div className="table-controls">
            <div className="search-wrapper"><input placeholder="🔍 Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <label className="filter-toggle" style={{whiteSpace:'nowrap'}}><input type="checkbox" checked={showZeroStock} onChange={e => setShowZeroStock(e.target.checked)} /> Agotados</label>
            <div style={{position:'relative'}}>
                <button onClick={() => setShowExportMenu(!showExportMenu)} className="btn-secondary">Exportar ▼</button>
                {showExportMenu && <div className="dropdown-menu">
                    <button onClick={() => exportToExcel(visibleProducts)}>Excel</button>
                    <button onClick={() => exportToPDF(visibleProducts)}>PDF</button>
                </div>}
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th onClick={() => handleSort('name')} style={{cursor:'pointer'}}>Nombre {getSortIcon('name')}</th>
                  <th onClick={() => handleSort('cost_price')} style={{cursor:'pointer', textAlign:'right'}}>Costo {getSortIcon('cost_price')}</th>
                  <th onClick={() => handleSort('sale_price')} style={{cursor:'pointer', textAlign:'right'}}>Precio {getSortIcon('sale_price')}</th>
                  <th onClick={() => handleSort('stock')} style={{cursor:'pointer', textAlign:'center'}}>Stock {getSortIcon('stock')}</th>
                  <th style={{textAlign:'center'}}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map(p => (
                  <tr key={p.id}>
                    <td style={{color:'#888', fontFamily:'monospace'}}>{p.barcode}</td>
                    <td style={{fontWeight:600}}>{p.name}</td>
                    <td style={{textAlign:'right', color:'#aaa'}}>${p.cost_price.toLocaleString()}</td>
                    <td style={{textAlign:'right'}}>${p.sale_price.toLocaleString()}</td>
                    <td style={{textAlign:'center'}}><span className={`badge ${p.stock<5 ? (p.stock===0?'red':'yellow') : 'green'}`}>{p.stock}</span></td>
                    <td style={{textAlign:'center'}}><button className="btn-secondary" style={{padding:'6px 12px', fontSize:'0.8rem'}} onClick={() => openAdjustModal(p)}>Ajustar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showStockModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{selectedProduct.name}</h2>
            
            <div style={{display:'flex', justifyContent:'space-between', background:'#252525', padding:'15px', borderRadius:'8px', marginBottom:'20px', border:'1px solid #333'}}>
                <span style={{color:'#aaa', marginTop: '6px'}}>Stock Actual</span><strong style={{fontSize:'1.5rem', marginRight: '20px'}}>{selectedProduct.stock}</strong>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px', background: '#1e1e1e', padding: '15px', borderRadius: '10px', border: '1px solid #333'}}>
                <div style={{display:'flex', flexDirection:'column'}}>
                    <label style={{fontSize:'0.8rem', color:'#aaa', marginBottom:'5px'}}>Costo ($)</label>
                    <input type="number" style={{background:'#111', border:'1px solid #444', padding:'8px', color:'white', borderRadius:'10px'}} value={modalPrices.cost} onChange={e => setModalPrices({...modalPrices, cost: Number(e.target.value)})} />
                </div>
                <div style={{display:'flex', flexDirection:'column'}}>
                    <label style={{fontSize:'0.8rem', color:'#aaa', marginBottom:'5px'}}>Venta ($)</label>
                    <input type="number" style={{background:'#111', border:'1px solid #444', padding:'8px', color:'white', borderRadius:'10px'}} value={modalPrices.sale} onChange={e => setModalPrices({...modalPrices, sale: Number(e.target.value)})} />
                </div>
            </div>

            <div className="modal-tabs-container">
              <div className="modal-tabs">
                <div className={`tab-glider ${updateType}`}></div>
                <button className={`tab-option ${updateType === 'suma' ? 'active' : ''}`} onClick={() => setUpdateType('suma')}> + Entrada</button>
                <button className={`tab-option ${updateType === 'resta' ? 'active' : ''}`} onClick={() => setUpdateType('resta')}> - Salida</button>
                <button className={`tab-option ${updateType === 'set' ? 'active' : ''}`} onClick={() => setUpdateType('set')}> = Establecer</button>
              </div>
            </div>
            
            {renderModeSelector()}
            <div style={{margin:'20px 0'}}>{renderQuantityInputs(true)}</div>
            
            <p style={{color:'#888', marginTop:'15px'}}>El stock cambiará en: <strong>{calculateTotalQuantity()}</strong></p>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowStockModal(false)} style={{flex:1}}>Cancelar</button>
              <button className="btn-primary" onClick={handleUpdateSubmit} style={{flex:1}}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;