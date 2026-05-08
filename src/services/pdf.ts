import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { OvertimeEntry, UserProfile, AppSettings } from '../types/app';
import { calculateTotalStats, calculateHourlyRate } from '../lib/calculations';

export class PDFService {
  private static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private static formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  static async generateReport(
    entries: OvertimeEntry[],
    profile: UserProfile | null,
    settings: AppSettings,
    reportTitle: string = 'Overtime Report',
    STRINGS: any
  ): Promise<{ blob: Blob; filename: string }> {
    const stats = calculateTotalStats(entries, settings);
    const hourlyRate = calculateHourlyRate(settings);
    const currency = settings.overtime.currency;
    const isRTL = settings.language === 'ar';
    const isBN = settings.language === 'bn';

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // 1. Professional Header
    doc.setFillColor(99, 102, 241); // #6366f1
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(reportTitle, 15, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = this.formatDate(new Date().toISOString());
    doc.text(`${STRINGS.addEntry.dateLabel}: ${today}`, 15, 30);

    // 2. Profile Info Section (Top Right of header or just below)
    doc.setTextColor(255, 255, 255);
    const profileName = profile?.fullName || STRINGS.dashboard.guest;
    const company = profile?.companyName || '';
    doc.text(`${STRINGS.profile.fullName}: ${profileName}`, pageWidth - 15, 20, { align: 'right' });
    if (company) {
      doc.text(`${STRINGS.profile.companyName}: ${company}`, pageWidth - 15, 26, { align: 'right' });
    }

    let yPos = 55;

    // 3. Summary Section (Styled as a "Card")
    doc.setFillColor(243, 244, 246); // bg-gray-100
    doc.setDrawColor(229, 231, 235); // border-gray-200
    doc.roundedRect(15, yPos, pageWidth - 30, 35, 3, 3, 'FD');

    doc.setTextColor(55, 65, 81); // gray-700
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(STRINGS.reports.reportTitle, 20, yPos + 10);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // gray-500
    
    const summaryItems = [
      { label: STRINGS.dashboard.totalHours, value: `${stats.totalHours.toFixed(1)}h` },
      { label: STRINGS.reports.otEarnings, value: `${currency} ${stats.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: STRINGS.reports.basicSalary, value: `${currency} ${settings.overtime.basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: STRINGS.reports.totalPayout, value: `${currency} ${(settings.overtime.basicSalary + stats.totalEarnings).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, highlight: true }
    ];

    let xOff = 20;
    summaryItems.forEach((item, index) => {
      const colWidth = (pageWidth - 40) / 4;
      doc.setTextColor(107, 114, 128);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, xOff, yPos + 20);
      
      doc.setTextColor(item.highlight ? 99 : 31, item.highlight ? 102 : 41, item.highlight ? 241 : 55);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(item.value, xOff, yPos + 26);
      
      xOff += colWidth;
    });

    yPos += 50;

    // 4. Entries Table
    const tableHeaders = [
      STRINGS.addEntry.dateLabel,
      STRINGS.dashboard.totalHours,
      STRINGS.reports.otEarnings,
      STRINGS.addEntry.noteLabel || "Task Details"
    ];

    const tableRows = entries.map(entry => {
      const entryEarnings = entry.hours * (entry.rate || hourlyRate);
      return [
        this.formatDate(entry.date),
        `${entry.hours}h`,
        `${currency} ${entryEarnings.toFixed(2)}`,
        entry.note || '-'
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [tableHeaders],
      body: tableRows,
      theme: 'striped',
      headStyles: { 
        fillColor: [99, 102, 241], 
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      styles: { 
        fontSize: 9,
        cellPadding: 4,
        overflow: 'linebreak',
        font: 'helvetica',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 35, halign: 'center' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 'auto', halign: 'left' } 
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      }
    });

    // 5. Footer
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
            `Page ${i} of ${totalPages} | Generated by Overtime Tracker`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    const filename = `Overtime_Tracker_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    const blob = doc.output('blob');

    return { blob, filename };
  }

  static async openPDF(blob: Blob, filename: string) {
    if (Capacitor.isNativePlatform()) {
      // On native, sharing is the best way to "open" as it lets user pick a viewer
      await this.downloadPDF(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Fallback to download if popup is blocked
        this.downloadPDF(blob, filename);
      }
    }
  }

  static async downloadPDF(blob: Blob, filename: string) {
    if (Capacitor.isNativePlatform()) {
      try {
        const base64 = await this.blobToBase64(blob);
        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache, // Use Cache for more reliable sharing on Android
        });
        
        await Share.share({
          title: 'Overtime Report',
          text: 'Your overtime report is ready.',
          files: [savedFile.uri], // Use 'files' array for actual file sharing
          dialogTitle: 'Save or Share Report',
        });
      } catch (error) {
        console.error('Error saving/sharing PDF on native:', error);
      }
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  }

  static async sharePDF(blob: Blob, filename: string) {
    if (Capacitor.isNativePlatform()) {
      try {
        const base64 = await this.blobToBase64(blob);
        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: Directory.Cache,
        });

        await Share.share({
          title: 'Overtime Report',
          text: 'My Overtime Report',
          files: [savedFile.uri], // Use 'files' array for actual file sharing
          dialogTitle: 'Share Overtime Report',
        });
      } catch (error) {
        console.error('Error sharing PDF on native:', error);
      }
    } else {
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
}
