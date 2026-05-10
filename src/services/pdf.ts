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
    const lang = settings.language;
    const isCustomFont = ['bn', 'ar', 'ur'].includes(lang);

    // Force English labels for the PDF as requested
    const PDF_STRINGS = {
      date: 'Date',
      note: 'Note',
      guest: 'Guest',
      reportTitle: 'Overtime Report',
      totalHours: 'Total Hours',
      otEarnings: 'OT Earnings',
      basicSalary: 'Basic Salary',
      totalPayout: 'Total Payout',
      hours: 'Hours'
    };

    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Load custom font if needed (Bengali, Arabic, Urdu)
    // We keep this to support user data (notes, names) in their native script
    if (isCustomFont) {
      try {
        const fontUrls: Record<string, string[]> = {
          bn: [
            'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansbengali/NotoSansBengali-Regular.ttf',
            'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/hinted/ttf/NotoSansBengali/NotoSansBengali-Regular.ttf',
            'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/unhinted/ttf/NotoSansBengali/NotoSansBengali-Regular.ttf',
            'https://fonts.gstatic.com/s/notosansbengali/v15/0nEq59S_769m0_N1_9X9-3oH7yW3.ttf'
          ],
          ar: [
            'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansarabic/NotoSansArabic-Regular.ttf',
            'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf',
            'https://fonts.gstatic.com/s/notosansarabic/v18/n8AUmZve1QYdyf_7TDErB6sqY_Y.ttf'
          ],
          ur: [
            'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansarabic/NotoSansArabic-Regular.ttf'
          ]
        };
        
        let response: Response | null = null;
        const urls = fontUrls[lang] || [];
        
        for (const url of urls) {
          try {
            console.log(`Searching for font at ${url}...`);
            const res = await fetch(url);
            if (res.ok) {
              response = res;
              console.log(`Font found at ${url}`);
              break;
            }
          } catch (e) {
            console.warn(`Font fetch error for ${url}:`, e);
          }
        }

        if (response && response.ok) {
          const blob = await response.blob();
          const base64 = await PDFService.blobToBase64(blob);
          
          doc.addFileToVFS('CustomFont.ttf', base64);
          doc.addFont('CustomFont.ttf', 'CustomFont', 'normal');
          doc.setFont('CustomFont');
        } else {
          console.error('No font sources worked');
        }
      } catch (e) {
        console.error('Font loading error:', e);
      }
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    const fontFamily = isCustomFont ? 'CustomFont' : 'helvetica';
    const fontStyle = isCustomFont ? 'normal' : 'bold';
    const isRTL = ['ar', 'ur'].includes(lang);
    
    // 1. Professional Header
    doc.setFillColor(99, 102, 241); // #6366f1
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(fontFamily, fontStyle);
    // Force English report title if it matches current Bengali/Arabic labels
    const displayTitle = reportTitle.includes('Report') || reportTitle.includes('রিপোর্ট') || reportTitle.includes('تقرير') 
      ? PDF_STRINGS.reportTitle 
      : reportTitle;
    doc.text(displayTitle, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont(fontFamily, 'normal');
    const today = this.formatDate(new Date().toISOString());
    doc.text(`${PDF_STRINGS.date}: ${today}`, pageWidth / 2, 30, { align: 'center' });

    // 2. Profile Info Section (Below header bar)
    doc.setTextColor(55, 65, 81); // gray-700
    const profileName = profile?.fullName || PDF_STRINGS.guest;
    const company = profile?.companyName || '';
    
    let profileY = 48;
    doc.setFontSize(11);
    doc.setFont(fontFamily, fontStyle);
    doc.text(profileName, margin, profileY);
    
    if (company) {
      doc.setFontSize(9);
      doc.setFont(fontFamily, 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(company, margin, profileY + 5);
    }

    let yPos = 60;

    // 3. Summary Section (Styled as a "Card")
    doc.setFillColor(243, 244, 246); // bg-gray-100
    doc.setDrawColor(99, 102, 241); // indigo-500 border
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'FD');

    doc.setTextColor(99, 102, 241); 
    doc.setFontSize(12);
    doc.setFont(fontFamily, fontStyle);
    doc.text(PDF_STRINGS.reportTitle, pageWidth / 2, yPos + 10, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(107, 114, 128); // gray-500
    
    const summaryItems = [
      { label: PDF_STRINGS.totalHours, value: `${stats.totalHours.toFixed(1)}h` },
      { label: PDF_STRINGS.otEarnings, value: `${currency} ${stats.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: PDF_STRINGS.basicSalary, value: `${currency} ${settings.overtime.basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
      { label: PDF_STRINGS.totalPayout, value: `${currency} ${(settings.overtime.basicSalary + stats.totalEarnings).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, highlight: true }
    ];

    let xOff = margin;
    const colWidth = contentWidth / 4;
    summaryItems.forEach((item, index) => {
      doc.setTextColor(107, 114, 128);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(8);
      doc.text(item.label, xOff + colWidth / 2, yPos + 20, { align: 'center' });
      
      doc.setTextColor(item.highlight ? 99 : 31, item.highlight ? 102 : 41, item.highlight ? 241 : 55);
      doc.setFont(fontFamily, fontStyle);
      doc.setFontSize(10);
      doc.text(item.value, xOff + colWidth / 2, yPos + 26, { align: 'center' });
      
      xOff += colWidth;
    });

    yPos += 50;

    // 4. Entries Table (Grouped by Month)
    const groupedEntries: { [key: string]: OvertimeEntry[] } = {};
    entries.forEach(e => {
        const date = new Date(e.date);
        // Force English month names
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!groupedEntries[monthYear]) groupedEntries[monthYear] = [];
        groupedEntries[monthYear].push(e);
    });

    const months = Object.keys(groupedEntries).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    months.forEach((month, index) => {
      if (index > 0) yPos = (doc as any).lastAutoTable.finalY + 15;
      
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(12);
      doc.setFont(fontFamily, fontStyle);
      doc.text(month, margin, yPos - 5);

      const tableHeaders = [
        PDF_STRINGS.date,
        PDF_STRINGS.totalHours,
        PDF_STRINGS.otEarnings,
        PDF_STRINGS.note
      ];

      const tableRows = groupedEntries[month].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => {
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
        margin: { left: margin, right: margin },
        headStyles: { 
          fillColor: [99, 102, 241], 
          textColor: [255, 255, 255],
          fontStyle: fontStyle as any,
          fontSize: 10,
          halign: isRTL ? 'right' : 'center',
          font: fontFamily
        },
        styles: { 
          fontSize: 9,
          cellPadding: 4,
          overflow: 'linebreak',
          font: fontFamily,
          halign: isRTL ? 'right' : 'center'
        },
        columnStyles: {
          0: { cellWidth: 35, halign: isRTL ? 'right' : 'center' },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 40, halign: 'center' },
          3: { cellWidth: 'auto', halign: isRTL ? 'right' : 'center' } 
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    });
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
