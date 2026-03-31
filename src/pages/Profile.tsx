import { useState, useEffect, ChangeEvent, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Save, User, IdCard, Briefcase, Calendar, MapPin, Building2, QrCode, X, CheckCircle2, Shield, Image as ImageIcon, AlertCircle, Share2, Download, ArrowLeft, MoreVertical, Plus, Copy } from "lucide-react";
import { useStrings } from "../hooks/useStrings";
import { StorageService } from "../services/storage";
import { UserProfile } from "../types/app";
import { useFirebase } from "../components/FirebaseProvider";
import { db, doc, setDoc, getDoc, handleFirestoreError, OperationType } from "../firebase";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { QRCodeCanvas } from "qrcode.react";
import { useNavigate } from "react-router-dom";

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

    setProfile(initialProfile);
    
    if (!savedProfile && !firebaseProfile) {
      setIsEditing(true);
    }
  }, [firebaseProfile, user?.uid]);

  useEffect(() => {
    let isMounted = true;
    let currentScanner: Html5Qrcode | null = null;

    if (showQrView && qrTab === 'scan' && connectionStatus === 'idle') {
      const startScanner = async () => {
        try {
          // Ensure the element exists before starting
          const readerElement = document.getElementById("reader");
          if (!readerElement) return;

          // If there's an existing scanner, try to stop it first
          if (html5QrCodeRef.current) {
            try {
              const state = (html5QrCodeRef.current as any).getState();
              if (state === 2 || state === 3) {
                await html5QrCodeRef.current.stop();
              }
            } catch (e) {
              console.warn("Error stopping previous scanner", e);
            }
          }

          currentScanner = new Html5Qrcode("reader");
          html5QrCodeRef.current = currentScanner;
          
          // Try to get cameras first to see if any are available
          const cameras = await Html5Qrcode.getCameras().catch(() => []);
          
          if (cameras && cameras.length > 0) {
            // Prefer back camera if available
            const backCamera = cameras.find(cam => 
              cam.label.toLowerCase().includes('back') || 
              cam.label.toLowerCase().includes('rear') ||
              cam.label.toLowerCase().includes('environment')
            );
            
            const cameraId = backCamera ? backCamera.id : cameras[0].id;
            
            await currentScanner.start(
              cameraId,
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
              },
              onScanSuccess,
              onScanFailure
            );
          } else {
            // Fallback to facingMode if getCameras fails or returns empty
            await currentScanner.start(
              { facingMode: "environment" },
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
              },
              onScanSuccess,
              onScanFailure
            );
          }
        } catch (err: any) {
          if (!isMounted) return;
          console.error("Error starting scanner", err);
          setConnectionStatus('error');
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setErrorMessage(STRINGS.profile.cameraPermissionDenied);
          } else {
            setErrorMessage(STRINGS.profile.cameraStartFailed);
          }
        }
      };

      // Increased delay to ensure DOM is ready and previous instances are cleared
      const timer = setTimeout(startScanner, 500);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (currentScanner) {
          const stopScanner = async () => {
            try {
              const state = (currentScanner as any).getState();
              if (state === 2 || state === 3) {
                await currentScanner.stop();
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
    
    // Final sync before saving
    const finalProfile = {
      ...profile,
      employeeId: profile.employeeId || user?.uid || ""
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-3xl mx-auto pb-32 pt-4"
    >
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

      {/* Hero Section */}
      <section className="relative py-8 px-6 text-center">
        <div className="relative inline-block mb-4">
          <div className="w-28 h-28 rounded-full bg-white p-1 shadow-md border border-gray-100">
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-50 relative group">
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <User className="w-12 h-12 text-gray-300" />
                </div>
              )}
              {isEditing && (
                <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
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
              className="absolute bottom-0 right-0 p-2.5 bg-primary text-white rounded-full shadow-lg z-10 border-2 border-white"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-xl font-bold text-gray-900">
              {profile.fullName || STRINGS.dashboard.guest}
            </h1>
            {profile.companyId && (
              <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-500/10" />
            )}
          </div>
          {profile.companyName && (
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 mt-1">
              <Building2 className="w-3 h-3 mr-1" />
              {profile.companyName}
            </div>
          )}
        </div>
      </section>

      {/* Main Content */}
      <div className="px-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Profile Details</h2>
          {!isEditing && (
            <div className="flex items-center space-x-3">
              <button
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: profile.fullName,
                        text: `Check out my profile on Overtime Master. ID: ${profile.employeeId}`,
                        url: window.location.href
                      });
                    } catch (err) {
                      console.error('Error sharing:', err);
                    }
                  }
                }}
                className="p-2 text-gray-400 hover:text-primary transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-bold text-primary hover:underline"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-5 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary outline-none transition-all font-medium text-sm"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 ml-1">Employee ID</label>
                <div className="relative">
                  <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={profile.employeeId}
                    onChange={(e) => setProfile({ ...profile, employeeId: e.target.value })}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-xl border border-gray-100 focus:border-primary outline-none transition-all font-medium text-sm"
                    placeholder="e.g. EMP12345"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3.5 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-primary/20"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ProfileField 
              icon={User} 
              label="Full Name" 
              value={profile.fullName || "Guest User"} 
              colorClass="text-blue-500"
              bgClass="bg-blue-50"
            />
            
            <ProfileField 
              icon={IdCard} 
              label="Employee ID" 
              value={profile.employeeId || user?.uid} 
              colorClass="text-purple-500"
              bgClass="bg-purple-50"
              action={
                <button 
                  onClick={handleCopyId}
                  className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      </motion.div>
                    ) : (
                      <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                        <Copy className="w-4 h-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              }
            />

            <ProfileField 
              icon={Building2} 
              label="Company" 
              value={profile.companyName || "Not Connected"} 
              colorClass="text-indigo-500"
              bgClass="bg-indigo-50"
              action={!profile.companyId && (
                <button 
                  onClick={() => {
                    setQrTab('scan');
                    setShowQrView(true);
                  }}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-bold shadow-sm"
                >
                  Connect
                </button>
              )}
            />

            <div className="pt-6">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center space-x-2 p-4 text-red-500 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
              >
                <X className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
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
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button 
                        onClick={handleDownloadQr}
                        className="flex items-center justify-center space-x-2 py-3 bg-gray-100 rounded-xl text-gray-700 font-bold text-sm"
                      >
                        <Download className="w-4 h-4" />
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
                        className="flex items-center justify-center space-x-2 py-3 bg-gray-100 rounded-xl text-gray-700 font-bold text-sm"
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
                          
                          <motion.div
                            animate={{ top: ['10%', '90%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute left-0 right-0 h-0.5 bg-white/50"
                          />
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
                              <p className="text-white font-bold text-[10px]">{errorMessage}</p>
                              <button 
                                onClick={() => setConnectionStatus('idle')}
                                className="px-4 py-2 bg-white text-black rounded-full text-[10px] font-bold"
                              >
                                {STRINGS.profile.tryAgain}
                              </button>
                            </div>
                          )}
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


