"use client";

/* ============================================================
 * CipherSMM — SPA root.
 * One Next.js route ("/") hosts the entire hash-routed app:
 *   #/            home + shop
 *   #/checkout    payment & order submission
 *   #/orders      order tracking
 *   #/account     profile & preferences
 *   #/login       multi-provider auth
 *   #/original    hidden admin control center
 * ============================================================ */

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { ToastStack } from "@/components/ui-kit";
import { Features, Hero, HowItWorks, ShopSection } from "@/components/home";
import { CheckoutView } from "@/components/checkout";
import { AccountView, LoginView, OrdersView } from "@/components/views";
import { AdminView } from "@/components/admin";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth";
import { useThemeEffect, useMounted } from "@/lib/store";
import { useHashRoute } from "@/lib/router";
import { ensureSeed } from "@/lib/rtdb";

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

function ViewSwitch() {
  const route = useHashRoute();
  const path = route.path;

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
              CIPHER
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
