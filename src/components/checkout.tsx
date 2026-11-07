"use client";

/* ============================================================
 * EzfaNep — checkout: payment methods, QR rendering,
 * transaction submission & order creation.
 * ============================================================ */

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CheckCircle2,
  Copy,
  Image as ImageIcon,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PlatformIcon, PayGlyph } from "@/components/icons";
import {
  EmptyState,
  Field,
  GlassCard,
  Modal,
  AccentButton,
  QRImage,
  SafeImage,
  SectionTitle,
  TextArea,
  TextInput,
} from "@/components/ui-kit";
import { Tx, useI18n } from "@/lib/i18n";
import { useCatalog, useSettings } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { useDraft, useToasts, useUI } from "@/lib/store";
import { navigate } from "@/lib/router";
import { addLocalOrder } from "@/lib/localOrders";
import { createOrder } from "@/lib/data";
import {
  cn,
  convertUSD,
  copyText,
  fileToCompressedDataUrl,
  findPackage,
  fmtNPR,
  fmtUSD,
  genOrderId,
} from "@/lib/utils";
import type { Order, OrderItem, PaymentMethod } from "@/lib/types";

function CopyRow({
  label,
  value,
  mono = true,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const { t } = useI18n();
  const { push } = useToasts();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/40 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={cn("truncate text-sm font-semibold", mono && "font-mono")}>{value}</p>
      </div>
      <button
        onClick={async () => {
          const ok = await copyText(value);
          if (ok) {
            setCopied(true);
            push("success", t("checkout.copied"), value.slice(0, 42));
            setTimeout(() => setCopied(false), 1600);
          }
        }}
        aria-label={`${t("checkout.copy")} ${label}`}
        className={cn(
          "glass flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
          copied && "text-emerald-400",
        )}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export function CheckoutView() {
  const { t } = useI18n();
  const { platforms } = useCatalog();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { currency } = useUI();
  const draft = useDraft();
  const { push } = useToasts();

  const [contact, setContact] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("esewa");
  const [walletIdx, setWalletIdx] = useState(0);
  const [txId, setTxId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptPreview, setReceiptPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Order | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const rate = settings.exchangeRate;

  const built = useMemo(() => {
    const platform = platforms.find((p) => p.id === draft.platformId);
    const service = platform?.services.find((s) => s.id === draft.typeId);
    if (!platform || !service) return null;
    const pk = service.packages?.length ? findPackage(service, draft.packageId) : null;
    const usd = pk ? pk.priceUSD : Math.round((((draft.quantity ?? 0) / 1000) * (service.pricePerKUSD ?? 0)) * 100) / 100;
    const item: OrderItem = {
      platformId: platform.id,
      platformName: platform.name,
      serviceId: service.id,
      serviceName: service.name,
      packageName: pk?.label,
      quantity: pk ? pk.qty : draft.quantity ?? undefined,
      unit: platform.unit,
      link: platform.kind === "game" ? `UID: ${draft.playerId}` : draft.link || undefined,
      priceUSD: usd,
      priceNPR: convertUSD(usd, rate),
    };
    return { platform, service, pk, item };
  }, [platforms, draft, rate]);

  const methods: Array<{ id: PaymentMethod; label: string; enabled: boolean }> = [
    { id: "esewa", label: "eSewa", enabled: settings.payments.esewa.enabled },
    { id: "khalti", label: "Khalti", enabled: settings.payments.khalti.enabled },
    { id: "bank", label: t("checkout.accountNumber") + " · Bank", enabled: settings.payments.bank.enabled },
    { id: "crypto", label: "Crypto", enabled: settings.payments.crypto.enabled },
  ];
  const activeMethods = methods.filter((m) => m.enabled);
  const activeMethod = activeMethods.some((m) => m.id === method) ? method : activeMethods[0]?.id;

  /* ---------- success screen ---------- */
  if (done) {
    return (
      <section className="mx-auto max-w-2xl px-4 pb-20 pt-28 sm:pt-32">
        <GlassCard className="p-8 text-center" strong>
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "color-mix(in oklab, var(--ok) 15%, transparent)" }}
          >
            <CheckCircle2 size={44} className="text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-extrabold">{t("checkout.success")}</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("checkout.successMsg")}</p>

          <button
            onClick={async () => {
              const ok = await copyText(done.id);
              if (ok) push("success", t("checkout.orderIdCopy"), done.id);
            }}
            className="glass mx-auto mt-6 flex items-center gap-2 rounded-xl px-5 py-3 font-mono text-lg font-extrabold tracking-widest text-acc-1 transition-transform hover:scale-[1.03]"
          >
            {done.id}
            <Copy size={15} />
          </button>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <AccentButton onClick={() => navigate("/orders")}>{t("checkout.viewOrders")}</AccentButton>
            <AccentButton variant="ghost" onClick={() => navigate("/")}>
              {t("checkout.back")}
            </AccentButton>
          </div>
        </GlassCard>
      </section>
    );
  }

  /* ---------- empty cart ---------- */
  if (!built) {
    return (
      <section className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:pt-32">
        <EmptyState
          icon={<Wallet size={26} />}
          title={t("checkout.empty")}
          action={
            <AccentButton onClick={() => navigate("/")}>
              <ArrowLeft size={15} />
              {t("checkout.back")}
            </AccentButton>
          }
        />
      </section>
    );
  }

  const { platform, service, pk, item } = built;
  const totalUSD = item.priceUSD;
  const totalNPR = item.priceNPR;
  const wallet = settings.payments.crypto.wallets[walletIdx] ?? settings.payments.crypto.wallets[0];

  const payAmount = activeMethod === "crypto" ? fmtUSD(totalUSD) : fmtNPR(totalNPR);

  const submit = async () => {
    if (!txId.trim() && !receiptUrl.trim() && !receiptPreview) {
      push("error", t("checkout.needTx"));
      return;
    }
    setSubmitting(true);
    try {
      const now = Date.now();
      const order: Order = {
        id: genOrderId(),
        createdAt: now,
        updatedAt: now,
        userId: user?.uid ?? `guest_${now.toString(36)}`,
        userName: user?.name ?? (contact.trim() || "Guest"),
        userEmail: user?.email,
        guest: !user,
        contact: contact.trim() || undefined,
        items: [item],
        totalUSD,
        totalNPR,
        currencyUsed: activeMethod === "crypto" ? "USD" : "NPR",
        payment: {
          method: activeMethod ?? "esewa",
          network: activeMethod === "crypto" ? wallet?.network : undefined,
          txId: txId.trim() || undefined,
          receiptUrl: receiptUrl.trim() || receiptPreview || undefined,
          submittedAt: now,
        },
        status: "pending",
      };
      addLocalOrder(order);
      const synced = await createOrder(order);
      setDone(order);
      draft.clearDraft();
      push(
        "success",
        t("checkout.success"),
        synced ? `${order.id}` : `${order.id} — saved offline, will sync`,
      );
    } catch {
      push("error", t("auth.errDefault"));
    } finally {
      setSubmitting(false);
    }
  };

  const channel =
    activeMethod === "esewa"
      ? settings.payments.esewa
      : activeMethod === "khalti"
        ? settings.payments.khalti
        : activeMethod === "bank"
          ? settings.payments.bank
          : null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pt-28">
      <SectionTitle eyebrow="SECURE PAYMENT" title={t("checkout.title")} />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* summary */}
        <div className="space-y-4">
          <GlassCard className="p-5" hover>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <Wallet size={15} />
              {t("checkout.summary")}
            </h3>

            <div className="flex items-start gap-3">
              <span className="glass flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ color: platform.color }}>
                <PlatformIcon id={platform.id} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  <Tx text={service.name} />
                </p>
                <p className="text-xs text-muted-foreground">{platform.name}</p>
                <p className="mt-1 font-mono text-xs text-acc-1">
                  {pk ? pk.label : `${(item.quantity ?? 0).toLocaleString()} ${platform.unit}`}
                </p>
              </div>
            </div>

            {item.link ? (
              <p className="mt-3 truncate rounded-lg bg-muted/50 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                {item.link}
              </p>
            ) : null}

            <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>1 × service</span>
                <span className="font-mono">{fmtUSD(totalUSD)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>= NPR @{rate.toFixed(2)}</span>
                <span className="font-mono">{fmtNPR(totalNPR)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 text-base font-extrabold">
                <span>{t("checkout.total")}</span>
                <span className="font-[family-name:var(--f-display)] text-gradient">
                  {currency === "NPR" ? fmtNPR(totalNPR) : fmtUSD(totalUSD)}
                </span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <Field label={t("checkout.contact")}>
              <TextInput
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={t("checkout.contactPh")}
              />
            </Field>
          </GlassCard>
        </div>

        {/* payment */}
        <div className="space-y-4">
          <GlassCard className="p-5 sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <BadgeCheck size={15} />
              {t("checkout.payMethod")}
            </h3>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {activeMethods.map((m) => {
                const isActive = m.id === activeMethod;
                return (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all duration-300",
                      isActive ? "pill-active bg-accent" : "border-border/70 hover:border-acc-1/35",
                    )}
                    aria-pressed={isActive}
                  >
                    <PayGlyph method={m.id === "bank" ? "bank" : m.id} size={m.id === "esewa" || m.id === "khalti" ? 30 : 20} className={cn(m.id === "crypto" || m.id === "bank" ? "text-acc-1" : "")} />
                    <span className="text-xs font-bold">{m.label}</span>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeMethod}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28 }}
                className="mt-6"
              >
                {activeMethod === "crypto" && wallet ? (
                  <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {settings.payments.crypto.wallets.map((w, i) => (
                          <button
                            key={w.id}
                            onClick={() => setWalletIdx(i)}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
                              i === walletIdx ? "border-acc-1/60 bg-accent text-accent-foreground" : "border-border/70 text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {w.network}
                          </button>
                        ))}
                      </div>
                      <CopyRow label={`${t("checkout.wallet")} — ${wallet.network}`} value={wallet.address} />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {settings.payments.crypto.instructions}
                      </p>
                    </div>
                    <div className="justify-self-center sm:justify-self-end">
                      <QRImage value={wallet.address} caption={`${t("checkout.scan")} — ${wallet.network}`} size={170} />
                    </div>
                  </div>
                ) : null}

                {channel && activeMethod !== "crypto" ? (
                  <div className="grid gap-4 sm:grid-cols-[1fr_170px]">
                    <div className="space-y-3">
                      {channel.accountName ? (
                        <CopyRow label={t("checkout.accountName")} value={channel.accountName} mono={false} />
                      ) : null}
                      {channel.accountNumber ? (
                        <CopyRow label={t("checkout.accountNumber")} value={channel.accountNumber} />
                      ) : null}
                      {channel.instructions ? (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          <Tx text={channel.instructions} />
                        </p>
                      ) : null}
                    </div>
                    <div className="justify-self-center sm:justify-self-end">
                      {channel.qrUrl ? (
                        <div className="space-y-1 text-center">
                          <SafeImage
                            src={channel.qrUrl}
                            alt={`${channel.accountName ?? "payment"} QR`}
                            className="h-[170px] w-[170px] rounded-xl border border-border bg-white p-1.5"
                          />
                          <span className="text-[11px] text-muted-foreground">{t("checkout.scan")}</span>
                        </div>
                      ) : channel.accountNumber ? (
                        <QRImage value={channel.accountNumber} caption={t("checkout.scan")} size={170} />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs font-semibold text-amber-500">
                  {t("checkout.payFirst")} — {payAmount}
                </div>
              </motion.div>
            </AnimatePresence>
          </GlassCard>

          {/* submit form */}
          <GlassCard className="p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`${t("checkout.txId")} *`}>
                <TextInput value={txId} onChange={(e) => setTxId(e.target.value)} placeholder={t("checkout.txPh")} />
              </Field>
              <Field label={`${t("checkout.receipt")} (${t("common.optional")})`}>
                <TextInput value={receiptUrl} onChange={(e) => setReceiptUrl(e.target.value)} placeholder="https://…" />
              </Field>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="glass flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors hover:border-acc-1/40">
                <ImageIcon size={14} className="text-acc-1" />
                {t("checkout.upload")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const dataUrl = await fileToCompressedDataUrl(f);
                      setReceiptPreview(dataUrl);
                      push("success", t("checkout.upload"), "✓");
                    } catch {
                      push("error", "Image could not be read");
                    }
                  }}
                />
              </label>
              {receiptPreview ? (
                <button onClick={() => setReceiptOpen(true)} className="relative h-14 w-14 overflow-hidden rounded-lg border border-border">
                  <img src={receiptPreview} alt="Receipt preview" className="h-full w-full object-cover" />
                </button>
              ) : null}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={13} />
                {t("checkout.back")}
              </button>
              <AccentButton size="lg" onClick={submit} disabled={submitting}>
                {submitting ? (
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }} className="flex">
                    <CheckCircle2 size={16} />
                  </motion.span>
                ) : (
                  <BadgeCheck size={16} />
                )}
                {submitting ? t("checkout.submitting") : t("checkout.submit")}
              </AccentButton>
            </div>
          </GlassCard>
        </div>
      </div>

      <Modal open={receiptOpen} onClose={() => setReceiptOpen(false)} title={t("checkout.upload")}>
        <img src={receiptPreview} alt="Receipt" className="w-full rounded-xl" />
      </Modal>
    </section>
  );
}
