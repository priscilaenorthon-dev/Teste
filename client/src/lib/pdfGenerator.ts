import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LoanData {
  toolCode: string;
  toolName: string;
  userName: string;
  loanDate: string;
  returnDate?: string;
  status: string;
}

interface CalibrationData {
  toolCode: string;
  toolName: string;
  lastCalibrationDate?: string;
  nextCalibrationDate: string;
  daysRemaining: number;
}

interface InventoryData {
  toolCode: string;
  toolName: string;
  class: string;
  model: string;
  totalQuantity: number;
  availableQuantity: number;
  status: string;
}

export function generateLoanedToolsReport(loans: LoanData[], startDate: Date, endDate: Date) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Relatório de Ferramentas Emprestadas', 14, 20);
  
  doc.setFontSize(11);
  doc.text(`Período: ${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} a ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`, 14, 30);
  doc.text(`Data de emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 36);

  // Table
  const tableData = loans.map(loan => [
    loan.toolCode,
    loan.toolName,
    loan.userName,
    format(new Date(loan.loanDate), 'dd/MM/yyyy', { locale: ptBR }),
    loan.status === 'active' ? 'Ativo' : 'Devolvido',
  ]);

  autoTable(doc, {
    head: [['Código', 'Ferramenta', 'Usuário', 'Data Empréstimo', 'Status']],
    body: tableData,
    startY: 45,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [63, 81, 181] },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(9);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc;
}

export function generateCalibrationReport(calibrations: CalibrationData[]) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Relatório de Calibração', 14, 20);
  
  doc.setFontSize(11);
  doc.text(`Data de emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 30);

  // Table
  const tableData = calibrations.map(cal => [
    cal.toolCode,
    cal.toolName,
    cal.lastCalibrationDate 
      ? format(new Date(cal.lastCalibrationDate), 'dd/MM/yyyy', { locale: ptBR })
      : '-',
    format(new Date(cal.nextCalibrationDate), 'dd/MM/yyyy', { locale: ptBR }),
    cal.daysRemaining >= 0 ? `${cal.daysRemaining} dias` : `${Math.abs(cal.daysRemaining)} dias atrasado`,
  ]);

  autoTable(doc, {
    head: [['Código', 'Ferramenta', 'Última Calibração', 'Próxima Calibração', 'Dias Restantes']],
    body: tableData,
    startY: 40,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [63, 81, 181] },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(9);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc;
}

export function generateInventoryReport(inventory: InventoryData[]) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Relatório de Inventário', 14, 20);
  
  doc.setFontSize(11);
  doc.text(`Data de emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 30);

  // Table
  const tableData = inventory.map(item => [
    item.toolCode,
    item.toolName,
    item.class || '-',
    item.model || '-',
    item.totalQuantity.toString(),
    item.availableQuantity.toString(),
    item.status === 'available' ? 'Disponível' : 
      item.status === 'loaned' ? 'Emprestada' :
      item.status === 'calibration' ? 'Em Calibração' : 'Fora de Uso',
  ]);

  autoTable(doc, {
    head: [['Código', 'Ferramenta', 'Classe', 'Modelo', 'Qtd Total', 'Disponível', 'Status']],
    body: tableData,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [63, 81, 181] },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(9);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc;
}

export function generateLoanHistoryReport(loans: LoanData[], startDate: Date, endDate: Date) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Histórico de Empréstimos', 14, 20);
  
  doc.setFontSize(11);
  doc.text(`Período: ${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} a ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`, 14, 30);
  doc.text(`Data de emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 36);

  // Table
  const tableData = loans.map(loan => [
    loan.toolCode,
    loan.toolName,
    loan.userName,
    format(new Date(loan.loanDate), 'dd/MM/yyyy', { locale: ptBR }),
    loan.returnDate ? format(new Date(loan.returnDate), 'dd/MM/yyyy', { locale: ptBR }) : '-',
  ]);

  autoTable(doc, {
    head: [['Código', 'Ferramenta', 'Usuário', 'Data Empréstimo', 'Data Devolução']],
    body: tableData,
    startY: 45,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [63, 81, 181] },
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(9);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc;
}
