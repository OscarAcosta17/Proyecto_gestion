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
  gain: number;
  sale_price: number;
}

const InventoryPage = () => {
  document.title = "Inventario | NexusERP";
  const navigate = useNavigate();
  const { apiCall } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  // --- ESTADOS GENERALES ---
  const [products, setProducts] = useState<Product[]>([]);
  
  // --- ESTADOS DE UI/MODALES ---
  const [modalProdOpen, setModalProdOpen] = useState(false);
  const [modalStdOpen, setModalStdOpen] = useState(false);
  const [modalScanOpen, setModalScanOpen] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false); 
  const [isEditingName, setIsEditingName] = useState(false); // Nuevo: Controla si edito el título

  const [scannerActive, setScannerActive] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [feedback, setFeedback] = useState<{msg: string, type: 'in' | 'out'} | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  
  // Estados del Modal de Ajuste
  const [stockMode, setStockMode] = useState<'unit' | 'box'>('unit');
  const [updateType, setUpdateType] = useState<'suma' | 'resta' | 'set'>('suma');
  const [boxDetails, setBoxDetails] = useState({ boxes: 0, unitsPerBox: 0 });
  const [quantityInput, setQuantityInput] = useState(0);
  
  // Estado del formulario de Edición (Dentro del modal de ajuste)
  const [modalForm, setModalForm] = useState({ name: "", cost: 0, gain: 0, sale: 0 });

  // --- FORMULARIO NUEVO PRODUCTO ---
  const [formData, setFormData] = useState({
    barcode: "", name: "", stock: 0, cost_price: 0, gain: 0, sale_price: 0 
  });

  // --- FORMULARIO PRODUCCIÓN ---
  const [prodForm, setProdForm] = useState({
    name: "", 
    cost_price: 0, 
    gain: 0, 
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

  const getConversionPreview = (price: number) => {
      if (!prodForm.weight_grams || prodForm.weight_grams <= 0) return null;
      if (price <= 0) return null;
      if (prodForm.pricing_mode === 'unit') {
          const perKilo = (price / prodForm.weight_grams) * 1000;
          return `$${Math.round(perKilo).toLocaleString()}/kg`;
      } else {
          const perUnit = (price / 1000) * prodForm.weight_grams;
          return `$${Math.round(perUnit).toLocaleString()}/u`;
      }
  };

  // =============================================================
  // 🧮 LÓGICA MATEMÁTICA DE PRECIOS
  // =============================================================

  const calculateSale = (cost: number, marginPercent: number) => {
     if (!cost) return 0;
     const profit = cost * (marginPercent / 100);
     return Math.round(cost + profit);
  };

  const calculateGain = (cost: number, sale: number) => {
      if (!cost || cost === 0) return 0;
      const profit = sale - cost;
      const margin = (profit / cost) * 100;
      return parseFloat(margin.toFixed(1)); 
  };

  // Handler Producción
  const updateProdPrices = (field: 'cost' | 'gain' | 'sale', value: string) => {
      const val = parseFloat(value) || 0;
      setProdForm(prev => {
          if (field === 'sale') {
              return { ...prev, sale_price: val, gain: calculateGain(prev.cost_price, val) };
          } else {
              const newCost = field === 'cost' ? val : prev.cost_price;
              const newGain = field === 'gain' ? val : prev.gain;
              return { ...prev, cost_price: newCost, gain: newGain, sale_price: calculateSale(newCost, newGain) };
          }
      });
  };

  // Handler Estándar
  const updateStandardPrices = (field: 'cost' | 'gain' | 'sale', value: string) => {
      const val = parseFloat(value) || 0;
      setFormData(prev => {
          if (field === 'sale') {
              return { ...prev, sale_price: val, gain: calculateGain(prev.cost_price, val) };
          } else {
              const newCost = field === 'cost' ? val : prev.cost_price;
              const newGain = field === 'gain' ? val : prev.gain;
              return { ...prev, cost_price: newCost, gain: newGain, sale_price: calculateSale(newCost, newGain) };
          }
      });
  };

  // Handler Modal Ajuste
  const updateModalPrices = (field: 'cost' | 'gain' | 'sale', value: string) => {
      const val = parseFloat(value) || 0;
      setModalForm(prev => {
          if (field === 'sale') {
              return { ...prev, sale: val, gain: calculateGain(prev.cost, val) };
          } else {
              const newCost = field === 'cost' ? val : prev.cost;
              const newGain = field === 'gain' ? val : prev.gain;
              return { ...prev, cost: newCost, gain: newGain, sale: calculateSale(newCost, newGain) };
          }
      });
  };

  // =============================================================

  const openAdjustModal = (product: Product) => {
      setSelectedProduct(product);
      setUpdateType('suma');
      setStockMode('unit');
      setQuantityInput(0);
      setBoxDetails({ boxes: 0, unitsPerBox: 0 });
      setIsEditingName(false); // Reset nombre editable
      
      // Cargar datos al formulario del modal
      setModalForm({
          name: product.name,
          cost: product.cost_price,
          gain: product.gain,
          sale: product.sale_price
      });
      
      setShowStockModal(true);
  };

  const handleScan = (code: string) => {
    setScannerActive(false); 
    setModalScanOpen(false); 
    const existing = products.find(p => p.barcode === code);
    if (existing) { 
        openAdjustModal(existing); 
    } else { 
        setFormData(p => ({...p, barcode: code})); 
        setModalStdOpen(true); 
        showFeedback("Producto no existe. Créalo ahora.", 'in');
    }
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.barcode.trim() || !formData.name.trim()) return showFeedback("Faltan datos", 'out');
    
    let finalStock = formData.stock;
    if (stockMode === 'box') {
        finalStock = boxDetails.boxes * boxDetails.unitsPerBox;
    }

    try {
        await createProduct({ ...formData, stock: finalStock });
        showFeedback("✅ Producto Creado", 'in');
        setFormData({barcode:"", name:"", stock:0, cost_price:0, gain:0, sale_price:0});
        setBoxDetails({boxes:0, unitsPerBox:0});
        setModalStdOpen(false); 
        loadProducts();
    } catch (err:any) { showFeedback(err.message, 'out'); }
  };

  const handleProductionSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const userId = localStorage.getItem('userId') || '0';
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const autoCode = `INT-${userId}-${randomSuffix}`;
      
      if (!prodForm.name.trim()) return showFeedback("Nombre obligatorio", 'out');
      try {
          await createProduct({
              barcode: autoCode,
              name: prodForm.name,
              stock: prodForm.stock,
              cost_price: prodForm.cost_price,
              gain: prodForm.gain, 
              sale_price: prodForm.sale_price
          });
          showFeedback("👨‍🍳 Producción Registrada", 'in');
          setProdForm({ name: "", cost_price: 0, gain: 0, sale_price: 0, stock: 0, weight_grams: 0, pricing_mode: 'unit' });
          setModalProdOpen(false);
          loadProducts();
      } catch (err: any) { showFeedback(err.message, 'out'); }
  };

  const handleUpdateSubmit = async () => {
    if (!selectedProduct) return;
    const qty = calculateTotalQuantity();
    const userId = Number(localStorage.getItem('userId')) || 0;
    
    try { 
        if (qty > 0) {
            await updateStock({ 
                barcode: selectedProduct.barcode, 
                user_id: userId, 
                movement_type: updateType, 
                quantity: qty 
            });
        }

        // Verificar si cambiaron datos del producto
        if (
            modalForm.name !== selectedProduct.name ||
            modalForm.cost !== selectedProduct.cost_price ||
            modalForm.sale !== selectedProduct.sale_price ||
            modalForm.gain !== selectedProduct.gain
        ) {
             await updateProduct(selectedProduct.id, { 
                 name: modalForm.name,
                 cost_price: modalForm.cost, 
                 sale_price: modalForm.sale,
                 gain: modalForm.gain 
             });
        }

        showFeedback("✅ Cambios Guardados", 'in'); 
        setShowStockModal(false); 
        loadProducts(); 
    } catch (error: any) { showFeedback(error.message, 'out'); }
  };

  const renderQuantityInputs = (isModal = false) => {
      const wrapperClass = "stock-input-container";
      if (stockMode === 'unit') {
          const val = isModal ? quantityInput : formData.stock;
          return (
            <div className={wrapperClass}>
                <input 
                    type="number" 
                    placeholder="0" 
                    value={val || ''} 
                    onChange={e => isModal ? setQuantityInput(Number(e.target.value)) : setFormData({...formData, stock: Number(e.target.value)})} 
                />
            </div>
          );
      } else {
          return (
            <div className={wrapperClass}>
                <div className="box-inputs-row">
                    <input type="number" placeholder="Cajas" value={boxDetails.boxes || ''} onChange={e => setBoxDetails({...boxDetails, boxes: Number(e.target.value)})} />
                    <span className="box-x">×</span>
                    <input type="number" placeholder="Unid." value={boxDetails.unitsPerBox || ''} onChange={e => setBoxDetails({...boxDetails, unitsPerBox: Number(e.target.value)})} />
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

      {feedback && <div className={`card ${feedback.type === 'in' ? 'form-card' : 'scanner-card'}`} style={{textAlign:'center',padding:'10px', marginBottom: '10px'}}>{feedback.msg}</div>}

      <div className="grid">
        {/* COLUMNA IZQUIERDA: KPIs y ACCIONES */}
        <div className="left-column">
          <div className="kpi-container">
            <div className="kpi-card green"><span className="kpi-label">Capital</span><span className="kpi-value green-text">${inventoryValue.toLocaleString()}</span></div>
            <div className="kpi-card blue"><span className="kpi-label">Items</span><span className="kpi-value blue-text">{totalItems.toLocaleString()}</span></div>
          </div>

          <div className="actions-grid">
              <div className="action-btn-card blue" onClick={() => { setModalScanOpen(true); setScannerActive(true); }}>
                  <div className="action-content">
                      <h3 className="text-blue">Escáner Rápido</h3>
                      <p>Buscar o crear por código</p>
                  </div>
                  <div className="action-icon">📷</div>
              </div>

              <div className="action-btn-card green" onClick={() => { setFormData({barcode:"", name:"", stock:0, cost_price:0, gain:0, sale_price:0}); setBoxDetails({boxes:0, unitsPerBox:0}); setModalStdOpen(true); }}>
                  <div className="action-content">
                      <h3 className="text-green">Nuevo Producto</h3>
                      <p>Revendible con código</p>
                  </div>
                  <div className="action-icon">📦</div>
              </div>

              <div className="action-btn-card orange" onClick={() => { setProdForm({name:"", cost_price:0, gain:0, sale_price:0, stock:0, weight_grams:0, pricing_mode:'unit'}); setModalProdOpen(true); }}>
                  <div className="action-content">
                      <h3 className="text-orange">Elaboración</h3>
                      <p>Producción interna/granel</p>
                  </div>
                  <div className="action-icon">👨‍🍳</div>
              </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: TABLA */}
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
                  <th onClick={() => handleSort('gain')} style={{cursor:'pointer', textAlign:'right'}}>% {getSortIcon('gain')}</th>
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
                    <td style={{textAlign:'right', color:'#00e676'}}>{p.gain}%</td>
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

      {/* ================= MODALES ================= */}

      {/* 1. MODAL ESCÁNER */}
      {modalScanOpen && (
          <div className="modal-overlay" onClick={() => { setModalScanOpen(false); setScannerActive(false); }}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h2 className="text-blue">Escáner de Código</h2>
                  <div className="modal-scanner-wrapper">
                      {scannerActive && <BarcodeScanner active={scannerActive} onScan={handleScan} />}
                  </div>
                  <button className="btn-secondary w-100" onClick={() => { setModalScanOpen(false); setScannerActive(false); }}>Cerrar</button>
              </div>
          </div>
      )}

      {/* 2. MODAL NUEVO PRODUCTO */}
      {modalStdOpen && (
          <div className="modal-overlay" onClick={() => setModalStdOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h2 className="text-green">Nuevo Producto</h2>
                  <form onSubmit={handleStandardSubmit}>
                    <div className="input-group">
                        <label>Código de Barras</label>
                        <input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} placeholder="Escanea aquí..." required />
                    </div>
                    <div className="input-group"><label>Nombre</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Coca Cola" required /></div>
                    
                    <div className="prices-grid">
                        <div className="input-group">
                            <label>Costo $</label>
                            <input type="number" value={formData.cost_price || ''} onChange={e => updateStandardPrices('cost', e.target.value)} placeholder="0" />
                        </div>
                        <div className="input-group">
                            <label>Ganancia %</label>
                            <input type="number" value={formData.gain || ''} onChange={e => updateStandardPrices('gain', e.target.value)} placeholder="%" />
                        </div>
                        <div className="input-group">
                            <label>Venta $</label>
                            <input type="number" value={formData.sale_price || ''} onChange={e => updateStandardPrices('sale', e.target.value)} placeholder="0" />
                        </div>
                    </div>
                    
                    <div className="input-group">
                        <label>Stock Inicial</label>
                        {renderModeSelector()}
                        {renderQuantityInputs(false)}
                    </div>
                    
                    <button type="submit" className="btn-primary mt-10">Guardar Producto</button>
                    <button type="button" className="btn-secondary mt-10 w-100" onClick={() => setModalStdOpen(false)}>Cancelar</button>
                  </form>
              </div>
          </div>
      )}

      {/* 3. MODAL ELABORACIÓN PROPIA */}
      {modalProdOpen && (
          <div className="modal-overlay" onClick={() => setModalProdOpen(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h2 className="text-orange">Elaboración Propia</h2>
                  <form onSubmit={handleProductionSubmit}>
                     <div className="input-group">
                         <label>Nombre del Producto</label>
                         <input value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} placeholder="Ej: Pan Amasado..." required />
                     </div>
                     <div className="input-group">
                        <label>Modo de Precio</label>
                        <div className="production-toggle-group">
                            <button type="button" className={prodForm.pricing_mode === 'unit' ? 'active' : ''} onClick={() => setProdForm({...prodForm, pricing_mode: 'unit'})}>Unidad</button>
                            <button type="button" className={prodForm.pricing_mode === 'kilo' ? 'active' : ''} onClick={() => setProdForm({...prodForm, pricing_mode: 'kilo'})}>Kilo</button>
                        </div>
                     </div>
                     <div className="input-group">
                        <label>Peso ({prodForm.pricing_mode === 'unit' ? 'por unidad' : 'referencia'})</label>
                        <div className="weight-input-wrapper">
                            <input type="number" placeholder="0" value={prodForm.weight_grams || ''} onChange={e => setProdForm({...prodForm, weight_grams: Number(e.target.value)})} />
                            <span className="unit-label">gr</span>
                        </div>
                     </div>
                     <div className="prices-compact-row">
                         <div className="input-group">
                             <label>Costo ({prodForm.pricing_mode === 'unit' ? 'u' : 'kg'})</label>
                             <input type="number" placeholder="0" value={prodForm.cost_price || ''} onChange={e => updateProdPrices('cost', e.target.value)} />
                         </div>
                         <div className="input-group">
                             <label>Ganancia %</label>
                             <input type="number" placeholder="%" value={prodForm.gain || ''} onChange={e => updateProdPrices('gain', e.target.value)} />
                         </div>
                         <div className="input-group">
                             <label>Venta ({prodForm.pricing_mode === 'unit' ? 'u' : 'kg'})</label>
                             <input type="number" placeholder="0" value={prodForm.sale_price || ''} onChange={e => updateProdPrices('sale', e.target.value)} />
                             <span className="conversion-hint">{getConversionPreview(prodForm.sale_price)}</span>
                         </div>
                     </div>
                     <div className="input-group">
                          <label>Cantidad Producida</label>
                          <input type="number" placeholder="0" value={prodForm.stock || ''} onChange={e => setProdForm({...prodForm, stock: Number(e.target.value)})} />
                      </div>
                     <button type="submit" className="btn-orange mt-10" style={{width: '100%'}}>Guardar Producción</button>
                     <button type="button" className="btn-secondary mt-10 w-100" onClick={() => setModalProdOpen(false)}>Cancelar</button>
                 </form>
              </div>
          </div>
      )}

      {/* 4. MODAL AJUSTE DE STOCK Y EDICIÓN (REDISEÑADO) */}
      {showStockModal && selectedProduct && (
        <div className="modal-overlay" onClick={() => setShowStockModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            
            {/* 1. CABECERA: NOMBRE EDITABLE CON ANIMACIÓN */}
            <div className="modal-header-edit">
                {isEditingName ? (
                    <input 
                        className="title-input-animated" /* <--- CLASE NUEVA AQUÍ */
                        value={modalForm.name} 
                        onChange={e => setModalForm({...modalForm, name: e.target.value})} 
                        onBlur={() => setIsEditingName(false)} 
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                        autoFocus
                    />
                ) : (
                    <div className="title-display" onClick={() => setIsEditingName(true)}>
                        <h2>{modalForm.name}</h2>
                        <svg className="edit-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                    </div>
                )}
            </div>

            {/* PRECIOS */}
            <div className="prices-grid compact-grid">
                <div className="input-group">
                    <label>Costo $</label>
                    <input type="number" value={modalForm.cost} onChange={e => updateModalPrices('cost', e.target.value)} />
                </div>
                <div className="input-group">
                    <label>Ganancia %</label>
                    <input type="number" value={modalForm.gain} onChange={e => updateModalPrices('gain', e.target.value)} />
                </div>
                <div className="input-group">
                    <label>Venta $</label>
                    <input type="number" value={modalForm.sale} onChange={e => updateModalPrices('sale', e.target.value)} />
                </div>
            </div>

            {/* STOCK */}
            <div className="modal-divider"></div>

            <div className="stock-adjust-section">
                <div className="stock-info-row">
                    <span className="stock-label">Stock Actual:</span>
                    <strong className="stock-value">{selectedProduct.stock}</strong>
                </div>

                <div className="modal-tabs-container compact-tabs">
                  <div className="modal-tabs">
                    <div className={`tab-glider ${updateType}`}></div>
                    <button className={`tab-option ${updateType === 'suma' ? 'active' : ''}`} onClick={() => setUpdateType('suma')}> + Entrada</button>
                    <button className={`tab-option ${updateType === 'resta' ? 'active' : ''}`} onClick={() => setUpdateType('resta')}> - Salida</button>
                    <button className={`tab-option ${updateType === 'set' ? 'active' : ''}`} onClick={() => setUpdateType('set')}> = Definir</button>
                  </div>
                </div>
                
                {renderModeSelector()}
                <div style={{marginTop:'10px', marginBottom:'5px'}}>{renderQuantityInputs(true)}</div>
                
                <div className="total-change-text">
                    Cambio: <span style={{color: updateType === 'resta' ? '#ff1744' : '#00e676'}}>{updateType === 'resta' ? '-' : (updateType==='set'?'=':'+')}{calculateTotalQuantity()} u.</span>
                </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowStockModal(false)} style={{flex:1}}>Cancelar</button>
              <button className="btn-primary" onClick={handleUpdateSubmit} style={{flex:1}}>Guardar Todo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;