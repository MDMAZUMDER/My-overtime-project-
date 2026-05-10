import { useState, useEffect, ChangeEvent, useRef, ReactNode } from "react";
import { Camera, Save, User, IdCard, Building2, QrCode, X, CheckCircle2, Image as ImageIcon, AlertCircle, Share2, Download, ArrowLeft, Copy, Calendar } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useStrings } from "../hooks/useStrings";
import { StorageService } from "../services/storage";
import { UserProfile } from "../types/app";
import { cn } from "../lib/utils";
import { useFirebase } from "../components/FirebaseProvider";
import { db, doc, setDoc, getDoc, handleFirestoreError, OperationType, onSnapshot, query, collection, where } from "../firebase";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { QRCodeCanvas } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { ValidationTooltip } from "../components/ui/ValidationTooltip";

export default function Profile() {
  const STRINGS = useStrings();
  const navigate = useNavigate();
  const { user, profile: firebaseProfile, signOut } = useFirebase();
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "",
    companyName: "",
    employeeId: "",
    department: "",
    designation: "",
    joinDate: "",
    profilePhoto: "",
    companyId: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [lastSavedProfile, setLastSavedProfile] = useState<UserProfile | null>(null);
  const [showQrView, setShowQrView] = useState(false);
  const [qrTab, setQrTab] = useState<'my' | 'scan'>('my');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [showValidation, setShowValidation] = useState<{ field: string | null, message: string | null }>({ field: null, message: null });
  const [scannedCompany, setScannedCompany] = useState<{ id: string, name: string } | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const validationTimer = useRef<NodeJS.Timeout | null>(null);

  const triggerValidation = (field: string, message: string) => {
    setShowValidation({ field, message });
    if (validationTimer.current) clearTimeout(validationTimer.current);
    validationTimer.current = setTimeout(() => setShowValidation({ field: null, message: null }), 3000);
  };

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedProfile = StorageService.getProfile();
    let initialProfile = savedProfile || firebaseProfile || {
      fullName: "",
      companyName: "",
      employeeId: "SRH - ",
      department: "",
      designation: "",
      joinDate: "",
      profilePhoto: "",
      companyId: "",
    };

    if (initialProfile.employeeId === "" || !initialProfile.employeeId.startsWith("SRH - ")) {
      initialProfile.employeeId = "SRH - " + (initialProfile.employeeId.replace(/\D/g, "").slice(0, 5));
    }

    setProfile(initialProfile);
    setLastSavedProfile(JSON.parse(JSON.stringify(initialProfile)));
    
    if (!savedProfile && !firebaseProfile) {
      setIsEditing(true);
    }
  }, [firebaseProfile, user?.uid]);

  useEffect(() => {
    if (!user) return;

    // Listen for pending connection requests
    const q = query(
      collection(db, 'connection_requests'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setPendingRequest(snapshot.docs[0].data());
      } else {
        setPendingRequest(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'connection_requests');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    let currentScanner: Html5Qrcode | null = null;

    if (showQrView && qrTab === 'scan' && connectionStatus === 'idle') {
      const startScanner = async () => {
        try {
          if (!isMounted) return;

          // Check if mediaDevices is supported
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setConnectionStatus('error');
            setErrorMessage("Your browser doesn't support camera access. Please use a modern browser.");
            return;
          }

          // Ensure the element exists before starting
          const readerElement = document.getElementById("reader");
          if (!readerElement) return;

          // Clear any existing content in the reader element
          readerElement.innerHTML = "";

          // If there's an existing scanner, try to stop it first
          if (html5QrCodeRef.current) {
            try {
              const state = html5QrCodeRef.current.getState();
              if (state !== 1) { // 1 is NOT_STARTED
                await html5QrCodeRef.current.stop();
              }
            } catch (e) {
              console.warn("Error stopping previous scanner", e);
            }
          }

          currentScanner = new Html5Qrcode("reader");
          html5QrCodeRef.current = currentScanner;
          
          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          // Try to start with back camera
          try {
            await currentScanner.start(
              { facingMode: "environment" },
              config,
              onScanSuccess,
              onScanFailure
            );
          } catch (startErr: any) {
            console.warn("Failed to start with environment, trying fallback", startErr);
            
            // If it's a permission error, throw it to be handled by the outer catch
            if (startErr.name === 'NotAllowedError' || startErr.name === 'PermissionDeniedError' || startErr.toString().includes("Permission denied")) {
              throw startErr;
            }

            // Otherwise try user camera as fallback
            await currentScanner.start(
              { facingMode: "user" },
              config,
              onScanSuccess,
              onScanFailure
            );
          }
        } catch (err: any) {
          if (!isMounted) return;
          console.error("Error starting scanner:", err);
          setConnectionStatus('error');
          
          const errorStr = err?.toString() || "";
          const isPermissionError = err.name === 'NotAllowedError' || 
                                   err.name === 'PermissionDeniedError' || 
                                   errorStr.includes("Permission denied") ||
                                   errorStr.includes("NotAllowedError");

          if (isPermissionError) {
            setErrorMessage(STRINGS.profile.cameraPermissionDenied);
          } else if (errorStr.includes("NotFound") || errorStr.includes("no device") || errorStr.includes("DevicesNotFoundError")) {
            setErrorMessage("No camera found on this device.");
          } else if (errorStr.includes("ReadableError") || errorStr.includes("TrackStartError") || errorStr.includes("Could not start video source")) {
            setErrorMessage("Camera is being used by another application. Please close it and try again.");
          } else {
            setErrorMessage(STRINGS.profile.cameraStartFailed);
          }
        }
      };

      // Delay to ensure DOM is ready
      const timer = setTimeout(startScanner, 800);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (currentScanner) {
          const stopScanner = async () => {
            try {
              if (currentScanner) {
                const state = currentScanner.getState();
                if (state !== 1) {
                  await currentScanner.stop();
                }
              }
            } catch (err) {
              // Ignore cleanup errors
            } finally {
              if (html5QrCodeRef.current === currentScanner) {
                html5QrCodeRef.current = null;
              }
            }
          };
          stopScanner();
        }
      };
    }
  }, [showQrView, qrTab, connectionStatus]);

  const onScanSuccess = async (decodedText: string) => {
    // Stop scanner on success
    const scanner = html5QrCodeRef.current;
    if (scanner) {
      try {
        const state = (scanner as any).getState();
        if (state === 2 || state === 3) {
          await scanner.stop();
        }
      } catch (err) {
        console.error("Failed to stop scanner on success", err);
      }
    }

    setConnectionStatus('connecting');
    try {
      const companyDoc = await getDoc(doc(db, 'companies', decodedText));
      if (companyDoc.exists()) {
        const companyData = companyDoc.data();
        setScannedCompany({ id: decodedText, name: companyData.name });
        setConnectionStatus('idle');
      } else {
        setConnectionStatus('error');
        setErrorMessage(STRINGS.profile.companyNotFound);
        setTimeout(() => {
          setConnectionStatus('idle');
          setErrorMessage(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error connecting to company:', error);
      setConnectionStatus('error');
      setErrorMessage(STRINGS.profile.connectionError);
      setTimeout(() => {
        setConnectionStatus('idle');
        setErrorMessage(null);
      }, 3000);
    }
  };

  const handleConnect = async () => {
    if (!scannedCompany || !user) return;
    
    setConnectionStatus('connecting');
    try {
      // Create a connection request in Firestore
      const requestId = `${user.uid}_${scannedCompany.id}`;
      await setDoc(doc(db, 'connection_requests', requestId), {
        userId: user.uid,
        companyId: scannedCompany.id,
        userName: profile.fullName,
        companyName: scannedCompany.name,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setConnectionStatus('success');
      setToast({ message: STRINGS.profile.requestSent, type: 'success' });
      
      setTimeout(() => {
        setShowQrView(false);
        setConnectionStatus('idle');
        setScannedCompany(null);
      }, 2000);
    } catch (error) {
      console.error('Error sending connection request:', error);
      setConnectionStatus('error');
      setErrorMessage(STRINGS.profile.connectionError);
    }
  };

  const handleGalleryScan = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConnectionStatus('connecting');
    setErrorMessage(null);
    
    // Use a temporary Html5Qrcode instance for file scanning
    const html5QrCode = new Html5Qrcode("reader-hidden");
    
    try {
      const decodedText = await html5QrCode.scanFile(file, false);
      await onScanSuccess(decodedText);
    } catch (err: any) {
      console.error("Error scanning file", err);
      setConnectionStatus('error');
      if (err?.toString().includes("No MultiFormat Readers")) {
        setErrorMessage(STRINGS.profile.noQrFound);
      } else {
        setErrorMessage(STRINGS.profile.fileReadFailed);
      }
      setTimeout(() => {
        setConnectionStatus('idle');
        setErrorMessage(null);
      }, 4000);
    }
  };

  const onScanFailure = (error: any) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    const id = profile.employeeId || user?.uid;
    if (id) {
      navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (!profile.fullName?.trim()) {
      alert(STRINGS.profile.fullNameRequired);
      return;
    }

    // Ensure employeeId is valid (not just the prefix)
    const prefix = "SRH - ";
    if (profile.employeeId === prefix) {
      alert("Please enter your 5-digit Employee ID after 'SRH - '");
      return;
    }
    
    // Final sync before saving
    const finalProfile = {
      ...profile,
      employeeId: profile.employeeId || user?.uid || ""
    };

    StorageService.saveProfile(finalProfile, user?.uid);
    setProfile(finalProfile);
    setLastSavedProfile(JSON.parse(JSON.stringify(finalProfile)));
    setIsEditing(false);
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, profilePhoto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadQr = async () => {
    if (!qrRef.current) return;
    const qrCanvas = qrRef.current.querySelector('canvas');
    if (!qrCanvas) return;

    setToast({ message: "Generating QR Card...", type: 'success' });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions for high quality (1080x1350)
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;

    // 1. Main Background
    ctx.fillStyle = '#0b141a';
    ctx.fillRect(0, 0, width, height);

    // 2. Card Background
    const cardPadding = 80;
    const cardWidth = width - (cardPadding * 2);
    const cardHeight = 900;
    const cardY = 180;
    
    ctx.fillStyle = '#111b21';
    const radius = 40;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cardPadding, cardY, cardWidth, cardHeight, radius);
    } else {
      ctx.rect(cardPadding, cardY, cardWidth, cardHeight);
    }
    ctx.fill();

    // 3. Profile Picture (Circular)
    const profileSize = 200;
    const profileY = cardY - (profileSize / 2);
    
    // Draw background circle for profile pic border
    ctx.beginPath();
    ctx.arc(width / 2, profileY + (profileSize / 2), (profileSize / 2) + 10, 0, Math.PI * 2);
    ctx.fillStyle = '#0b141a';
    ctx.fill();

    if (profile.profilePhoto) {
      try {
        const img = new Image();
        // Only set crossOrigin if it's a URL, not a base64 string
        if (profile.profilePhoto.startsWith('http')) {
          img.crossOrigin = "anonymous";
        }
        img.src = profile.profilePhoto;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          // Timeout after 5 seconds
          setTimeout(() => reject(new Error("Image load timeout")), 5000);
        });
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, profileY + (profileSize / 2), profileSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, (width / 2) - (profileSize / 2), profileY, profileSize, profileSize);
        ctx.restore();
      } catch (e) {
        console.warn("Profile photo failed to load for QR card", e);
        // Fallback if image fails
        ctx.fillStyle = '#2a3942';
        ctx.beginPath();
        ctx.arc(width / 2, profileY + (profileSize / 2), profileSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw a simple user icon placeholder
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(profile.fullName?.charAt(0).toUpperCase() || "U", width / 2, profileY + (profileSize / 2) + 30);
      }
    } else {
      ctx.fillStyle = '#2a3942';
      ctx.beginPath();
      ctx.arc(width / 2, profileY + (profileSize / 2), profileSize / 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 80px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(profile.fullName?.charAt(0).toUpperCase() || "U", width / 2, profileY + (profileSize / 2) + 30);
    }

    // 4. Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(profile.fullName || "User", width / 2, cardY + 160);

    // 5. Subtitle (Designation or Company)
    ctx.fillStyle = '#8696a0';
    ctx.font = '40px Inter, sans-serif';
    ctx.fillText(profile.designation || profile.companyName || "Overtime Master User", width / 2, cardY + 220);

    // 6. QR Code
    const qrSize = 500;
    const qrX = (width / 2) - (qrSize / 2);
    const qrY = cardY + 300;
    
    // White background for QR
    const qrRadius = 40;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(qrX - 40, qrY - 40, qrSize + 80, qrSize + 80, qrRadius);
    } else {
      ctx.rect(qrX - 40, qrY - 40, qrSize + 80, qrSize + 80);
    }
    ctx.fill();
    
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // 7. Footer Text
    ctx.fillStyle = '#8696a0';
    ctx.font = '36px Inter, sans-serif';
    const footerY = cardY + cardHeight + 100;
    const footerText = STRINGS.profile.qrPrivateDesc;
    
    // Wrap text
    const maxWidth = width - 200;
    const words = footerText.split(' ');
    let line = '';
    let y = footerY;
    const lineHeight = 50;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, width / 2, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, width / 2, y);

    // 8. Download
    try {
      if (Capacitor.isNativePlatform()) {
        const base64Data = canvas.toDataURL("image/png").split(',')[1];
        const fileName = `QR_Card_${profile.fullName || "User"}.png`.replace(/[/\\?%*:|"<>]/g, '-');
        
        try {
          // Save to Documents directory for more permanent storage
          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
            recursive: true
          });

          // On native, sharing with the file URI is the best way to let user save to gallery
          await Share.share({
            title: 'My QR Card',
            text: 'Your QR Card has been generated.',
            files: [result.uri],
            dialogTitle: 'Save to Gallery or Share'
          });
          
          setToast({ message: STRINGS.profile.downloadQr, type: 'success' });
        } catch (fsErr) {
          console.error("Filesystem save failed", fsErr);
          // Fallback to share directly if saving fails
          await Share.share({
            title: 'QR Card',
            url: canvas.toDataURL("image/png")
          });
          setToast({ message: STRINGS.profile.downloadQr, type: 'success' });
        }
      } else {
        canvas.toBlob((blob) => {
          if (!blob) {
            console.error("Failed to create image blob");
            setToast({ message: STRINGS.profile.downloadFailed, type: 'error' });
            return;
          }
          
          try {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `QR_Card_${profile.fullName || "User"}.png`.replace(/[/\\?%*:|"<>]/g, '-');
            
            // Append to body to ensure it works in all browsers
            document.body.appendChild(link);
            link.click();
            
            // Small delay before cleanup
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              setToast({ message: STRINGS.profile.downloadQr, type: 'success' });
            }, 200);
          } catch (e) {
            console.error("Download trigger failed", e);
            setToast({ message: STRINGS.profile.downloadFailed, type: 'error' });
          }
        }, "image/png", 1.0);
      }
    } catch (err) {
      console.error("Download failed", err);
      setToast({ message: STRINGS.profile.downloadFailed, type: 'error' });
    }
  };

  const handleShareQr = async () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    const shareText = `Connect with me on Overtime Master. ID: ${profile.employeeId || user?.uid}`;
    const shareUrl = window.location.href;

    try {
      if (Capacitor.isNativePlatform()) {
        const base64Data = canvas.toDataURL("image/png").split(',')[1];
        const fileName = `QR_Share_${profile.fullName || "User"}.png`.replace(/[/\\?%*:|"<>]/g, '-');
        
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache
        });

        await Share.share({
          title: 'My Profile QR',
          text: shareText,
          files: [result.uri],
          dialogTitle: 'Share QR Code'
        });
      } else {
        // Try to share as file if supported
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve));
        if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'qr.png', { type: 'image/png' })] })) {
          const file = new File([blob], `QR_${profile.fullName || "User"}.png`, { type: 'image/png' });
          await navigator.share({
            files: [file],
            title: 'My Profile QR',
            text: shareText,
          });
        } else if (navigator.share) {
          await navigator.share({
            title: 'My Profile QR',
            text: shareText,
            url: shareUrl
          });
        } else {
          throw new Error('Share not supported');
        }
      }
    } catch (err) {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setToast({ message: STRINGS.profile.linkCopied, type: 'success' });
      } catch (copyErr) {
        setToast({ message: STRINGS.profile.shareFailed, type: 'error' });
      }
    }
  };

  const ProfileField = ({ 
    icon: Icon, 
    label, 
    value, 
    colorClass = "text-primary", 
    bgClass = "bg-primary/10",
    action,
    className = ""
  }: { 
    icon: any, 
    label: string, 
    value?: string, 
    colorClass?: string, 
    bgClass?: string,
    action?: ReactNode,
    className?: string
  }) => (
    <div className={`flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
      <div className="flex items-center space-x-4">
        <div className={`p-2.5 ${bgClass} rounded-lg`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-sm font-semibold text-gray-800">{value || "—"}</p>
        </div>
      </div>
      {action}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto pb-32 pt-4">
      {/* Header with Back Button */}
      <header className="px-6 py-4 flex items-center space-x-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.profile.title}</h1>
      </header>

      {/* Hero Profile Card */}
      <section className="px-6 mb-8">
        <div className="bg-surface-variant/30 border border-outline/10 rounded-[40px] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/5 rounded-full -ml-12 -mb-12 blur-2xl" />
          
          <div className="relative flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="w-32 h-32 rounded-[48px] bg-surface p-1.5 shadow-2xl shadow-primary/10 border border-outline/10">
                <div className="w-full h-full rounded-[40px] overflow-hidden bg-surface-variant/20 relative group">
                  {profile.profilePhoto ? (
                    <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 text-on-surface-variant/20" />
                    </div>
                  )}
                  {isEditing && (
                    <label className="absolute inset-0 bg-primary/40 backdrop-blur-[2px] flex items-center justify-center cursor-pointer transition-all duration-300">
                      <Camera className="w-8 h-8 text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  )}
                </div>
              </div>
              {!isEditing && (
                <button 
                  onClick={() => {
                    setQrTab('my');
                    setShowQrView(true);
                  }}
                  className="absolute -bottom-1 -right-1 p-3 bg-primary text-on-primary rounded-2xl shadow-xl shadow-primary/20 border-2 border-surface active:scale-90 transition-all"
                >
                  <QrCode className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-2">
                <h1 className="text-2xl font-black text-on-surface tracking-tight">
                  {profile.fullName || STRINGS.dashboard.guest}
                </h1>
                {profile.companyId && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
              </div>
              <p className="text-sm font-bold text-on-surface-variant opacity-60">
                {profile.designation || "Overtime Master User"}
              </p>
            </div>

            {profile.companyName && (
              <div className="inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                <Building2 className="w-3 h-3 mr-2" />
                {profile.companyName}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Details Sections */}
      <div className="px-6 space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">{STRINGS.profile.title} Details</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs font-black text-primary uppercase tracking-widest hover:underline"
            >
              {STRINGS.profile.editProfile}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="bg-surface-variant/20 rounded-[40px] p-6 border border-outline/10 space-y-6">
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest ml-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-50" />
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-surface rounded-3xl border border-outline/10 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-on-surface"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Employee ID */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest ml-2">Employee ID</label>
                <div className="relative">
                  <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-50" />
                  <input
                    type="text"
                    value={profile.employeeId}
                    onChange={(e) => setProfile({ ...profile, employeeId: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-surface rounded-3xl border border-outline/10 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold text-on-surface"
                    placeholder="SRH-00000"
                  />
                </div>
              </div>

              {/* Department & Designation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest ml-2">Department</label>
                  <input
                    type="text"
                    value={profile.department}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    className="w-full px-5 py-4 bg-surface rounded-3xl border border-outline/10 focus:border-primary outline-none transition-all font-bold text-sm text-on-surface"
                    placeholder="Operations"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest ml-2">Designation</label>
                  <input
                    type="text"
                    value={profile.designation}
                    onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                    className="w-full px-5 py-4 bg-surface rounded-3xl border border-outline/10 focus:border-primary outline-none transition-all font-bold text-sm text-on-surface"
                    placeholder="Senior Manager"
                  />
                </div>
              </div>

              {/* Join Date */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest ml-2">Join Date</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-50" />
                  <input
                    type="date"
                    value={profile.joinDate}
                    onChange={(e) => setProfile({ ...profile, joinDate: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-surface rounded-3xl border border-outline/10 focus:border-primary outline-none transition-all font-bold text-on-surface"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  setProfile(lastSavedProfile!);
                  setIsEditing(false);
                }}
                className="flex-1 py-4 text-on-surface-variant font-bold text-sm hover:bg-surface-variant/50 rounded-3xl transition-all"
              >
                {STRINGS.common.cancel}
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] py-4 bg-primary text-on-primary font-bold text-sm shadow-xl shadow-primary/20 rounded-3xl flex items-center justify-center space-x-2 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{STRINGS.common.save}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center space-x-4 p-5 bg-surface-variant/20 rounded-[32px] border border-outline/5 transition-all group">
              <div className="p-3 bg-surface rounded-2xl shadow-sm border border-outline/10">
                <IdCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Employee ID</p>
                <p className="text-sm font-black text-on-surface">{profile.employeeId || "Not Set"}</p>
              </div>
              <button 
                onClick={handleCopyId}
                className="p-2 text-on-surface-variant/30 hover:text-primary transition-colors"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center space-x-4 p-5 bg-surface-variant/20 rounded-[32px] border border-outline/5 transition-all group">
              <div className="p-3 bg-surface rounded-2xl shadow-sm border border-outline/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Department</p>
                <p className="text-sm font-black text-on-surface">{profile.department || "Not Set"}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-5 bg-surface-variant/20 rounded-[32px] border border-outline/5 transition-all group">
              <div className="p-3 bg-surface rounded-2xl shadow-sm border border-outline/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Designation</p>
                <p className="text-sm font-black text-on-surface">{profile.designation || "Not Set"}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-5 bg-surface-variant/20 rounded-[32px] border border-outline/5 transition-all group">
              <div className="p-3 bg-surface rounded-2xl shadow-sm border border-outline/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Join Date</p>
                <p className="text-sm font-black text-on-surface">{profile.joinDate ? new Date(profile.joinDate).toLocaleDateString() : "Not Set"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {showQrView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={() => setShowQrView(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          {/* Modal Content */}
          <div
            className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-white"
          >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setShowQrView(false)} 
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h2 className="text-base font-bold text-gray-800">
                    {qrTab === 'my' ? STRINGS.profile.myQr : STRINGS.profile.scanCode}
                  </h2>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setQrTab('my')}
                    className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                      qrTab === 'my' 
                        ? 'bg-white text-primary shadow-sm' 
                        : 'text-gray-500'
                    }`}
                  >
                    {STRINGS.profile.myCode}
                  </button>
                  <button
                    onClick={() => setQrTab('scan')}
                    className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                      qrTab === 'scan' 
                        ? 'bg-white text-primary shadow-sm' 
                        : 'text-gray-500'
                    }`}
                  >
                    {STRINGS.profile.scanCode}
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                {qrTab === 'my' ? (
                  <div className="w-full flex flex-col items-center">
                    <div className="w-full bg-gray-50 rounded-2xl p-6 flex flex-col items-center border border-gray-100 mb-6">
                      <div className="w-16 h-16 rounded-full overflow-hidden mb-3 border-2 border-white shadow-sm">
                        {profile.profilePhoto ? (
                          <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-800">{profile.fullName}</h3>

                      <div ref={qrRef} className="p-3 bg-white rounded-xl shadow-md border border-gray-100">
                        <QRCodeCanvas
                          value={user?.uid || ""}
                          size={180}
                          level="H"
                          includeMargin={false}
                          imageSettings={{
                            src: "/icon.svg",
                            height: 34,
                            width: 34,
                            excavate: true,
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button 
                        onClick={handleDownloadQr}
                        className="flex items-center justify-center space-x-2 py-3 bg-gray-100 rounded-xl text-gray-700 font-bold text-sm active:scale-95 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span>{STRINGS.common.save}</span>
                      </button>
                      <button 
                        onClick={handleShareQr}
                        className="flex items-center justify-center space-x-2 py-3 bg-gray-100 rounded-xl text-gray-700 font-bold text-sm active:scale-95 transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div className="w-full aspect-square bg-black rounded-2xl overflow-hidden shadow-xl relative mb-6">
                      <div id="reader" className="w-full h-full"></div>
                      
                      {/* Scanner Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-40 h-40 border-2 border-white/30 rounded-xl relative">
                          <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-md"></div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-md"></div>
                          <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-md"></div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-md"></div>
                          
                          <div className="absolute left-0 right-0 h-0.5 bg-white/50 top-1/2" />
                        </div>
                      </div>

                      {connectionStatus !== 'idle' && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
                          {connectionStatus === 'connecting' && (
                            <div className="space-y-4">
                              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                              <p className="text-white font-bold text-xs">{STRINGS.profile.connecting}</p>
                            </div>
                          )}
                          {connectionStatus === 'success' && (
                            <div className="space-y-4">
                              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                              </div>
                              <p className="text-white font-bold text-sm">{STRINGS.profile.connected}</p>
                            </div>
                          )}
                          {connectionStatus === 'error' && (
                            <div className="space-y-4">
                              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                              </div>
                              <p className="text-white font-bold text-[10px] leading-relaxed max-w-[200px]">{errorMessage}</p>
                              {errorMessage === STRINGS.profile.cameraPermissionDenied && (
                                <p className="text-white/60 text-[8px] max-w-[180px]">
                                  If the prompt doesn't appear, check the lock icon in your browser address bar.
                                </p>
                              )}
                              <button 
                                onClick={() => {
                                  setErrorMessage(null);
                                  setConnectionStatus('idle');
                                }}
                                className="px-6 py-2.5 bg-white text-black rounded-full text-[10px] font-bold active:scale-95 transition-all shadow-lg"
                              >
                                {STRINGS.profile.tryAgain}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {scannedCompany && connectionStatus === 'idle' && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
                          <div className="bg-white rounded-2xl p-6 w-full space-y-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                              <Building2 className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">{scannedCompany.name}</h3>
                              <p className="text-xs text-gray-500 mt-1">{STRINGS.profile.connectToCompany}</p>
                            </div>
                            <div className="flex space-x-3">
                              <button
                                onClick={() => setScannedCompany(null)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm"
                              >
                                {STRINGS.common.cancel}
                              </button>
                              <button
                                onClick={handleConnect}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
                              >
                                {STRINGS.profile.connect}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full space-y-3">
                      <p className="text-center text-gray-400 font-bold text-xs uppercase tracking-wider">{STRINGS.profile.scanCompanyQr}</p>
                      
                      <button
                        onClick={() => document.getElementById('gallery-input')?.click()}
                        className="w-full flex items-center justify-center space-x-2 py-3.5 bg-gray-100 rounded-xl text-gray-700 font-bold text-sm"
                      >
                        <ImageIcon className="w-4 h-4 text-primary" />
                        <span>{STRINGS.profile.scanFromGallery}</span>
                      </button>
                      
                      <input
                        id="gallery-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleGalleryScan}
                      />
                      <div id="reader-hidden" className="hidden"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Toast Notification */}
      {isEditing && JSON.stringify(profile) !== JSON.stringify(lastSavedProfile) && (
        <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
          <button
            onClick={handleSave}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/30 flex items-center justify-center space-x-2 active:scale-95 transition-all"
          >
            <Save className="w-5 h-5" />
            <span>{STRINGS.common.save || "Save Changes"}</span>
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-4 right-4 z-[100] flex justify-center pointer-events-none">
          <div className={cn(
            "px-6 py-3 rounded-2xl shadow-xl border flex items-center space-x-3 backdrop-blur-md",
            toast.type === 'success' 
              ? "bg-green-500/90 border-green-400/20 text-white" 
              : "bg-red-500/90 border-red-400/20 text-white"
          )}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}


