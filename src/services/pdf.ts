import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OvertimeEntry, UserProfile, AppSettings } from '../types/app';
import { calculateTotalStats } from '../lib/calculations';

export class PDFService {
  static async generateReport(
    entries: OvertimeEntry[],
    profile: UserProfile | null,
    settings: AppSettings,
    reportTitle: string = 'Overtime Report'
  ): Promise<{ blob: Blob; filename: string }> {
    const doc = new jsPDF();
    const stats = calculateTotalStats(entries, settings);
    const currency = settings.overtime.currency;

    // Header Section
    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241); // Primary color
    doc.text(reportTitle, 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(`User: ${profile?.fullName || 'Guest'}`, 14, 32);
    if (profile?.companyName) {
      doc.text(`Company: ${profile.companyName}`, 14, 38);
    }
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 44);

    // Summary Section
    doc.setDrawColor(229, 231, 235);
    doc.line(14, 50, 196, 50);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary', 14, 60);

    doc.setFontSize(11);
    doc.text(`Total Overtime Hours: ${stats.totalHours.toFixed(1)}h`, 14, 68);
    doc.text(`Overtime Earnings: ${currency} ${stats.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 74);
    doc.text(`Basic Salary: ${currency} ${settings.overtime.basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 80);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Payout: ${currency} ${(settings.overtime.basicSalary + stats.totalEarnings).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 88);
    doc.setFont('helvetica', 'normal');

    // Detailed Table
    const tableData = entries.map((entry) => [
      new Date(entry.date).toLocaleDateString(),
      `${entry.hours}h`,
      `${currency} ${(entry.hours * stats.hourlyRate).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 96,
      head: [['Date', 'Overtime Hours', 'Earnings']],
      body: tableData,
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { top: 96 },
    });

    const filename = `Overtime_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    const blob = doc.output('blob');

    return { blob, filename };
  }

  static async downloadPDF(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  static async sharePDF(blob: Blob, filename: string) {
    const file = new File([blob], filename, { type: 'application/pdf' });
    
    // Check if Web Share API is supported and can share files
    const canShare = navigator.share && 
                    (navigator.canShare ? navigator.canShare({ files: [file] }) : true);

    if (canShare) {
      try {
        await navigator.share({
          files: [file],
          title: 'Overtime Report',
          text: 'My Overtime Report',
        });
      } catch (error) {
        // If user cancelled or sharing failed, fallback to download
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing PDF:', error);
          this.downloadPDF(blob, filename);
        }
      }
    } else {
      // If sharing is not supported at all, just download
      this.downloadPDF(blob, filename);
    }
  }
}
