import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, createProduct, updateStock } from "../services/api";
import BarcodeScanner from "../components/BarcodeScanner";
import { exportToExcel, exportToPDF } from "../components/exportUtils"; 
import "../styles/InventoryPage.css"; 

interface Product {
  id: number;
  barcode: string;
  name: string;
  stock: number;
  cost_price: number;
  sale_price: number;
}

const InventoryPage = () => {
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  
  // UI States
  const [showForm, setShowForm] = useState(false); // SOLO ESTE ES DESPLEGABLE
  const [showStockModal, setShowStockModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [feedback, setFeedback] = useState<{msg: string, type: 'in' | 'out'} | null>(null);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Filtros y Ordenamiento (RESTAURADO)
  const [searchTerm, setSearchTerm] = useState("");
  const [showZeroStock, setShowZeroStock] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Lógica Modal
  const [stockMode, setStockMode] = useState<'unit' | 'box'>('unit');
  const [updateType, setUpdateType] = useState<'suma' | 'resta' | 'set'>('suma');
  const [boxDetails, setBoxDetails] = useState({ boxes: 1, unitsPerBox: 1 });
  const [quantityInput, setQuantityInput] = useState(0);

  const [formData, setFormData] = useState({
    barcode: "", name: "", stock: 0, cost_price: 0, sale_price: 0
  });

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) { console.error(error); }
  };

  // --- LÓGICA DE ORDENAMIENTO (RESTAURADA) ---
  const visibleProducts = useMemo(() => {
    let filtered = products;
    if (!showZeroStock) filtered = filtered.filter(p => p.stock > 0);
    
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(lowerTerm) || p.barcode.includes(lowerTerm));
    }
    
    // ORDENAMIENTO
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

  // --- HANDLERS DE ORDENAMIENTO ---
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <span style={{opacity:0.2, fontSize:'0.7rem'}}> ▼</span>;
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const handleScan = (code: string) => {
    setScannerActive(false);
    const existing = products.find(p => p.barcode === code);
    if (existing) { 
        setSelectedProduct(existing); setUpdateType('suma'); setStockMode('unit'); setQuantityInput(0); setShowStockModal(true); 
    } else { 
        if(window.confirm("Código nuevo. ¿Crear?")) { 
            setFormData(p => ({...p, barcode: code})); 
            setShowForm(true); // Abrimos el formulario automáticamente
        } 
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalStock = formData.stock;
    if (stockMode === 'box') finalStock = boxDetails.boxes * boxDetails.unitsPerBox;
    try { 
        await createProduct({ ...formData, stock: finalStock }); 
        showFeedback("Producto creado", 'in'); 
        setFormData({barcode:"",name:"",stock:0,cost_price:0,sale_price:0}); 
        loadProducts(); 
    } catch (error: any) { showFeedback(error.message, 'out'); }
  };

  const handleUpdateSubmit = async () => {
    if (!selectedProduct) return;
    const qty = calculateTotalQuantity();
    const userId = Number(localStorage.getItem('userId')) || 0;
    try { await updateStock({ barcode: selectedProduct.barcode, user_id: userId, movement_type: updateType, quantity: qty }); showFeedback("Stock actualizado", 'in'); setShowStockModal(false); loadProducts(); } catch (error: any) { showFeedback(error.message, 'out'); }
  };

  // --- RENDERIZADO DE INPUTS ---
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
          {/* KPIs */}
          <div className="kpi-container">
            <div className="kpi-card green"><span className="kpi-label">Capital</span><span className="kpi-value green-text">${inventoryValue.toLocaleString()}</span></div>
            <div className="kpi-card blue"><span className="kpi-label">Items</span><span className="kpi-value blue-text">{totalItems.toLocaleString()}</span></div>
          </div>

          {/* CARD NUEVO PRODUCTO (DESPLEGABLE) */}
          <div className="card form-card">
            <div className="card-header-interactive" onClick={() => setShowForm(!showForm)}>
                <div>
                    <h3 style={{margin:0, color:'var(--neon-green)'}}>+ Nuevo Producto</h3>
                    <small className="card-subtitle">Creación manual de ítem</small>
                </div>
                <span className="toggle-arrow">{showForm ? '▲' : '▼'}</span>
            </div>
            
            {showForm && (
                <form onSubmit={handleCreateSubmit} className="slide-down-animation">
                    <div className="input-group"><label>Código de Barras</label><input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} placeholder="Escanea o escribe..." required /></div>
                    <div className="input-group"><label>Nombre del Producto</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Coca Cola 3L" required /></div>
                    
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginBottom:'15px'}}>
                        <div className="input-group">
                            <label>Costo $</label>
                            {/* PLACEHOLDERS RESTAURADOS */}
                            <input type="number" value={formData.cost_price || ''} onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})} placeholder="Ej: 500" />
                        </div>
                        <div className="input-group">
                            <label>Venta $</label>
                            {/* PLACEHOLDERS RESTAURADOS */}
                            <input type="number" value={formData.sale_price || ''} onChange={e => setFormData({...formData, sale_price: Number(e.target.value)})} placeholder="Ej: 1000" />
                        </div>
                    </div>
                    
                    <div className="input-group">
                        <label>Stock Inicial</label>
                        {renderModeSelector()}
                        {renderQuantityInputs(false)}
                    </div>
                    
                    <button type="submit" className="btn-primary" style={{marginTop:'10px'}}>Guardar Producto</button>
                </form>
            )}
          </div>

          {/* CARD ESCÁNER (NO DESPLEGABLE) */}
          <div className="card scanner-card">
             <div className="card-header-static">
                 <h3 style={{margin:0, color:'var(--neon-blue)'}}>Escáner Rápido</h3>
                 <small className="card-subtitle">Búsqueda por cámara</small>
             </div>

             <div style={{marginTop:'15px'}}>
                 {scannerActive ? (
                     <>
                        <div className="scanner-status">SISTEMA ACTIVO...</div>
                        <BarcodeScanner active={scannerActive} onScan={handleScan} />
                        <button onClick={() => setScannerActive(false)} className="btn-danger" style={{marginTop:'10px'}}>Detener</button>
                     </>
                 ) : (
                     <button onClick={() => setScannerActive(true)} className="btn-secondary" style={{width:'100%'}}>Activar Cámara</button>
                 )}
             </div>
          </div>
        </div>

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
                  {/* FILTROS DE ORDENAMIENTO RESTAURADOS */}
                  <th onClick={() => handleSort('name')} style={{cursor:'pointer'}}>Nombre {getSortIcon('name')}</th>
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
                    <td style={{textAlign:'right'}}>${p.sale_price.toLocaleString()}</td>
                    <td style={{textAlign:'center'}}><span className={`badge ${p.stock<5 ? (p.stock===0?'red':'yellow') : 'green'}`}>{p.stock}</span></td>
                    <td style={{textAlign:'center'}}><button className="btn-secondary" style={{padding:'6px 12px', fontSize:'0.8rem'}} onClick={() => { setSelectedProduct(p); setUpdateType('suma'); setStockMode('unit'); setShowStockModal(true); }}>Ajustar</button></td>
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
                <span style={{color:'#aaa'}}>Stock Actual</span><strong style={{fontSize:'1.5rem'}}>{selectedProduct.stock}</strong>
            </div>
            <div className="modal-tabs">
              <button className={`tab-option ${updateType === 'suma' ? 'active add' : ''}`} onClick={() => setUpdateType('suma')}>+ Entrada</button>
              <button className={`tab-option ${updateType === 'resta' ? 'active sub' : ''}`} onClick={() => setUpdateType('resta')}>- Salida</button>
              <button className={`tab-option ${updateType === 'set' ? 'active set' : ''}`} onClick={() => setUpdateType('set')}>= Corregir</button>
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