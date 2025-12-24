import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// === EXPORTAR A EXCEL ===
export const exportToExcel = (products: any[]) => {
  // 1. Preparamos los datos (formato limpio para Excel)
  const dataToExport = products.map(p => {
    const totalValue = (p.cost_price || 0) * (p.stock || 0);

    return {
      "Código": p.barcode,
      "Nombre": p.name,
      "Stock": p.stock,
      "P. Costo": p.cost_price || 0,
      "P. Venta": p.sale_price || 0,
      "Valor Total (Costo)": totalValue
    };
  });

  // 2. Crear hoja y libro
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");

  // 3. Ajustar ancho de columnas (Estético)
  const wscols = [
    {wch: 15}, // Código
    {wch: 30}, // Nombre
    {wch: 10}, // Stock
    {wch: 12}, // Costo
    {wch: 12}, // Venta
    {wch: 15}  // Total
  ];
  worksheet['!cols'] = wscols;

  // 4. Descargar
  XLSX.writeFile(workbook, `Inventario_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.xlsx`);
};

// === EXPORTAR A PDF ===
export const exportToPDF = (products: any[]) => {
  const doc = new jsPDF();

  // Encabezado
  doc.setFontSize(18);
  doc.text("Reporte de Inventario", 14, 22);
  doc.setFontSize(11);
  doc.text(`Fecha: ${new Date().toLocaleString('es-CL')}`, 14, 30);

  // Definir columnas y filas
  const tableColumn = ["Código", "Nombre", "Stock", "P. Venta", "Valor Total"];
  const tableRows: any[] = [];
  
  let granTotal = 0;

  products.forEach(p => {
    const total = (p.cost_price || 0) * (p.stock || 0);
    granTotal += total;

    const rowData = [
      p.barcode,
      p.name,
      p.stock.toString(),
      `$${p.sale_price}`,
      `$${total.toLocaleString('es-CL')}`
    ];
    tableRows.push(rowData);
  });

  // Generar tabla con diseño profesional
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid', // 'striped', 'grid' o 'plain'
    headStyles: { fillColor: [26, 26, 26] }, // Color oscuro del header (a juego con tu web)
    styles: { fontSize: 10 },
  });

  // Total final al pie de página
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text(`Valorización Total del Inventario (Costo): $${granTotal.toLocaleString('es-CL')}`, 14, finalY);

  // Guardar
  doc.save(`Inventario_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.pdf`);
};