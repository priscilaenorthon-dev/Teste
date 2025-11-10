import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { User, Tool } from '@shared/schema';

type LoanTool = {
  tool: Tool;
  quantityLoaned: number;
};

export function generateLoanTermPDF(
  user: User,
  operator: User,
  tools: LoanTool[],
  batchId: string
) {
  const doc = new jsPDF();
  const now = new Date();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMO DE RESPONSABILIDADE', 105, 20, { align: 'center' });
  doc.text('Sistema JOMAGA', 105, 28, { align: 'center' });
  
  // Document info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Número do Termo: ${batchId}`, 14, 40);
  doc.text(`Data/Hora: ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 46);
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(14, 50, 196, 50);
  
  // Recipient Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO COLABORADOR', 14, 58);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${user.firstName} ${user.lastName}`, 14, 66);
  doc.text(`Login: ${user.username}`, 14, 72);
  if (user.email) {
    doc.text(`Email: ${user.email}`, 14, 78);
  }
  if (user.matriculation) {
    doc.text(`Matrícula: ${user.matriculation}`, 120, 66);
  }
  if (user.department) {
    doc.text(`Setor: ${user.department}`, 120, 72);
  }
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.line(14, 84, 196, 84);
  
  // Tools Table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FERRAMENTAS EMPRESTADAS', 14, 92);
  
  const tableData = tools.map((item) => [
    item.tool.code,
    item.tool.name,
    item.quantityLoaned.toString(),
  ]);
  
  autoTable(doc, {
    startY: 96,
    head: [['Código', 'Nome da Ferramenta', 'Quantidade']],
    body: tableData,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  
  // Get Y position after table
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Operator information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Operador responsável: ${operator.firstName} ${operator.lastName} (${operator.username})`, 14, finalY);
  
  // Terms and conditions
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMO DE COMPROMISSO:', 14, finalY + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const terms = [
    'Declaro ter recebido as ferramentas acima listadas em perfeito estado de conservação e funcionamento.',
    'Comprometo-me a utilizar as ferramentas somente para fins profissionais e de acordo com as normas de segurança.',
    'Responsabilizo-me pela guarda e conservação das ferramentas, devolvendo-as nas mesmas condições em que foram recebidas.',
    'Em caso de perda, dano ou extravio, assumo a responsabilidade pelo ressarcimento do valor das ferramentas.',
    'Comprometo-me a devolver as ferramentas quando solicitado ou ao final do período de utilização.'
  ];
  
  let currentY = finalY + 16;
  terms.forEach((term, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${term}`, 182);
    doc.text(lines, 14, currentY);
    currentY += lines.length * 4 + 2;
  });
  
  // Signature section
  currentY += 10;
  doc.setLineWidth(0.3);
  doc.line(14, currentY, 95, currentY);
  doc.line(115, currentY, 196, currentY);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Assinatura do Colaborador', 14, currentY + 5);
  doc.text('Assinatura do Operador', 115, currentY + 5);
  
  doc.text(`${user.firstName} ${user.lastName}`, 14, currentY + 10);
  doc.text(`${operator.firstName} ${operator.lastName}`, 115, currentY + 10);
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text('Sistema JOMAGA - Gestão de Ferramentas', 105, 285, { align: 'center' });
  doc.text(`Documento gerado eletronicamente em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 105, 290, { align: 'center' });
  
  // Save PDF
  const filename = `termo_responsabilidade_${batchId}_${format(now, 'yyyyMMdd_HHmmss')}.pdf`;
  doc.save(filename);
}
