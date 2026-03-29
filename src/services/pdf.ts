import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { OvertimeEntry, UserProfile, AppSettings } from '../types/app';
import { calculateTotalStats } from '../lib/calculations';

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

  static async generateReport(
    entries: OvertimeEntry[],
    profile: UserProfile | null,
    settings: AppSettings,
    reportTitle: string = 'Overtime Report',
    STRINGS: any
  ): Promise<{ blob: Blob; filename: string }> {
    const stats = calculateTotalStats(entries, settings);
    const currency = settings.overtime.currency;
    const isRTL = settings.language === 'ar';

    // Create a hidden container for the report
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.padding = '40px';
    container.style.backgroundColor = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = 'Inter, sans-serif';
    container.dir = isRTL ? 'rtl' : 'ltr';

    container.innerHTML = `
      <div style="margin-bottom: 30px;">
        <h1 style="color: #6366f1; font-size: 28px; margin-bottom: 10px;">${reportTitle}</h1>
        <div style="font-size: 14px; color: #4b5563;">
          <p><strong>${STRINGS.profile.fullName}:</strong> ${profile?.fullName || STRINGS.dashboard.guest}</p>
          ${profile?.companyName ? `<p><strong>${STRINGS.profile.companyName}:</strong> ${profile.companyName}</p>` : ''}
          <p><strong>${STRINGS.addEntry.dateLabel}:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-bottom: 30px;">
        <h2 style="font-size: 18px; margin-bottom: 15px;">${STRINGS.reports.reportTitle}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
          <p><strong>${STRINGS.dashboard.totalHours}:</strong> ${stats.totalHours.toFixed(1)}h</p>
          <p><strong>${STRINGS.reports.otEarnings}:</strong> ${currency} ${stats.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p><strong>${STRINGS.reports.basicSalary}:</strong> ${currency} ${settings.overtime.basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p style="font-size: 16px; font-weight: bold; margin-top: 10px; grid-column: span 2;">
            ${STRINGS.reports.totalPayout}: ${currency} ${(settings.overtime.basicSalary + stats.totalEarnings).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #6366f1; color: #ffffff;">
            <th style="padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; border: 1px solid #e5e7eb;">${STRINGS.addEntry.dateLabel}</th>
            <th style="padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; border: 1px solid #e5e7eb;">${STRINGS.dashboard.totalHours}</th>
            <th style="padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; border: 1px solid #e5e7eb;">${STRINGS.reports.otEarnings}</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(entry => `
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${new Date(entry.date).toLocaleDateString()}</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${entry.hours}h</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${currency} ${(entry.hours * stats.hourlyRate).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const imgProps = doc.getImageProperties(imgData);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const filename = `Overtime_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      const blob = doc.output('blob');

      return { blob, filename };
    } finally {
      document.body.removeChild(container);
    }
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
