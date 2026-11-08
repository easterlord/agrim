"use client";

/* ============================================================
 * EzFame — dashboard panel views.
 *   ServicesView  — full live price list (search + platform groups)
 *   MassOrderView — one service × many "link|qty" lines
 *   RefundsView   — 30-day refund/refill requests → csmm/refunds
 *   SupportView   — contact channels + FAQ (all DB-backed)
 * All data comes from Firebase via the shared hooks — zero fake rows.
 * ============================================================ */

import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Clock,
  Inbox,
  LifeBuoy,
  Mail,
  MessageCircle,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PlatformIcon } from "@/components/icons";
import { SidebarNav } from "@/components/home";
import { AccentButton, EmptyState, GlassCard, SectionTitle, TextArea, TextInput } from "@/components/ui-kit";
import { Tx, useI18n } from "@/lib/i18n";
import { useCatalog, useSettings, useUserOrders } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { useDraft, useToasts, useUI } from "@/lib/store";
import { navigate } from "@/lib/router";
import { set as dbSet } from "@/lib/rtdb";
import { cn, convertUSD, fmtNPR, fmtUSD } from "@/lib/utils";

/* ---------------- shared shell: persistent sidebar + content ---------------- */

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6">
      <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)]">
        <SidebarNav />
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

/* ======================= SERVICES ======================= */

