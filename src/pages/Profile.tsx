import { useState, useEffect, ChangeEvent } from "react";
import { motion } from "motion/react";
import { Camera, Save, User, Building2, IdCard, Briefcase, Calendar, MapPin } from "lucide-react";
import { useStrings } from "../hooks/useStrings";
import { StorageService } from "../services/storage";
import { UserProfile } from "../types/app";

export default function Profile() {
  const STRINGS = useStrings();
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "",
    companyName: "",
    employeeId: "",
    department: "",
    designation: "",
    joinDate: "",
    profilePhoto: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const savedProfile = StorageService.getProfile();
    if (savedProfile) {
      setProfile(savedProfile);
    } else {
      setIsEditing(true);
    }
  }, []);

  const handleSave = () => {
    if (!profile.fullName?.trim()) {
      alert("Full Name is required");
      return;
    }
    StorageService.saveProfile(profile);
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
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-24"
    >
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.profile.title}</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold active:scale-95 transition-all"
          >
            {STRINGS.profile.editProfile}
          </button>
        )}
      </header>

      <div className="flex flex-col items-center space-y-6">
        <div className="relative group">
          <div className="w-36 h-36 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border-4 border-surface shadow-xl relative">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-20 h-20 text-on-primary-container opacity-40" />
            )}
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-1 right-1 p-3 bg-primary text-on-primary rounded-full shadow-lg cursor-pointer active:scale-90 transition-transform border-2 border-surface">
              <Camera className="w-5 h-5" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          )}
        </div>

        {!isEditing && (
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-on-surface">{profile.fullName}</h2>
            <p className="text-primary font-medium">{profile.designation || "Employee"}</p>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="bg-surface-variant/30 p-6 rounded-[32px] border border-outline/10 space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">
                {STRINGS.profile.fullName}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                  className="w-full bg-surface border border-outline rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">
                {STRINGS.profile.employeeId}
              </label>
              <div className="relative">
                <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
                <input
                  type="text"
                  value={profile.employeeId}
                  onChange={(e) => setProfile({ ...profile, employeeId: e.target.value })}
                  className="w-full bg-surface border border-outline rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  placeholder="EMP-001"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">
                {STRINGS.profile.companyName}
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
                <input
                  type="text"
                  value={profile.companyName}
                  onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                  className="w-full bg-surface border border-outline rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">
                  {STRINGS.profile.department}
                </label>
                <input
                  type="text"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  className="w-full bg-surface border border-outline rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  placeholder="IT"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">
                  {STRINGS.profile.designation}
                </label>
                <input
                  type="text"
                  value={profile.designation}
                  onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                  className="w-full bg-surface border border-outline rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                  placeholder="Developer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider ml-1">
                {STRINGS.profile.joinDate}
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
                <input
                  type="date"
                  value={profile.joinDate}
                  onChange={(e) => setProfile({ ...profile, joinDate: e.target.value })}
                  className="w-full bg-surface border border-outline rounded-2xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all mt-4 flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{STRINGS.profile.saveProfile}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          <ProfileField icon={IdCard} label={STRINGS.profile.employeeId} value={profile.employeeId} />
          <ProfileField icon={Building2} label={STRINGS.profile.companyName} value={profile.companyName} />
          <ProfileField icon={Briefcase} label={STRINGS.profile.department} value={profile.department} />
          <ProfileField icon={MapPin} label={STRINGS.profile.designation} value={profile.designation} />
          <ProfileField icon={Calendar} label={STRINGS.profile.joinDate} value={profile.joinDate} />
        </div>
      )}
    </motion.div>
  );
}

