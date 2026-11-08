"use client";

/* ============================================================
 * EzFame — SPA root.
 * One Next.js route ("/") hosts the entire hash-routed app:
 *   #/            home + shop
 *   #/checkout    payment & order submission
 *   #/orders      order tracking
 *   #/account     profile & preferences
 *   #/login       multi-provider auth
 *   #/original    hidden admin control center
 * ============================================================ */

import { AnimatePresence, motion } from "framer-motion";
import { Hourglass, ShieldBan } from "lucide-react";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { ToastStack } from "@/components/ui-kit";
import { Features, Hero, HowItWorks, ShopSection } from "@/components/home";
import { CheckoutView } from "@/components/checkout";
import { AccountView, LoginView, OrdersView } from "@/components/views";
import { AdminView } from "@/components/admin";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useThemeEffect, useMounted } from "@/lib/store";
import { useHashRoute } from "@/lib/router";
import { ensureSeed } from "@/lib/rtdb";
import { GlassCard } from "@/components/ui-kit";

/* animated cyberpunk backdrop */
function Backdrop() {
  return (
    <div className="bg-scene" aria-hidden="true">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />
    </div>
  );
}

/* ---------------- account approval gate ---------------- */

function AccountGate({ kind }: { kind: "pending" | "suspended" }) {
  const { t } = useI18n();
  const { signOutUser } = useAuth();
  const pending = kind === "pending";
  return (
    <motion.main
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16 pt-28"
    >
      <GlassCard strong className="max-w-md p-8 text-center">
        <motion.div
          animate={pending ? { rotate: [0, 8, -8, 0] } : { scale: [1, 1.06, 1] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: pending
              ? "color-mix(in oklab, #f59e0b 16%, transparent)"
              : "color-mix(in oklab, #ef4444 14%, transparent)",
          }}
        >
          {pending ? (
            <Hourglass size={26} className="text-amber-400" />
          ) : (
            <ShieldBan size={26} className="text-red-400" />
          )}
        </motion.div>
        <h1 className="text-xl font-extrabold">
          {pending ? t("gate.pendingTitle") : t("gate.suspendedTitle")}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {pending ? t("gate.pendingMsg") : t("gate.suspendedMsg")}
        </p>
        <button
          onClick={() => void signOutUser()}
          className="glass glass-hover mx-auto mt-6 rounded-xl px-5 py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("nav.logout")}
        </button>
      </GlassCard>
    </motion.main>
  );
}

function ViewSwitch() {
  const route = useHashRoute();
  const path = route.path;
  const { user } = useAuth();

  /* approval gate: signed-up users must be admin-approved before browsing */
  const gateKind =
    user && user.provider !== "guest"
      ? user.status === "pending"
        ? ("pending" as const)
        : user.status === "suspended"
          ? ("suspended" as const)
          : null
      : null;

  if (gateKind) {
    return <AccountGate key={gateKind} kind={gateKind} />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.main
        key={path || "home"}
        initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex-1"
      >
        {path === "checkout" ? (
          <CheckoutView />
        ) : path === "orders" || path === "track" ? (
          <OrdersView />
        ) : path === "account" ? (
          <AccountView />
        ) : path === "login" ? (
          <LoginView />
        ) : path === "original" ? (
          <AdminView />
        ) : (
          <>
            <Hero />
            <ShopSection />
            <Features />
            <HowItWorks />
          </>
        )}
      </motion.main>
    </AnimatePresence>
  );
}

function AppRoot() {
  useThemeEffect();
  const mounted = useMounted();

  useEffect(() => {
    void ensureSeed();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Backdrop />
      {mounted ? (
        <>
          <Navbar />
          <ViewSwitch />
          <Footer />
          <ChatWidget />
        </>
      ) : (
        <div className="flex min-h-screen items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <span className="animate-spin-slow text-3xl font-extrabold text-gradient font-[family-name:var(--f-display)]">
              EZFAME
            </span>
            <span className="text-xs uppercase tracking-[0.4em] text-muted-foreground">loading</span>
          </motion.div>
        </div>
      )}
      <ToastStack />
    </div>
  );
}

export default function Page() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppRoot />
      </AuthProvider>
    </I18nProvider>
  );
}