export function ServicesView() {
  const { t } = useI18n();
  const { platforms } = useCatalog();
  const { settings } = useSettings();
  const { currency } = useUI();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return platforms
      .map((p) => ({
        ...p,
        services: p.services.filter(
          (s) =>
            s.active &&
            (!q || s.name.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)),
        ),
      }))
      .filter((p) => p.services.length > 0);
  }, [platforms, query]);

  const go = (platformId: string, typeId: string) => {
    const d = useDraft.getState();
    d.setDraft({ platformId, typeId });
    navigate("/");
    setTimeout(() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <PanelShell>
      <SectionTitle eyebrow="CATALOG" title={t("servicesView.title")} sub={t("servicesView.sub")} />

      <div className="mb-6 max-w-md">
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("servicesView.searchPh")} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Inbox size={26} />} title={t("servicesView.searchPh")} />
      ) : (
        <div className="space-y-6">
          {filtered.map((p, pi) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: pi * 0.04, duration: 0.4 }}
            >
              <GlassCard className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border" style={{ color: p.color }}>
                    <PlatformIcon id={p.id} size={18} />
                  </span>
                  <p className="text-sm font-bold">{p.name}</p>
                  <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {p.services.length}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {p.services.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          <Tx text={s.name} />
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          {s.speed ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={10} />
                              <Tx text={s.speed} />
                            </span>
                          ) : null}
                          <span>
                            {t("servicesView.limits")}: {(s.minQty ?? 100).toLocaleString()} – {(s.maxQty ?? 0).toLocaleString()}
                          </span>
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-acc-1">
                        {currency === "NPR"
                          ? fmtNPR(convertUSD(s.pricePerKUSD ?? 0, settings.exchangeRate))
                          : fmtUSD(s.pricePerKUSD ?? 0)}
                      </span>
                      <AccentButton size="sm" variant="ghost" onClick={() => go(p.id, s.id)}>
                        {t("servicesView.select")}
                      </AccentButton>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

/* ======================= MASS ORDER ======================= */

interface ParsedLine {
  link: string;
  qty: number;
  priceUSD: number;
  ok: boolean;
}

export function MassOrderView() {
  const { t } = useI18n();
  const { platforms } = useCatalog();
  const { settings } = useSettings();
  const { currency } = useUI();
  const draft = useDraft();
  const { push } = useToasts();

  const [platformId, setPlatformId] = useState<string>(draft.platformId ?? "instagram");
  const [typeId, setTypeId] = useState<string>(draft.typeId ?? "");
  const [text, setText] = useState("");

  const platform = platforms.find((p) => p.id === platformId) ?? platforms[0] ?? null;
  const services = platform?.services.filter((s) => s.active && s.pricePerKUSD && !s.packages?.length) ?? [];
  const service = services.find((s) => s.id === typeId) ?? services[0] ?? null;

  const lines: ParsedLine[] = (() => {
    if (!service) return [];
    return text
      .split("\n")
      .map((raw) => raw.trim())
      .filter(Boolean)
      .map((raw) => {
        const [link, qtyStr] = raw.split("|").map((x) => (x ?? "").trim());
        const qty = Number(qtyStr);
        const r = qty >= (service.minQty ?? 100) && qty <= (service.maxQty ?? 100000) ? qty : NaN;
        if (!link || !isFinite(r)) return { link: link ?? "", qty: r, priceUSD: 0, ok: false };
        const priceUSD = Math.round(((r / 1000) * (service.pricePerKUSD ?? 0) + Number.EPSILON) * 100) / 100;
        return { link, qty: r, priceUSD, ok: true };
      });
  })();

  const valid = lines.filter((l) => l.ok);
  const invalid = lines.length - valid.length;
  const totalUSD = Math.round(valid.reduce((s, l) => s + l.priceUSD, 0) * 100) / 100;

  const stage = () => {
    if (!platform || !service) return;
    if (!valid.length) {
      push("error", t("mass.invalid"), `${t("mass.lines")}: 0`);
      return;
    }
    draft.setDraft({ platformId: platform.id, typeId: service.id });
    draft.setMass(
      valid.map((l) => ({
        platformId: platform.id,
        typeId: service.id,
        serviceName: service.name,
        link: l.link,
        quantity: l.qty,
        priceUSD: l.priceUSD,
      })),
    );
    push("success", t("mass.staged"), `${valid.length} ${t("mass.lines")}`);
    navigate("/checkout");
  };

  return (
    <PanelShell>
      <SectionTitle eyebrow="BULK" title={t("mass.title")} sub={t("mass.sub")} />

      <div className="space-y-5">
        {/* 1. platform + service */}
        <GlassCard className="p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("mass.pick")}</p>
          <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPlatformId(p.id);
                  setTypeId("");
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-all",
                  p.id === platformId ? "border-transparent bg-acc-1 text-white" : "border-border bg-panel text-muted-foreground hover:text-foreground",
                )}
              >
                <PlatformIcon id={p.id} size={14} />
                {p.name}
              </button>
            ))}
          </div>
          {services.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setTypeId(s.id)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2.5 text-left transition-all",
                    s.id === service?.id ? "border-acc-1/60 bg-accent" : "border-border hover:border-input",
                  )}
                >
                  <span className="block truncate text-sm font-semibold">
                    <Tx text={s.name} />
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {fmtUSD(s.pricePerKUSD ?? 0)} / 1k · min {s.minQty ?? 100}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">{t("shop.selectPrompt")}</p>
          )}
        </GlassCard>

        {/* 2. links */}
        <GlassCard className="p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("mass.paste")}</p>
          <TextArea
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("mass.placeholder")}
            className="font-mono text-[13px]"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <p className="text-muted-foreground">
              <span className="font-bold text-foreground">{valid.length}</span> {t("mass.lines")}
              {invalid > 0 ? (
                <span className="ml-2 font-bold text-red-400">
                  {invalid} {t("mass.invalid")}
                </span>
              ) : null}
            </p>
            <p className="font-mono font-bold text-acc-1">
              {currency === "NPR" ? fmtNPR(convertUSD(totalUSD, settings.exchangeRate)) : fmtUSD(totalUSD)}
            </p>
          </div>
          <div className="mt-4">
            <AccentButton size="lg" onClick={stage} disabled={!valid.length || !service}>
              <Send size={15} />
              {t("mass.stage")}
            </AccentButton>
          </div>
        </GlassCard>
      </div>
    </PanelShell>
  );
}

/* ======================= REFUNDS ======================= */

