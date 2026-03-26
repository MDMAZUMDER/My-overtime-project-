import { useState, useEffect, ChangeEvent } from "react";
import { motion } from "motion/react";
import { Camera, Save, User } from "lucide-react";
import { useStrings } from "../hooks/useStrings";
import { StorageService } from "../services/storage";
import { UserProfile } from "../types/app";

export default function Profile() {
  const STRINGS = useStrings();
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "",
    companyName: "",
    profilePhoto: "",
  });
  const [isEditing, setIsEditing] = useState(true);

  useEffect(() => {
    const savedProfile = StorageService.getProfile();
    if (savedProfile) {
      setProfile(savedProfile);
      setIsEditing(false);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-on-surface">{STRINGS.profile.title}</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-primary font-medium text-sm"
          >
            {STRINGS.profile.editProfile}
          </button>
        )}
      </header>

      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border-4 border-surface shadow-lg">
            {profile.profilePhoto ? (
              <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-on-primary-container opacity-40" />
            )}
          </div>
          {isEditing && (
            <label className="absolute bottom-0 right-0 p-2 bg-primary text-on-primary rounded-full shadow-md cursor-pointer active:scale-90 transition-transform">
              <Camera className="w-5 h-5" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          )}
        </div>

        {!isEditing && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-on-surface">{profile.fullName}</h2>
            {profile.companyName && (
              <p className="text-on-surface-variant opacity-70">{profile.companyName}</p>
            )}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="bg-surface-variant/30 p-6 rounded-3xl border border-outline/10 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface-variant ml-1">
              {STRINGS.profile.fullName}
            </label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface-variant ml-1">
              {STRINGS.profile.companyName}
            </label>
            <input
              type="text"
              value={profile.companyName}
              onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-primary text-on-primary font-bold py-4 rounded-2xl shadow-lg hover:bg-primary/90 active:scale-95 transition-all mt-4 flex items-center justify-center space-x-2"
          >
            <Save className="w-5 h-5" />
            <span>{STRINGS.profile.saveProfile}</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
