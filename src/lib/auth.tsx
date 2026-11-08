"use client";

/* ============================================================
 * EzFame — multi-provider authentication with admin approval flow.
 *
 * • Firebase mode (strict project config, always initialized):
 *   Google OAuth, Apple ID, Email+Password. If a provider is not
 *   enabled on the Firebase project, email auth transparently falls
 *   back to the built-in local engine so sign-up NEVER breaks.
 * • Local mode fallback: guest sessions + local email/password
 *   accounts (salted SHA-256) mirrored to the Realtime Database.
 *
 * • Approval flow: every NEW account is stored with status
 *   "pending" and is blocked from the app until an admin sets it
 *   to "active". "suspended" users are signed out in real time.
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
import { getFirebaseConfig, firebaseAuthConfigured, subscribe } from "./rtdb";
import { deleteUserProfile, getUserProfile, patchUser, saveUserProfile } from "./data";
import { useToasts } from "./store";
import { randomHex, sha256Hex } from "./utils";
import type { AuthProviderId, UserProfile } from "./types";

const LS_SESSION = "ezfame:session";
const LS_LOCAL_USERS = "ezfame:localUsers";

export interface AuthResult {
  ok: boolean;
  code?: string;
  /** status of the account after the auth attempt */
  status?: UserProfile["status"];
}

interface LocalAccount {
  uid: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  role: "user" | "admin";
  status: UserProfile["status"];
  createdAt: number;
  lastLoginAt: number;
}

interface AuthContextValue {
  user: UserProfile | null;
  ready: boolean;
  mode: "firebase" | "local";
  isAdmin: boolean;
  /** true when the signed-in user may browse the store (guests + active) */
  canBrowse: boolean;
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

/** Firebase codes that mean "this provider is unavailable" → use local engine. */
function providerDisabledCode(code?: string): boolean {
  return [
    "auth/operation-not-allowed",
    "auth/configuration-not-found",
    "auth/invalid-api-key",
    "auth/api-key-not-valid",
    "auth/api-key-not-valid.-please-pass-a-valid-api-key.",
    "auth/admin-restricted-operation",
    "auth/network-request-failed",
    "auth/internal-error",
  ].includes(code ?? "");
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

  /* --- firebase app/auth (strict project config) --- */
  const fbAuth: Auth | null = useMemo(() => {
    if (!firebaseAuthConfigured()) return null;
    try {
      const cfg = getFirebaseConfig();
      const existing = getApps().find((a) => a.name === "ezfame-auth");
      const app: FirebaseApp = existing ?? initializeApp({ ...cfg }, "ezfame-auth");
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
            const base = profileFromFb(fbUser);
            // merge with the stored profile (status/role) — never clobber admin fields
            void saveUserProfile(base)
              .then((merged) => {
                setUser(merged);
                writeSession(merged);
              })
              .catch(() => {
                setUser(base);
                writeSession(base);
              });
          } else {
            const session = readSession();
            if (!session || session.provider === "guest" || session.provider === "local") {
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

  const signOutInternal = useCallback(async () => {
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

  /* --- real-time approval / suspension listener --- */
  const uid = user?.uid ?? null;
  useEffect(() => {
    if (!uid) return;
    const unsub = subscribe<UserProfile>(`csmm/users/${uid}`, (remote) => {
      if (!remote) {
        // account deleted by admin → force sign-out
        void signOutInternal();
        return;
      }
      setUser((prev) => {
        if (!prev || prev.uid !== remote.uid) return prev;
        const next: UserProfile = { ...prev, ...remote };
        try {
          localStorage.setItem(LS_SESSION, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      if (remote.status === "suspended") {
        void signOutInternal();
        try {
          useToasts.getState().push(
            "error",
            "Account suspended",
            "Your access was revoked by an administrator.",
          );
        } catch {
          /* ignore */
        }
      }
    });
    return () => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
  }, [uid, signOutInternal]);

  const finish = useCallback(async (profile: UserProfile): Promise<AuthResult> => {
    let merged = profile;
    try {
      merged = await saveUserProfile(profile);
    } catch {
      /* offline — profile stays local */
    }
    setUser(merged);
    writeSession(merged);
    return { ok: true, status: merged.status };
  }, []);

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

  const localProfileOf = (acc: LocalAccount): UserProfile => ({
    uid: acc.uid,
    name: acc.name,
    email: acc.email,
    provider: "local",
    role: acc.role,
    status: acc.status,
    createdAt: acc.createdAt,
    lastLoginAt: acc.lastLoginAt,
  });

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
          const res = err(e);
          if (!providerDisabledCode(res.code)) return res;
          // provider disabled → transparent local fallback
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
        if (!acc.status) acc.status = "active"; // grandfathered local accounts
        users[mail] = acc;
        writeLocalUsers(users);
        return await finish(localProfileOf(acc));
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
          // new accounts are stored as "pending" by saveUserProfile
          return await finish({ ...profileFromFb(cred.user), name: displayName });
        } catch (e) {
          const res = err(e);
          if (res.code === "auth/email-already-in-use") return res;
          if (!providerDisabledCode(res.code)) return res;
          // provider disabled → transparent local fallback
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
          status: "pending", // approval required before browsing
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
        };
        users[mail] = acc;
        writeLocalUsers(users);
        return await finish(localProfileOf(acc));
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
      status: "active",
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };
    // guests stay device-local by design (no DB record → nothing to approve)
    setUser(profile);
    writeSession(profile);
    return { ok: true, status: profile.status };
  }, []);

  const signOutUser = useCallback(async () => {
    const session = readSession();
    // best-effort: persist lastLoginAt before leaving
    if (session && session.provider !== "guest") {
      void patchUser(session.uid, {}).catch(() => undefined);
    }
    await signOutInternal();
  }, [signOutInternal]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      mode,
      isAdmin: user?.role === "admin" && user?.status !== "suspended",
      canBrowse:
        !user || user.provider === "guest" || !user.status || user.status === "active",
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

/** admin-panel helper: remove a user account completely */
export async function adminDeleteUser(uid: string): Promise<boolean> {
  try {
    return await deleteUserProfile(uid);
  } catch {
    return false;
  }
}

/** admin-panel helper: read the authoritative DB profile for a uid */
export async function fetchDbProfile(uid: string): Promise<UserProfile | null> {
  try {
    return await getUserProfile(uid);
  } catch {
    return null;
  }
}
