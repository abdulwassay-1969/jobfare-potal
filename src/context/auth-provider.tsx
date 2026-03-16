
// src/context/auth-provider.tsx
"use client";

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, writeBatch, Firestore, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import type { UserRole } from '@/lib/types';
import { hasAdminClaim } from '@/lib/security';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  profileStatus: 'pending' | 'approved' | 'rejected' | null;
  profileName: string | null;
  accountState: 'active' | 'missing-profile';
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  profileStatus: null,
  profileName: null,
  accountState: 'active',
});

/**
 * Ensures the necessary database documents for the main admin user and global system state exist.
 * This is a critical security and initialization function for the unified administrator account.
 */
async function ensureAdminProfile(db: Firestore, user: User) {
  const isAdmin = await hasAdminClaim(user);
  if (!isAdmin) return;

  const userProfileRef = doc(db, 'userProfiles', user.uid);
  const adminRef = doc(db, 'admins', user.uid);
  const eventStateRef = doc(db, 'eventState', 'status');

  try {
    const batch = writeBatch(db);
    
    // 1. Core user profile
    batch.set(userProfileRef, {
        id: user.uid,
        email: user.email,
        name: 'Main Administrator',
        roles: ['admin'],
        updatedAt: serverTimestamp(),
    }, { merge: true });

    // 2. High-privilege admin role record
    batch.set(adminRef, {
        id: user.uid,
        userProfileId: user.uid,
        universityRole: "Main Administrator",
        createdAt: serverTimestamp(),
    }, { merge: true });

    // 3. Initial global event state (break status)
    // We use setDoc with merge to ensure it exists for all users to read
    batch.set(eventStateRef, {
        isBreakActive: false,
        breakMessage: "The event is currently on a break. Recruitment activities will resume shortly.",
        updatedAt: serverTimestamp(),
    }, { merge: true });

    await batch.commit();
  } catch (error) {
    // Admin setup might be restricted during very first login attempt; fallback to silent handling
    console.warn("Main Admin initialization notice (safe to ignore if dashboard loads): ", error);
  }
}

/**
 * Maps a role string to its corresponding Firestore collection.
 */
function getCollectionNameForRole(role: UserRole): string {
    if (role === 'company') return 'companies';
    if (role === 'admin') return 'admins';
    return `${role}s`;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [role, setRole] = useState<UserRole | null>(null);
  const [profileStatus, setProfileStatus] = useState<AuthContextType['profileStatus']>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [accountState, setAccountState] = useState<AuthContextType['accountState']>('active');
  const [profileLoading, setProfileLoading] = useState(true);

  // 1. Core Authentication Listener
  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // 2. Role and Profile Metadata Listener
  useEffect(() => {
    if (authLoading || !db) return;

    let cancelled = false;
    let userProfileUnsubscribe: Unsubscribe | null = null;
    let roleProfileUnsubscribe: Unsubscribe | null = null;

    if (!user) {
      setRole(null);
      setProfileStatus(null);
      setProfileName(null);
      setAccountState('active');
      setProfileLoading(false);
      return;
    }
    
    setProfileLoading(true);

    const initializeRoleState = async () => {
      const isAdmin = await hasAdminClaim(user);
      if (cancelled) return;

      if (isAdmin) {
        ensureAdminProfile(db, user).finally(() => {
          if (cancelled) return;
          setRole('admin');
          setProfileStatus('approved');
          setProfileName('Main Administrator');
          setAccountState('active');
          setProfileLoading(false);
        });
        return;
      }

      userProfileUnsubscribe = onSnapshot(doc(db, 'userProfiles', user.uid), (userProfileDoc) => {
        if (roleProfileUnsubscribe) {
          roleProfileUnsubscribe();
          roleProfileUnsubscribe = null;
        }

        if (!userProfileDoc.exists()) {
          setRole(null);
          setProfileStatus(null);
          setProfileName(user.displayName || 'User');
          setAccountState('missing-profile');
          setProfileLoading(false);
          return;
        }

        const userData = userProfileDoc.data();
        setAccountState('active');
        const currentRole = (userData.roles as UserRole[])?.[0] || null;
        setRole(currentRole);

        if (currentRole) {
          const collectionName = getCollectionNameForRole(currentRole);
          const profileDocRef = doc(db, collectionName, user.uid);

          roleProfileUnsubscribe = onSnapshot(profileDocRef, (profileDoc) => {
            if (profileDoc.exists()) {
              const profileData = profileDoc.data();
              setProfileStatus(profileData.status || 'approved');
              setProfileName(profileData.companyName || profileData.fullName || userData.name);
            } else {
              setProfileStatus('pending');
              setProfileName(userData.name);
            }
            setProfileLoading(false);
          }, (error) => {
            console.error(`Error loading ${currentRole} details:`, error);
            setProfileLoading(false);
          });
        } else {
          setProfileStatus(null);
          setProfileName(userData.name);
          setProfileLoading(false);
        }
      }, (error) => {
        console.error("Error loading user identity:", error);
        setProfileLoading(false);
      });
    };

    initializeRoleState();

    return () => {
      cancelled = true;
      if (userProfileUnsubscribe) userProfileUnsubscribe();
      if (roleProfileUnsubscribe) roleProfileUnsubscribe();
    };
  }, [user, db, authLoading]);

  const loading = authLoading || profileLoading;

  return (
    <AuthContext.Provider value={{ user, role, loading, profileStatus, profileName, accountState }}>
      {children}
    </AuthContext.Provider>
  );
};
