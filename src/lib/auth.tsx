"use client";

/* ============================================================
 * EzFameNp — multi-provider authentication.
 *
 * • Firebase mode (when apiKey/authDomain/appId are configured via
 *   env vars or the Admin ▸ Settings panel): Google OAuth, Apple ID,
 *   Email+Password and Anonymous — full firebase/auth flows.
 * • Local mode (zero-config): guest sessions + local email/password
 *   accounts (salted SHA-256 via WebCrypto) persisted in
 *   localStorage, mirrored to the Realtime Database when possible.
 *
 * Every method returns a result object — never throws.
 * ============================================================ */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut as fbSignOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth";
import { getFirebaseConfig, firebaseAuthConfigured } from "./rtdb";
import { saveUserProfile } from "./data";
import { randomHex, sha256Hex } from "./utils";
import type { AuthProviderId, UserProfile } from "./types";

const LS_SESSION = "ezfamenp:session";
const LS_LOCAL_USERS = "ezfamenp:localUsers";

export interface AuthResult {
  ok: boolean;
  code?: string;
}

interface LocalAccount {
  uid: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  role: "user" | "admin";
  createdAt: number;
  lastLoginAt: number;
}

interface AuthContextValue {
  user: UserProfile | null;
  ready: boolean;
  mode: "firebase" | "local";
  isAdmin: boolean;
  signInGoogle: () => Promise<AuthResult>;
  signInApple: () => Promise<AuthResult>;
  signInEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpEmail: (name: string, email: string, password: string) => Promise<AuthResult>;
  signInGuest: () => AuthResult;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ---------------- local account helpers ---------------- */

function readLocalUsers(): Record<string, LocalAccount> {
  try {
    const raw = localStorage.getItem(LS_LOCAL_USERS);
    return raw ? (JSON.parse(raw) as Record<string, LocalAccount>) : {};
  } catch {
    return {};
  }
}

function writeLocalUsers(users: Record<string, LocalAccount>) {
  try {
    localStorage.setItem(LS_LOCAL_USERS, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

function readSession(): UserProfile | null {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function writeSession(u: UserProfile | null) {
  try {
    if (u) localStorage.setItem(LS_SESSION, JSON.stringify(u));
    else localStorage.removeItem(LS_SESSION);
  } catch {
    /* ignore */
  }
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/* ---------------- provider mapping ---------------- */

function providerOf(fbUser: User): AuthProviderId {
  const pid = fbUser.providerData?.[0]?.providerId ?? "";
  if (pid.includes("google")) return "google";
  if (pid.includes("apple")) return "apple";
  if (pid === "password") return "password";
  if (fbUser.isAnonymous) return "guest";
  return "local";
}

function profileFromFb(fbUser: User): UserProfile {
  return {
    uid: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
    email: fbUser.email ?? undefined,
    provider: providerOf(fbUser),
    role: "user",
    createdAt: fbUser.metadata?.creationTime
      ? new Date(fbUser.metadata.creationTime).getTime()
      : Date.now(),
    lastLoginAt: Date.now(),
  };
}

/* ---------------- provider ---------------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    return readSession();
  });
  const [fbReady, setFbReady] = useState(false);
  const [mode] = useState<"firebase" | "local">(() =>
    typeof window !== "undefined" && firebaseAuthConfigured() ? "firebase" : "local",
  );

  /* --- firebase app/auth (only when fully configured) --- */
  const fbAuth: Auth | null = useMemo(() => {
    if (!firebaseAuthConfigured()) return null;
    try {
      const cfg = getFirebaseConfig();
      const existing = getApps().find((a) => a.name === "ezfamenp-auth");
      const app: FirebaseApp =
        existing ?? initializeApp({ ...cfg }, "ezfamenp-auth");
      return getAuth(app);
    } catch {
      return null;
    }
  }, []);

  /* --- firebase auth bootstrap (callbacks only — no sync setState) --- */
  useEffect(() => {
    if (!fbAuth) return; // local mode: ready from the start
    let unsubFb: () => void = () => undefined;
    let cancelled = false;

    try {
      unsubFb = onAuthStateChanged(
        fbAuth,
        (fbUser) => {
          if (cancelled) return;
          if (fbUser) {
            const profile = profileFromFb(fbUser);
            setUser(profile);
            writeSession(profile);
            // best-effort: mirror profile to the database
            void saveUserProfile(profile).catch(() => undefined);
          } else {
            const session = readSession();
            if (!session || session.provider === "guest") {
              setUser(null);
              writeSession(null);
            }
          }
          setFbReady(true);
        },
        () => setFbReady(true),
      );
    } catch {
      void Promise.resolve().then(() => setFbReady(true));
    }

    return () => {
      cancelled = true;
      unsubFb();
    };
  }, [fbAuth]);

  const ready = !fbAuth || fbReady;

  const finish = useCallback(
    async (profile: UserProfile): Promise<AuthResult> => {
      setUser(profile);
      writeSession(profile);
      try {
        await saveUserProfile(profile);
      } catch {
        /* offline — profile stays local */
      }
      return { ok: true };
    },
    [],
  );

  const err = (e: unknown): AuthResult => {
    const code =
      typeof e === "object" && e && "code" in e
        ? String((e as { code: string }).code)
        : "auth/unknown";
    return { ok: false, code };
  };

  const signInGoogle = useCallback(async (): Promise<AuthResult> => {
    if (!fbAuth) return { ok: false, code: "auth/not-configured" };
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(fbAuth, provider);
      return await finish(profileFromFb(cred.user));
    } catch (e) {
      return err(e);
    }
  }, [fbAuth, finish]);

  const signInApple = useCallback(async (): Promise<AuthResult> => {
    if (!fbAuth) return { ok: false, code: "auth/not-configured" };
    try {
      const provider = new OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      const cred = await signInWithPopup(fbAuth, provider);
      return await finish(profileFromFb(cred.user));
    } catch (e) {
      return err(e);
    }
  }, [fbAuth, finish]);

  const signInEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const mail = email.trim().toLowerCase();
      if (!validEmail(mail)) return { ok: false, code: "auth/invalid-email" };
      if (!password || password.length < 6) return { ok: false, code: "auth/weak-password" };

      if (fbAuth) {
        try {
          const cred = await signInWithEmailAndPassword(fbAuth, mail, password);
          return await finish(profileFromFb(cred.user));
        } catch (e) {
          return err(e);
        }
      }

      // local engine
      try {
        const users = readLocalUsers();
        const acc = users[mail];
        if (!acc) return { ok: false, code: "auth/user-not-found" };
        const hash = await sha256Hex(`${acc.salt}:${password}`);
        if (hash !== acc.hash) return { ok: false, code: "auth/wrong-password" };
        acc.lastLoginAt = Date.now();
        users[mail] = acc;
        writeLocalUsers(users);
        return await finish({
          uid: acc.uid,
          name: acc.name,
          email: acc.email,
          provider: "local",
          role: acc.role,
          createdAt: acc.createdAt,
          lastLoginAt: acc.lastLoginAt,
        });
      } catch {
        return { ok: false, code: "auth/unknown" };
      }
    },
    [fbAuth, finish],
  );

  const signUpEmail = useCallback(
    async (name: string, email: string, password: string): Promise<AuthResult> => {
      const mail = email.trim().toLowerCase();
      const displayName = name.trim() || mail.split("@")[0];
      if (!validEmail(mail)) return { ok: false, code: "auth/invalid-email" };
      if (!password || password.length < 6) return { ok: false, code: "auth/weak-password" };

      if (fbAuth) {
        try {
          const cred = await createUserWithEmailAndPassword(fbAuth, mail, password);
          try {
            await updateProfile(cred.user, { displayName });
          } catch {
            /* non-fatal */
          }
          return await finish({ ...profileFromFb(cred.user), name: displayName });
        } catch (e) {
          return err(e);
        }
      }

      // local engine
      try {
        const users = readLocalUsers();
        if (users[mail]) return { ok: false, code: "auth/email-already-in-use" };
        const salt = randomHex(16);
        const hash = await sha256Hex(`${salt}:${password}`);
        const acc: LocalAccount = {
          uid: `local_${randomHex(8)}`,
          name: displayName,
          email: mail,
          salt,
          hash,
          role: "user",
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        };
        users[mail] = acc;
        writeLocalUsers(users);
        return await finish({
          uid: acc.uid,
          name: acc.name,
          email: acc.email,
          provider: "local",
          role: acc.role,
          createdAt: acc.createdAt,
          lastLoginAt: acc.lastLoginAt,
        });
      } catch {
        return { ok: false, code: "auth/unknown" };
      }
    },
    [fbAuth, finish],
  );

  const signInGuest = useCallback((): AuthResult => {
    const profile: UserProfile = {
      uid: `guest_${randomHex(6)}`,
      name: "Guest",
      provider: "guest",
      role: "user",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    void finish(profile);
    return { ok: true };
  }, [finish]);

  const signOutUser = useCallback(async () => {
    if (fbAuth) {
      try {
        await fbSignOut(fbAuth);
      } catch {
        /* ignore */
      }
    }
    setUser(null);
    writeSession(null);
  }, [fbAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      mode,
      isAdmin: user?.role === "admin",
      signInGoogle,
      signInApple,
      signInEmail,
      signUpEmail,
      signInGuest,
      signOutUser,
    }),
    [user, ready, mode, signInGoogle, signInApple, signInEmail, signUpEmail, signInGuest, signOutUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** promote a locally-logged-in user to admin (used by the admin gate) */
export function elevateLocalAdmin() {
  try {
    const session = readSession();
    if (session) {
      const next = { ...session, role: "admin" as const };
      writeSession(next);
    }
  } catch {
    /* ignore */
  }
}
