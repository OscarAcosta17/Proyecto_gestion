import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts, createProduct, updateStock } from "../services/api";
import BarcodeScanner from "../components/BarcodeScanner";
import { exportToExcel, exportToPDF } from "../components/exportUtils"; 
import "../styles/InventoryPage.css"; 

const InventoryPage = () => {
  const navigate = useNavigate();
  
  // 'products' TIENE TODO (incluso stock 0) para que el escáner funcione
  const [products, setProducts] = useState<any[]>([]);
  const [scannerActive, setScannerActive] = useState(false);
  
  // Estados de UI
  const [showForm, setShowForm] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [feedback, setFeedback] = useState<{msg: string, type: 'in' | 'out'} | null>(null);
  
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Estados Lógicos
  const [stockMode, setStockMode] = useState<'unit' | 'box'>('unit');
  const [updateType, setUpdateType] = useState<'suma' | 'resta' | 'set'>('suma');
  const [boxDetails, setBoxDetails] = useState({ boxes: 1, unitsPerBox: 1 });
  const [quantityInput, setQuantityInput] = useState(0);

  const [formData, setFormData] = useState({
    barcode: "", name: "", stock: 0, cost_price: 0, sale_price: 0
  });

  useEffect(() => { loadProducts(); }, []);

  // --- FILTRADO INTELIGENTE ---
  // 1. Filtramos solo los que tienen stock > 0 para MOSTRAR en la tabla
  // 2. Aplicamos el ordenamiento sobre esa lista filtrada
  const visibleProducts = useMemo(() => {
    // PASO 1: Ocultar stock 0 o negativo
    let activeItems = products.filter(p => p.stock > 0);

    // PASO 2: Ordenar
    if (sortConfig) {
      activeItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return activeItems;
  }, [products, sortConfig]);

  const calculateTotalQuantity = () => {
    if (stockMode === 'box') return boxDetails.boxes * boxDetails.unitsPerBox;
    return quantityInput;
  };

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) { console.error(error); }
  };

  const showFeedback = (msg: string, type: 'in' | 'out') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleScan = (code: string) => {
    setScannerActive(false);
    // BUSCAMOS EN LA LISTA COMPLETA (products), NO EN LA VISIBLE
    // Esto permite encontrar productos con Stock 0 que están ocultos
    const existing = products.find(p => p.barcode === code);
    
    if (existing) {
      setSelectedProduct(existing);
      setUpdateType('suma');
      setStockMode('unit');
      setQuantityInput(1);
      setShowUpdateModal(true);
    } else {
      if(window.confirm(`El código ${code} no existe. ¿Crearlo?`)) {
        setFormData(prev => ({ ...prev, barcode: code }));
        setShowForm(true);
      }
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalStock = formData.stock;
    if (stockMode === 'box') {
      finalStock = boxDetails.boxes * boxDetails.unitsPerBox;
    }
    try {
      await createProduct({ ...formData, stock: finalStock });
      showFeedback("¡Producto creado correctamente!", 'in');
      setShowForm(false);
      resetForms();
      loadProducts();
    } catch (error: any) {
      showFeedback("Error al guardar: " + error.message, 'out');
    }
  };

  const handleUpdateSubmit = async () => {
    if (!selectedProduct) return;
    const qty = calculateTotalQuantity();
    const userId = Number(localStorage.getItem('userId')) || 0;

    try {
      await updateStock({
        barcode: selectedProduct.barcode,
        user_id: userId,
        movement_type: updateType,
        quantity: qty
      });
      showFeedback(`Stock actualizado exitosamente`, 'in');
      setShowUpdateModal(false);
      resetForms();
      loadProducts(); // Al recargar, si el stock bajó a 0, desaparecerá de la tabla automáticamente
    } catch (error: any) {
      showFeedback("Error al actualizar: " + error.message, 'out');
    }
  };

  const resetForms = () => {
    setFormData({ barcode: "", name: "", stock: 0, cost_price: 0, sale_price: 0 });
    setBoxDetails({ boxes: 1, unitsPerBox: 1 });
    setQuantityInput(0);
    setStockMode('unit');
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: string) => (!sortConfig || sortConfig.key !== key) ? '⇅' : (sortConfig.direction === 'asc' ? '▲' : '▼');

  return (
    <div className="app">
      <header className="header">
        <h1>Inventario</h1>
        <button onClick={() => navigate('/dashboard')}>⬅ Volver</button>
      </header>

      {feedback && <div className={`feedback ${feedback.type}`}>{feedback.msg}</div>}

      <div className="grid">
        <div className="left-column">
          <div className="card">
            <div style={{cursor: 'pointer', display: 'flex', justifyContent: 'space-between'}} onClick={() => setShowForm(!showForm)}>
              <h3 className="card-title" style={{margin: 0}}>Nuevo producto</h3>
              <span style={{color: 'white'}}>{showForm ? "▲" : "▼"}</span>
            </div>
            {showForm && (
              <form onSubmit={handleCreateSubmit} style={{marginTop: '15px'}}>
                <input placeholder="Código" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} required />
                <input placeholder="Nombre" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="number" placeholder="Costo" onChange={e => setFormData({...formData, cost_price: Number(e.target.value)})} />
                  <input type="number" placeholder="Venta" onChange={e => setFormData({...formData, sale_price: Number(e.target.value)})} />
                </div>
                <label style={{display: 'block', marginBottom: '5px', marginTop: '10px'}}>Stock Inicial:</label>
                <div className="stock-mode-selector">
                  <button type="button" className={`mode-btn ${stockMode === 'unit' ? 'active' : ''}`} onClick={() => setStockMode('unit')}>Unidad</button>
                  <button type="button" className={`mode-btn ${stockMode === 'box' ? 'active' : ''}`} onClick={() => setStockMode('box')}>Caja</button>
                </div>
                {stockMode === 'unit' ? (
                  <input type="number" placeholder="Cantidad" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                ) : (
                  <div className="box-inputs-container">
                    <input type="number" placeholder="Cajas" value={boxDetails.boxes} onChange={e => setBoxDetails({...boxDetails, boxes: Number(e.target.value)})} />
                    <span className="box-separator">×</span>
                    <input type="number" placeholder="Unid/Caja" value={boxDetails.unitsPerBox} onChange={e => setBoxDetails({...boxDetails, unitsPerBox: Number(e.target.value)})} />
                  </div>
                )}
                <button type="submit" className="btn-green" style={{marginTop: '10px'}}>Crear</button>
              </form>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Escanear producto</h3>
            <BarcodeScanner active={scannerActive} onScan={handleScan} />
            {!scannerActive ? (
              <button onClick={() => setScannerActive(true)} className="btn">Iniciar escáner</button>
            ) : (
              <button onClick={() => setScannerActive(false)} className="btn-red" style={{marginTop: '10px'}}>Cancelar</button>
            )}
          </div>
        </div>

        <div className="right-column">
          <div className="card full-height">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              {/* Mostramos el contador de VISIBLES, no totales */}
              <h3 className="card-title">Productos Disponibles ({visibleProducts.length})</h3>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowExportMenu(!showExportMenu)} className="btn" style={{ fontSize: '0.9rem', padding: '8px 15px', width: 'auto' }}>Exportar ▼</button>
                {showExportMenu && (
                  <div className="dropdown-menu">
                    {/* EXPORTAMOS SOLO VISIBLEPRODUCTS (Stock > 0) */}
                    <button onClick={() => exportToExcel(visibleProducts)}>📊 Excel</button>
                    <button onClick={() => exportToPDF(visibleProducts)}>📄 PDF</button>
                  </div>
                )}
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th onClick={() => handleSort('name')} style={{cursor: 'pointer'}}>Nombre {getSortIcon('name')}</th>
                    <th onClick={() => handleSort('sale_price')} style={{cursor: 'pointer', textAlign: 'right'}}>Precio {getSortIcon('sale_price')}</th>
                    <th onClick={() => handleSort('stock')} style={{cursor: 'pointer', textAlign: 'right'}}>Stock {getSortIcon('stock')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProducts.length === 0 ? (
                     <tr><td colSpan={4} style={{textAlign:'center', padding:'30px', color:'#666'}}>No hay productos con stock</td></tr>
                  ) : (
                    visibleProducts.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #222" }}>
                        <td className="muted">{p.barcode}</td>
                        <td>{p.name}</td>
                        <td style={{textAlign: 'right'}}>${p.sale_price}</td>
                        <td style={{textAlign: 'right', fontWeight: 'bold', color: 'white'}}>{p.stock}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showUpdateModal && selectedProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Gestión de Stock: {selectedProduct.name}</h2>
            
            {/* Si el stock es 0, lo mostramos en rojo para alertar */}
            <p className="muted">Stock Actual: <strong style={{color: selectedProduct.stock === 0 ? '#ef5350' : 'white', fontSize: '1.2rem'}}>{selectedProduct.stock}</strong></p>
            
            <div className="tabs-container">
              <button className={`tab-btn ${updateType === 'suma' ? 'add' : ''}`} onClick={() => setUpdateType('suma')}>+ Sumar</button>
              <button className={`tab-btn ${updateType === 'resta' ? 'sub' : ''}`} onClick={() => setUpdateType('resta')}>- Restar</button>
              <button className={`tab-btn ${updateType === 'set' ? 'set' : ''}`} onClick={() => setUpdateType('set')}>= Fijar</button>
            </div>

            <div className="stock-mode-selector" style={{margin: '20px 0'}}>
              <button className={`mode-btn ${stockMode === 'unit' ? 'active' : ''}`} onClick={() => setStockMode('unit')}>Por Unidad</button>
              <button className={`mode-btn ${stockMode === 'box' ? 'active' : ''}`} onClick={() => setStockMode('box')}>Por Caja</button>
            </div>

            {stockMode === 'unit' ? (
               <input 
                 type="number" 
                 autoFocus
                 className="big-input"
                 placeholder="Cantidad de unidades" 
                 value={quantityInput} 
                 onChange={e => setQuantityInput(Number(e.target.value))} 
               />
            ) : (
              <div className="box-inputs-container center">
                <input type="number" className="big-input" placeholder="Cajas" value={boxDetails.boxes} onChange={e => setBoxDetails({...boxDetails, boxes: Number(e.target.value)})} />
                <span className="box-separator">×</span>
                <input type="number" className="big-input" placeholder="Unid/Caja" value={boxDetails.unitsPerBox} onChange={e => setBoxDetails({...boxDetails, unitsPerBox: Number(e.target.value)})} />
              </div>
            )}
            
            <div className="summary-text">
               {updateType === 'suma' && `Se agregarán ${calculateTotalQuantity()} unidades.`}
               {updateType === 'resta' && `Se descontarán ${calculateTotalQuantity()} unidades.`}
               {updateType === 'set' && `El stock quedará en ${calculateTotalQuantity()} unidades.`}
            </div>

            <div className="modal-actions">
              <button className="btn-red" onClick={() => setShowUpdateModal(false)}>Cancelar</button>
              <button className="btn-green" onClick={handleUpdateSubmit}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">© 2025 Sistema de Gestión</footer>
      
      <style>{`
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: #1e1e1e; padding: 30px; border-radius: 12px; border: 1px solid #333; width: 90%; max-width: 500px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
        .tabs-container { display: flex; gap: 10px; margin-top: 20px; }
        .tab-btn { flex: 1; padding: 10px; border: 1px solid #333; background: #252525; color: #aaa; cursor: pointer; border-radius: 6px; font-weight: bold; }
        .tab-btn.add.active, .tab-btn.add:hover { background: #1b5e20; color: white; border-color: #2e7d32; }
        .tab-btn.sub.active, .tab-btn.sub:hover { background: #b71c1c; color: white; border-color: #c62828; }
        .tab-btn.set.active, .tab-btn.set:hover { background: #0d47a1; color: white; border-color: #1565c0; }
        .tab-btn.add { border-bottom: 3px solid transparent; }
        ${updateType === 'suma' ? '.tab-btn.add { border-color: #2e7d32; background: #1b5e20; color: white; }' : ''}
        ${updateType === 'resta' ? '.tab-btn.sub { border-color: #c62828; background: #b71c1c; color: white; }' : ''}
        ${updateType === 'set' ? '.tab-btn.set { border-color: #1565c0; background: #0d47a1; color: white; }' : ''}
        .big-input { font-size: 1.5rem; text-align: center; padding: 10px; }
        .box-inputs-container.center { justify-content: center; }
        .summary-text { margin: 20px 0; color: #aaa; font-style: italic; }
        .modal-actions { display: flex; gap: 10px; margin-top: 20px; }
        .modal-actions button { flex: 1; padding: 12px; font-size: 1rem; }
      `}</style>
    </div>
  );
};

export default InventoryPage;