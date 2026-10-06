import { formatGHS, formatDateTime, formatDate } from '@/lib/format';
import type { Profile, LayawayProfile, Installment } from '@/types/database';

type ReceiptData = {
  artisan: Profile | null;
  layaway: LayawayProfile;
  installment: Installment;
  balanceAfter: number;
  totalPaid: number;
};

function receiptFilename(data: ReceiptData): string {
  const safeName = data.layaway.client_name.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = data.installment.payment_date.slice(0, 10);
  return `Receipt_${safeName}_${dateStr}.pdf`;
}

async function buildReceiptDoc(data: ReceiptData) {
  const { artisan, layaway, installment, balanceAfter, totalPaid } = data;
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const businessName = artisan?.business_name;
  const headerTitle = businessName || 'LedgerPay';
  const headerSubtitle = businessName ? 'Payment Receipt · via LedgerPay' : 'Payment Receipt';

  doc.setFillColor(45, 108, 80);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(headerTitle, pageWidth / 2, 13, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(headerSubtitle, pageWidth / 2, 20, { align: 'center' });

  doc.setTextColor(31, 31, 29);
  doc.setDrawColor(45, 108, 80);
  doc.setLineWidth(0.3);

  let y = 38;
  doc.setFontSize(8);
  doc.setTextColor(102, 102, 94);
  doc.text('Receipt No.', 14, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 31, 29);
  doc.text(installment.receipt_no || '—', 14, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(102, 102, 94);
  doc.text('Date', pageWidth - 14, y, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 31, 29);
  doc.text(formatDateTime(installment.payment_date), pageWidth - 14, y + 5, { align: 'right' });

  y += 16;
  doc.setDrawColor(218, 222, 227);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: { top: 2, bottom: 2, left: 0, right: 0 } },
    columnStyles: {
      0: { fontStyle: 'normal', textColor: [102, 102, 94], cellWidth: 45 },
      1: { fontStyle: 'bold', textColor: [31, 31, 29] },
    },
    body: [
      ['Artisan', artisan?.business_name || artisan?.full_name || '—'],
      ['Client', layaway.client_name],
      ['Item', layaway.item_description],
    ],
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setDrawColor(218, 222, 227);
  doc.line(14, y, pageWidth - 28, y);
  y += 8;

  doc.setFillColor(240, 247, 244);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(102, 102, 94);
  doc.text('Amount Paid', 18, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(45, 108, 80);
  doc.text(formatGHS(installment.amount), 18, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(102, 102, 94);
  doc.text('Outstanding Balance', pageWidth - 18, y + 6, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  if (balanceAfter <= 0) {
    doc.setTextColor(22, 163, 74);
  } else {
    doc.setTextColor(168, 138, 77);
  }
  doc.text(formatGHS(balanceAfter), pageWidth - 18, y + 15, { align: 'right' });

  y += 30;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(102, 102, 94);
  doc.text(`Total paid to date: ${formatGHS(totalPaid)}`, 14, y);
  doc.text(`Total cost: ${formatGHS(layaway.total_cost)}`, pageWidth - 14, y, { align: 'right' });

  if (installment.note) {
    y += 6;
    doc.text(`Note: ${installment.note}`, 14, y);
  }

  y += 12;
  doc.setDrawColor(218, 222, 227);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;
  doc.setFontSize(7);
  doc.setTextColor(133, 133, 122);
  doc.text(
    'This receipt is a record of payment received. The digital record at LedgerPay is the authoritative source.',
    pageWidth / 2,
    y,
    { align: 'center' }
  );
  doc.text(`Generated on ${formatDate(new Date().toISOString())}`, pageWidth / 2, y + 4, {
    align: 'center',
  });

  return doc;
}

export async function generateReceiptPDF(data: ReceiptData): Promise<void> {
  const doc = await buildReceiptDoc(data);
  doc.save(receiptFilename(data));
}

export async function getReceiptPDFFile(data: ReceiptData): Promise<File> {
  const doc = await buildReceiptDoc(data);
  const blob = doc.output('blob');
  return new File([blob], receiptFilename(data), { type: 'application/pdf' });
}