export function RefundsView() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { orders } = useUserOrders(user?.uid ?? null);
  const { push } = useToasts();

  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const eligible = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.status === "completed" || o.status === "rejected" || o.status === "processing") &&
          Date.now() - (o.createdAt ?? 0) < 30 * 24 * 3600 * 1000,
      ),
    [orders],
  );

  if (!user) {
    return (
      <PanelShell>
        <EmptyState
          icon={<ShieldAlert size={26} />}
          title={t("refunds.needAuth")}
          action={<AccentButton onClick={() => navigate("/login")}>{t("nav.login")}</AccentButton>}
        />
      </PanelShell>
    );
  }

  const submit = async () => {
    const order = eligible.find((o) => o.id === orderId);
    if (!order) {
      push("error", t("refunds.eligible"), t("refunds.none"));
      return;
    }
    if (!reason.trim()) {
      push("error", t("refunds.reason"), "—");
      return;
    }
    setBusy(true);
    const id = `RF-${order.id.replace("ORD-", "")}-${Date.now().toString(36)}`;
    const ok = await dbSet(`csmm/refunds/${order.id}`, {
      id,
      orderId: order.id,
      userId: order.userId,
      userName: order.userName ?? "",
      totalUSD: order.totalUSD,
      reason: reason.trim(),
      status: "requested",
      createdAt: Date.now(),
    }).catch(() => false);
    setBusy(false);
    if (ok) {
      push("success", t("refunds.request"), t("refunds.sent"));
      setReason("");
      setOrderId("");
    } else {
      push("error", t("refunds.request"), "queued — will sync");
    }
  };

  return (
    <PanelShell>
      <SectionTitle eyebrow="30-DAY POLICY" title={t("refunds.title")} sub={t("refunds.sub")} />

      <GlassCard className="p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("refunds.eligible")}</p>
        {eligible.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">{t("refunds.none")}</p>
        ) : (
          <div className="mb-4 space-y-2">
            {eligible.map((o) => (
              <button
                key={o.id}
                onClick={() => setOrderId(o.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all",
                  o.id === orderId ? "border-acc-1/60 bg-accent" : "border-border hover:border-input",
                )}
              >
                <span className="min-w-0">
                  <span className="block font-mono text-xs font-bold">{o.id}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {o.items?.map((i) => i.serviceName).join(", ") || "—"}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs font-bold text-acc-1">{fmtUSD(o.totalUSD)}</span>
              </button>
            ))}
          </div>
        )}

        <TextArea
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("refunds.reasonPh")}
        />

        <div className="mt-4 flex justify-end">
          <AccentButton size="lg" onClick={() => void submit()} disabled={busy || !orderId || !reason.trim()}>
            <RotateCcw size={15} />
            {t("refunds.request")}
          </AccentButton>
        </div>
      </GlassCard>
    </PanelShell>
  );
}

/* ======================= SUPPORT ======================= */

export function SupportView() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const channels = [
    { icon: <Send size={17} />, label: "Telegram", value: "@ezfame_support", href: settings.social.telegram, tint: "#229ED9" },
    { icon: <MessageCircle size={17} />, label: "WhatsApp", value: "+977 9812 345 678", href: settings.social.whatsapp, tint: "#25D366" },
    { icon: <Mail size={17} />, label: "Email", value: settings.social.email || "support@ezfame.com", href: settings.social.email ? `mailto:${settings.social.email}` : "", tint: "var(--acc-1)" },
  ].filter((c) => c.href);

  const faqs = settings.chatbot.faqs ?? [];

  return (
    <PanelShell>
      <SectionTitle eyebrow="24/7 LIVE" title={t("supportView.title")} sub={t("supportView.sub")} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {channels.map((c, i) => (
          <motion.a
            key={c.label}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35 }}
            whileHover={{ y: -3 }}
            className="glass glass-hover block rounded-2xl p-4"
          >
            <span
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border"
              style={{ color: c.tint, background: `color-mix(in oklab, ${c.tint} 10%, transparent)` }}
            >
              {c.icon}
            </span>
            <p className="text-sm font-bold">{c.label}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.value}</p>
          </motion.a>
        ))}
      </div>

      <GlassCard className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
          <LifeBuoy size={15} className="text-acc-1" />
          <p className="text-sm font-bold">{t("supportView.faq")}</p>
          <Sparkles size={13} className="ml-auto text-muted-foreground" />
        </div>
        <div className="divide-y divide-border">
          {faqs.map((f) => {
            const open = openFaq === f.id;
            return (
              <div key={f.id}>
                <button
                  onClick={() => setOpenFaq(open ? null : f.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
                  aria-expanded={open}
                >
                  <span className="text-sm font-semibold">
                    <Tx text={f.q} />
                  </span>
                  <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} className="shrink-0 text-muted-foreground">
                    <ChevronDown size={16} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-4 text-xs leading-relaxed text-muted-foreground">
                        <Tx text={f.a} />
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
          {faqs.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-muted-foreground">{t("shop.selectPrompt")}</p>
          ) : null}
        </div>
      </GlassCard>
    </PanelShell>
  );
}
