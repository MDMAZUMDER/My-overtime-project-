import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, User, loginAnonymously, db, doc, getDoc, setDoc, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types/app';

interface FirebaseContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Fetch profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Create initial profile if it doesn't exist
            const initialProfile: UserProfile = {
              fullName: currentUser.displayName || 'User',
            };
            await setDoc(doc(db, 'users', currentUser.uid), initialProfile);
            setProfile(initialProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        // Automatically login anonymously if no user
        try {
          await loginAnonymously();
        } catch (error: any) {
          if (error.code === 'auth/admin-restricted-operation') {
            console.warn('Anonymous login is disabled in Firebase Console. Using local storage only.');
          } else {
            console.error('Anonymous login failed:', error);
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </FirebaseContext.Provider>
  );
};
