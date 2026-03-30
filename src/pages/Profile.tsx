import { useState, useEffect, ChangeEvent, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Save, User, IdCard, Briefcase, Calendar, MapPin, Building2, QrCode, X, CheckCircle2, Shield, Image as ImageIcon, AlertCircle, Share2, Download, ArrowLeft, MoreVertical, Plus, Copy } from "lucide-react";
import { useStrings } from "../hooks/useStrings";
import { StorageService } from "../services/storage";
import { UserProfile } from "../types/app";
import { useFirebase } from "../components/FirebaseProvider";
import { db, doc, setDoc, getDoc, handleFirestoreError, OperationType } from "../firebase";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { QRCodeCanvas } from "qrcode.react";

export default function Profile() {
  const STRINGS = useStrings();
  const { user, profile: firebaseProfile } = useFirebase();
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
  const [showQrView, setShowQrView] = useState(false);
  const [qrTab, setQrTab] = useState<'my' | 'scan'>('my');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedProfile = StorageService.getProfile();
    let initialProfile = savedProfile || firebaseProfile || {
      fullName: "",
      companyName: "",
      employeeId: "",
      department: "",
      designation: "",
      joinDate: "",
      profilePhoto: "",
      companyId: "",
    };

    // Ensure employeeId matches user.uid
    if (user?.uid && initialProfile.employeeId !== user.uid) {
      initialProfile = { ...initialProfile, employeeId: user.uid };
    }

    setProfile(initialProfile);
    
    if (!savedProfile && !firebaseProfile) {
      setIsEditing(true);
    }
  }, [firebaseProfile, user?.uid]);

  useEffect(() => {
    if (showQrView && qrTab === 'scan' && connectionStatus === 'idle') {
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode("reader");
          html5QrCodeRef.current = html5QrCode;
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            onScanSuccess,
            onScanFailure
          );
        } catch (err: any) {
          console.error("Error starting scanner", err);
          setConnectionStatus('error');
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setErrorMessage("Camera access was denied. Please enable camera permissions in your browser settings to scan QR codes.");
          } else {
            setErrorMessage("Failed to start the camera. Please ensure no other app is using it and try again.");
          }
        }
      };

      const timer = setTimeout(startScanner, 100);
      
      return () => {
        clearTimeout(timer);
        const scanner = html5QrCodeRef.current;
        if (scanner) {
          const stopScanner = async () => {
            try {
              // Check if scanner is running before attempting to stop
              // Html5QrcodeScannerState.SCANNING = 2, PAUSED = 3
              const state = (scanner as any).getState();
              if (state === 2 || state === 3) {
                await scanner.stop();
              }
            } catch (err) {
              // Ignore "scanner is not running" errors
              const errorMsg = err instanceof Error ? err.message : String(err);
              if (!errorMsg.includes("not running") && !errorMsg.includes("not started")) {
                console.error("Failed to stop scanner", err);
              }
            } finally {
              html5QrCodeRef.current = null;
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
        const updatedProfile = { 
          ...profile, 
          companyId: decodedText, 
          companyName: companyData.name 
        };
        
        StorageService.saveProfile(updatedProfile);
        setProfile(updatedProfile);
        
        if (user) {
          await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
        }
        
        setConnectionStatus('success');
        setTimeout(() => {
          setShowQrView(false);
          setConnectionStatus('idle');
        }, 2000);
      } else {
        setConnectionStatus('error');
        setErrorMessage("This company ID was not found.");
        setTimeout(() => {
          setConnectionStatus('idle');
          setErrorMessage(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error connecting to company:', error);
      setConnectionStatus('error');
      setErrorMessage("An error occurred while connecting.");
      setTimeout(() => {
        setConnectionStatus('idle');
        setErrorMessage(null);
      }, 3000);
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
        setErrorMessage("Could not find QR code in this image. Please try a clearer photo.");
      } else {
        setErrorMessage("Failed to read the image file.");
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
    
    // Final sync before saving
    const finalProfile = {
      ...profile,
      employeeId: user?.uid || profile.employeeId
    };

    StorageService.saveProfile(finalProfile);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), finalProfile, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
    setProfile(finalProfile);
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

  const handleDownloadQr = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR_${profile.fullName || "User"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ProfileField = ({ icon: Icon, label, value }: { icon: any, label: string, value?: string }) => (
    <div className="flex items-center space-x-4 p-4 bg-surface-variant/20 rounded-2xl border border-outline/5">
      <div className="p-2.5 bg-primary/10 rounded-xl">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-60">{label}</p>
        <p className="text-sm font-medium text-on-surface">{value || "—"}</p>
      </div>
    </div>
  );  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-24"
    >
      {/* WhatsApp Style Profile Header */}
      <header className="flex items-center justify-between p-2">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-primary-container overflow-hidden border-2 border-surface shadow-sm">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 m-auto mt-3 text-on-primary-container opacity-40" />
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-on-surface">{profile.fullName || STRINGS.dashboard.guest}</h1>
            <p className="text-xs text-on-surface-variant opacity-70 truncate max-w-[150px]">
              {profile.designation || "Call only emergency otherwise me..."}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => {
              setQrTab('my');
              setShowQrView(true);
            }}
            className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
          >
            <QrCode className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Profile Content */}
      <div className="px-2">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-on-surface opacity-60 uppercase tracking-widest text-[10px]">
            {STRINGS.profile.title}
          </h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold active:scale-95 transition-all"
            >
              {STRINGS.profile.editProfile}
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="bg-surface-variant/30 p-6 rounded-[32px] border border-outline/10 space-y-5">
            <div className="flex flex-col items-center mb-6">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border-4 border-surface shadow-xl relative">
                  {profile.profilePhoto ? (
                    <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-on-primary-container opacity-40" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <label className="absolute bottom-0 right-0 p-2.5 bg-primary text-on-primary rounded-full shadow-lg cursor-pointer active:scale-90 transition-transform border-2 border-surface">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant opacity-60 uppercase tracking-widest pl-1">{STRINGS.profile.fullName}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary opacity-40" />
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-outline/10 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                    placeholder={STRINGS.profile.fullName}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant opacity-60 uppercase tracking-widest pl-1">{STRINGS.profile.employeeId}</label>
                <div className="relative">
                  <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary opacity-40" />
                  <input
                    type="text"
                    value={profile.employeeId || user?.uid || ""}
                    readOnly
                    className="w-full pl-12 pr-4 py-4 bg-surface-variant/50 rounded-2xl border border-outline/10 outline-none font-mono text-sm opacity-70 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-on-surface-variant opacity-50 pl-1 italic">Linked to your secure User ID</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant opacity-60 uppercase tracking-widest pl-1">{STRINGS.profile.designation}</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary opacity-40" />
                  <input
                    type="text"
                    value={profile.designation}
                    onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-surface rounded-2xl border border-outline/10 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                    placeholder={STRINGS.profile.designation}
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-4 bg-surface-variant text-on-surface-variant rounded-2xl font-bold active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-4 bg-primary text-on-primary rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center space-x-2"
              >
                <Save className="w-5 h-5" />
                <span>{STRINGS.profile.save}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-surface p-5 rounded-3xl border border-outline/5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 text-primary">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{STRINGS.profile.fullName}</span>
                  </div>
                </div>
                <p className="text-on-surface font-bold text-lg pl-1">{profile.fullName || STRINGS.dashboard.guest}</p>
              </div>

              <div className="bg-surface p-5 rounded-3xl border border-outline/5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 text-secondary">
                    <div className="p-2 bg-secondary/10 rounded-xl">
                      <IdCard className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{STRINGS.profile.employeeId}</span>
                  </div>
                  <button 
                    onClick={handleCopyId}
                    className="p-2 hover:bg-secondary/10 rounded-full text-secondary transition-colors relative"
                    title="Copy ID"
                  >
                    <AnimatePresence mode="wait">
                      {copied ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Share2 className="w-4 h-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
                <p className="text-on-surface font-mono font-bold text-sm pl-1 tracking-wider">{profile.employeeId || user?.uid}</p>
              </div>

              <div className="bg-surface p-5 rounded-3xl border border-outline/5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 text-tertiary">
                    <div className="p-2 bg-tertiary/10 rounded-xl">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{STRINGS.profile.designation}</span>
                  </div>
                </div>
                <p className="text-on-surface font-bold text-lg pl-1">{profile.designation || STRINGS.profile.employee}</p>
              </div>

              <div className="bg-surface p-5 rounded-3xl border border-outline/5 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 text-primary">
                    <div className="p-2 bg-primary/10 rounded-xl">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{STRINGS.profile.company}</span>
                  </div>
                  {!profile.companyId && (
                    <button 
                      onClick={() => {
                        setQrTab('scan');
                        setShowQrView(true);
                      }}
                      className="text-[10px] text-primary font-black px-4 py-1.5 bg-primary/10 rounded-full uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all"
                    >
                      Connect
                    </button>
                  )}
                </div>
                <p className="text-on-surface font-bold text-lg pl-1">{profile.companyName || "Not Connected"}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showQrView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQrView(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-[32px] overflow-hidden shadow-2xl bg-surface"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-outline/10">
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setShowQrView(false)} 
                    className="p-2 rounded-full transition-colors hover:bg-on-surface/5 text-on-surface"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <h2 className="text-lg font-bold text-on-surface">
                    {qrTab === 'my' ? STRINGS.profile.myCode : STRINGS.profile.scanCode}
                  </h2>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setQrTab('my')}
                    className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                      qrTab === 'my' 
                        ? 'bg-primary text-on-primary' 
                        : 'text-on-surface-variant hover:bg-on-surface/5'
                    }`}
                  >
                    My
                  </button>
                  <button
                    onClick={() => setQrTab('scan')}
                    className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                      qrTab === 'scan' 
                        ? 'bg-primary text-on-primary' 
                        : 'text-on-surface-variant hover:bg-on-surface/5'
                    }`}
                  >
                    Scan
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                {qrTab === 'my' ? (
                  <div className="w-full flex flex-col items-center mt-8">
                    {/* QR Card */}
                    <div className="w-full bg-surface-variant rounded-[24px] relative pt-16 pb-10 px-6 flex flex-col items-center border border-outline/10">
                      {/* Profile Pic Overlap */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border-4 border-surface shadow-xl overflow-hidden bg-surface-variant">
                        {profile.profilePhoto ? (
                          <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                            <User className="w-10 h-10 text-primary opacity-40" />
                          </div>
                        )}
                      </div>

                      <div className="text-center space-y-1 mb-6">
                        <h3 className="text-xl font-bold text-on-surface tracking-tight">{profile.fullName}</h3>
                        <p className="text-xs text-on-surface-variant font-medium">{profile.designation || "Employee contact"}</p>
                      </div>

                      <div ref={qrRef} className="p-3 bg-white rounded-[20px] shadow-lg flex flex-col items-center">
                        <QRCodeCanvas
                          value={user?.uid || ""}
                          size={200}
                          level="H"
                          includeMargin={false}
                          className="rounded-lg"
                        />
                      </div>

                      <div className="mt-6 text-center">
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-[0.4em] mb-1">
                          Employee ID
                        </p>
                        <div className="flex items-center justify-center space-x-2">
                          <p className="text-lg font-mono font-bold text-on-surface tracking-widest">
                            {profile.employeeId || user?.uid}
                          </p>
                          <button 
                            onClick={handleCopyId}
                            className="p-1.5 hover:bg-on-surface/5 rounded-full text-primary transition-colors"
                          >
                            {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 opacity-40" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 w-full mt-6">
                      <button 
                        onClick={handleDownloadQr}
                        className="flex items-center justify-center space-x-2 py-3 bg-surface-variant rounded-2xl border border-outline/10 text-on-surface hover:bg-on-surface/5 transition-all text-xs font-bold uppercase tracking-wider"
                      >
                        <Download className="w-4 h-4 text-primary" />
                        <span>Save</span>
                      </button>
                      <button 
                        onClick={async () => {
                          if (navigator.share) {
                            try {
                              await navigator.share({
                                title: 'My Profile QR',
                                text: `Connect with me. ID: ${profile.employeeId || user?.uid}`,
                                url: window.location.href
                              });
                            } catch (err) {
                              console.error('Error sharing:', err);
                            }
                          }
                        }}
                        className="flex items-center justify-center space-x-2 py-3 bg-surface-variant rounded-2xl border border-outline/10 text-on-surface hover:bg-on-surface/5 transition-all text-xs font-bold uppercase tracking-wider"
                      >
                        <Share2 className="w-4 h-4 text-secondary" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center space-y-6">
                    <div className="w-full aspect-square bg-black rounded-[24px] overflow-hidden shadow-xl border-4 border-outline/10 relative">
                      <div id="reader" className="w-full h-full"></div>
                      
                      {/* Scanner Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-primary/50 rounded-2xl relative">
                          <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                          <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                          <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                          
                          {/* Scanning Line */}
                          <motion.div
                            animate={{ top: ['10%', '90%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-0.5 bg-primary/50 shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                          />
                        </div>
                      </div>

                      {connectionStatus !== 'idle' && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 text-center">
                          {connectionStatus === 'connecting' && (
                            <div className="space-y-4">
                              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                              <p className="text-white font-bold text-sm">Connecting...</p>
                            </div>
                          )}
                          {connectionStatus === 'success' && (
                            <div className="space-y-4">
                              <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8 text-success" />
                              </div>
                              <p className="text-white font-bold">Connected!</p>
                            </div>
                          )}
                          {connectionStatus === 'error' && (
                            <div className="space-y-4">
                              <div className="w-12 h-12 bg-error/20 rounded-full flex items-center justify-center mx-auto">
                                <AlertCircle className="w-8 h-8 text-error" />
                              </div>
                              <p className="text-white font-bold text-xs">{errorMessage}</p>
                              <button 
                                onClick={() => setConnectionStatus('idle')}
                                className="px-4 py-2 bg-white/10 text-white rounded-full text-[10px] font-bold"
                              >
                                Try Again
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <p className="text-on-surface/60 font-bold text-sm">Scan Company QR</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


