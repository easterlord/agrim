"use client";

/* ============================================================
 * EzFameNp — hidden admin control center at #/original
 * (also reachable via /original or ?p=/original).
 * Protected by username + password (default: ramesh / agrim) or admin role.
 * ============================================================ */

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeDollarSign,
  Bot,
  Clock,
  Coins,
  Download,
  Image as ImageIcon,
  KeyRound,
  Link2,
  Lock,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PlatformIcon } from "@/components/icons";
import {
  Field,
  GlassCard,
  Modal,
  AccentButton,
  QRImage,
  SafeImage,
  SectionTitle,
  Segmented,
  StatusBadge,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/ui-kit";
import { useI18n } from "@/lib/i18n";
import { useAuth, elevateLocalAdmin } from "@/lib/auth";
import {
  deleteServiceType,
  savePlatform,
  saveSettingsPatch,
  saveUserProfile,
  setOrderStatus,
  useAllOrders,
  useCatalog,
  useSettings,
  useUsers,
} from "@/lib/data";
import { useToasts } from "@/lib/store";
import { exportLocalData, resetLocalData, saveFirebaseConfigOverride, getFirebaseConfig } from "@/lib/rtdb";
import { DEFAULT_ADMIN_PASS_HASH, DEFAULT_ADMIN_USER_HASH, DEFAULT_CATALOG, DEFAULT_SETTINGS } from "@/lib/defaults";
import { set as dbSet } from "@/lib/rtdb";
import { fileToCompressedDataUrl, sha256Hex, cn, fmtDateTime, fmtNPR, fmtUSD, genId } from "@/lib/utils";
import type { FaqEntry, LocalPaymentChannel, Order, OrderStatus, Platform, QuickAction, ServiceType, Settings } from "@/lib/types";

const LS_ADMIN_OK = "ezfamenp:adminok";

type Tab = "dashboard" | "orders" | "services" | "payments" | "chatbot" | "links" | "users" | "settings";

/* ============================== GATE ============================== */

function Gate({ onPass }: { onPass: () => void }) {
  const { t } = useI18n();
  const { settings } = useSettings();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) return;
    setBusy(true);
    const [userHash, passHash] = await Promise.all([
      sha256Hex(username.trim().toLowerCase()),
      sha256Hex(password),
    ]);
    const ok =
      userHash === (settings.adminUserHash || DEFAULT_ADMIN_USER_HASH) &&
      passHash === (settings.adminPassHash || DEFAULT_ADMIN_PASS_HASH);
    setBusy(false);
    if (ok) {
      try {
        sessionStorage.setItem(LS_ADMIN_OK, "1");
      } catch {
        /* ignore */
      }
      elevateLocalAdmin();
      onPass();
    } else {
      setWrong(true);
      setTimeout(() => setWrong(false), 2200);
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 pt-24">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        <GlassCard strong className="p-8 text-center">
          <motion.div
            animate={wrong ? { x: [0, -10, 10, -6, 6, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--acc-1) 22%, transparent), color-mix(in oklab, var(--acc-2) 22%, transparent))" }}
          >
            <Lock size={26} className={cn(wrong ? "text-red-400" : "text-acc-1")} />
          </motion.div>
          <h1 className="text-xl font-extrabold">{t("admin.gate")}</h1>
          <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">{t("admin.gateSub")}</p>

          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <TextInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("admin.username")}
              className={cn("text-center font-semibold", wrong && "!border-red-500")}
              autoFocus
              autoComplete="username"
            />
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("admin.password")}
              className={cn("text-center font-mono tracking-[0.3em]", wrong && "!border-red-500")}
              autoComplete="current-password"
            />
            {wrong ? <p className="text-xs font-bold text-red-400">{t("admin.wrong")}</p> : null}
            <AccentButton type="submit" className="w-full" size="lg" disabled={busy}>
              <KeyRound size={16} />
              {t("admin.enter")}
            </AccentButton>
          </form>
        </GlassCard>
      </motion.div>
    </section>
  );
}

/* ============================== small editors ============================== */

function SaveBtn({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  const { t } = useI18n();
  return (
    <AccentButton onClick={onClick} disabled={busy} size="sm">
      <Save size={13} />
      {t("common.save")}
    </AccentButton>
  );
}

/* ============================== DASHBOARD ============================== */

function Dashboard({ orders }: { orders: Order[] }) {
  const { t } = useI18n();
  const rate = useSettings().settings.exchangeRate;

  const stats = useMemo(() => {
    const valid = orders.filter((o) => o.status !== "rejected" && o.status !== "cancelled");
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      processing: orders.filter((o) => o.status === "processing").length,
      completed: orders.filter((o) => o.status === "completed").length,
      revUSD: valid.reduce((s, o) => s + (o.totalUSD || 0), 0),
      revNPR: valid.reduce((s, o) => s + (o.totalNPR || 0), 0),
    };
  }, [orders]);

  const cards = [
    { label: t("admin.totalOrders"), value: String(stats.total), icon: <ShoppingBag size={16} />, tint: "var(--acc-1)" },
    { label: t("orders.pending"), value: String(stats.pending), icon: <Clock size={16} />, tint: "#f59e0b" },
    { label: t("orders.completed"), value: String(stats.completed), icon: <ShieldCheck size={16} />, tint: "var(--ok)" },
    { label: t("admin.revenue"), value: fmtUSD(stats.revUSD), icon: <Coins size={16} />, tint: "var(--acc-2)" },
    { label: "Revenue (NPR)", value: fmtNPR(stats.revNPR), icon: <BadgeDollarSign size={16} />, tint: "var(--acc-3)" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <GlassCard className="p-4" hover>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ color: c.tint, background: `color-mix(in oklab, ${c.tint} 13%, transparent)` }}>
                {c.icon}
              </span>
              <p className="mt-2.5 font-[family-name:var(--f-display)] text-xl font-extrabold">{c.value}</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{c.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <GlassCard className="p-5">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("orders.title")} — {t("common.new")}</h3>
        <div className="space-y-2">
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3.5 py-2.5 text-sm">
              <span className="font-mono font-bold text-acc-1">{o.id}</span>
              <span className="hidden truncate text-muted-foreground sm:block">
                {o.items?.[0]?.serviceName ?? "—"}
              </span>
              <span className="font-mono text-xs">{o.currencyUsed === "NPR" ? fmtNPR(o.totalNPR) : fmtUSD(o.totalUSD)}</span>
              <StatusBadge status={o.status} label={t(`orders.${o.status === "cancelled" ? "cancelled" : o.status}`)} />
            </div>
          ))}
          {orders.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">{t("orders.empty")}</p> : null}
        </div>
        <p className="mt-3 text-right text-[11px] text-muted-foreground">1 USD = {rate.toFixed(2)} NPR</p>
      </GlassCard>
    </div>
  );
}

/* ============================== ORDERS TAB ============================== */

function OrdersAdmin({ orders }: { orders: Order[] }) {
  const { t } = useI18n();
  const { push } = useToasts();
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const act = async (id: string, status: OrderStatus, adminNote?: string) => {
    const ok = await setOrderStatus(id, status, adminNote);
    push(ok ? "success" : "info", `${id} → ${status}`, ok ? "✓ synced" : "queued offline");
  };

  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Segmented
          value={filter}
          onChange={(v) => setFilter(v as "all" | OrderStatus)}
          options={[
            { value: "all", label: `All (${orders.length})` },
            { value: "pending", label: `⏳ ${orders.filter((o) => o.status === "pending").length}` },
            { value: "processing", label: `⚡ ${orders.filter((o) => o.status === "processing").length}` },
            { value: "completed", label: `✓ ${orders.filter((o) => o.status === "completed").length}` },
            { value: "rejected", label: `✕ ${orders.filter((o) => o.status === "rejected").length}` },
          ]}
        />
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {filtered.map((o) => (
            <motion.div key={o.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
              <GlassCard className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-extrabold text-acc-1">{o.id}</span>
                    <StatusBadge status={o.status} label={o.status} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{fmtDateTime(o.createdAt)}</span>
                </div>

                <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    <b className="text-foreground">{o.userName ?? "Guest"}</b>
                    {o.userEmail ? ` · ${o.userEmail}` : ""}
                    {o.contact ? ` · ${o.contact}` : ""}
                  </p>
                  <p className="sm:text-right">
                    {o.items?.[0] ? `${o.items[0].platformName} — ${o.items[0].serviceName}` : ""}
                    {o.items?.[0]?.packageName ? ` (${o.items[0].packageName})` : ""}
                  </p>
                  <p className="font-mono">
                    {o.payment.method}
                    {o.payment.network ? ` · ${o.payment.network}` : ""}
                    {o.payment.txId ? ` · Tx: ${o.payment.txId}` : ""}
                  </p>
                  <p className="font-mono sm:text-right">
                    {fmtUSD(o.totalUSD)} / {fmtNPR(o.totalNPR)}
                  </p>
                  {o.items?.[0]?.link ? <p className="font-mono sm:col-span-2">🎯 {o.items[0].link}</p> : null}
                </div>

                {o.payment.receiptUrl ? (
                  <div className="mt-2">
                    <SafeImage
                      src={o.payment.receiptUrl}
                      alt="receipt"
                      className="h-28 w-28 rounded-lg border border-border bg-white/80 p-1"
                    />
                  </div>
                ) : null}

                {o.adminNote ? (
                  <p className="mt-2 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                    {t("orders.adminNote")}: {o.adminNote}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  {o.status === "pending" ? (
                    <AccentButton size="sm" onClick={() => void act(o.id, "processing")}>
                      <ShieldCheck size={13} />
                      {t("admin.verify")}
                    </AccentButton>
                  ) : null}
                  {o.status === "processing" ? (
                    <AccentButton size="sm" onClick={() => void act(o.id, "completed")}>
                      ✓ {t("admin.complete")}
                    </AccentButton>
                  ) : null}
                  {o.status !== "rejected" && o.status !== "completed" ? (
                    <AccentButton
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setNote("");
                        setRejectId(o.id);
                      }}
                    >
                      <X size={13} />
                      {t("admin.reject")}
                    </AccentButton>
                  ) : null}
                  {o.status === "rejected" ? (
                    <AccentButton size="sm" variant="ghost" onClick={() => void act(o.id, "processing")}>
                      <RefreshCw size={13} />
                      Reopen
                    </AccentButton>
                  ) : null}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("orders.empty")}</p>
        ) : null}
      </div>

      <Modal open={!!rejectId} onClose={() => setRejectId(null)} title={t("admin.reject")}>
        <Field label={`${t("orders.adminNote")} (${t("common.optional")})`}>
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Wrong TxID / insufficient amount…" />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <AccentButton variant="ghost" size="sm" onClick={() => setRejectId(null)}>
            {t("common.cancel")}
          </AccentButton>
          <AccentButton
            variant="danger"
            size="sm"
            onClick={() => {
              if (rejectId) void act(rejectId, "rejected", note.trim() || undefined);
              setRejectId(null);
            }}
          >
            {t("admin.reject")}
          </AccentButton>
        </div>
      </Modal>
    </div>
  );
}

/* ============================== SERVICES TAB ============================== */

const emptyService = (): ServiceType => ({
  id: genId("svc"),
  name: "",
  kindLabel: "followers",
  pricePerKUSD: 1,
  minQty: 100,
  maxQty: 100000,
  stepQty: 50,
  speed: "0-1 h",
  active: true,
  packages: undefined,
});

function ServiceEditor({
  initial,
  platformKind,
  onSave,
  onClose,
}: {
  initial: ServiceType;
  platformKind: "social" | "game";
  onSave: (s: ServiceType) => void;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const [s, setS] = useState<ServiceType>(() => JSON.parse(JSON.stringify(initial)) as ServiceType);
  const [mode, setMode] = useState<"qty" | "pkg">(s.packages?.length ? "pkg" : "qty");
  const upd = (patch: Partial<ServiceType>) => setS((prev) => ({ ...prev, ...patch }));

  return (
    <div className="space-y-4">
      <Field label="Service name">
        <TextInput value={s.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Followers — Real HQ" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kind label">
          <TextInput value={s.kindLabel ?? ""} onChange={(e) => upd({ kindLabel: e.target.value })} placeholder="followers" />
        </Field>
        <Field label={t("shop.speed")}>
          <TextInput value={s.speed ?? ""} onChange={(e) => upd({ speed: e.target.value })} placeholder="0-1 h" />
        </Field>
      </div>

      <Segmented
        value={mode}
        onChange={(v) => {
          setMode(v as "qty" | "pkg");
          upd({ packages: v === "pkg" ? (s.packages?.length ? s.packages : [{ id: genId("pkg"), label: "100", qty: 100, priceUSD: 1 }]) : undefined });
        }}
        options={[
          { value: "qty", label: "Per 1,000 price" },
          { value: "pkg", label: "Packages" },
        ]}
      />

      {mode === "qty" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label={t("admin.pricePerK")}>
            <TextInput type="number" step="0.01" value={s.pricePerKUSD ?? 1} onChange={(e) => upd({ pricePerKUSD: Number(e.target.value) })} />
          </Field>
          <Field label={t("shop.min")}>
            <TextInput type="number" value={s.minQty ?? 100} onChange={(e) => upd({ minQty: Number(e.target.value) })} />
          </Field>
          <Field label={t("shop.max")}>
            <TextInput type="number" value={s.maxQty ?? 100000} onChange={(e) => upd({ maxQty: Number(e.target.value) })} />
          </Field>
          <Field label="Step">
            <TextInput type="number" value={s.stepQty ?? 50} onChange={(e) => upd({ stepQty: Number(e.target.value) })} />
          </Field>
        </div>
      ) : (
        <div className="space-y-2">
          {(s.packages ?? []).map((pk, i) => (
            <div key={pk.id} className="grid grid-cols-[1fr_80px_90px_32px] items-center gap-2">
              <TextInput
                value={pk.label}
                onChange={(e) => {
                  const pk2 = [...(s.packages ?? [])];
                  pk2[i] = { ...pk, label: e.target.value };
                  upd({ packages: pk2 });
                }}
                placeholder="325 UC"
              />
              <TextInput
                type="number"
                value={pk.qty ?? 0}
                onChange={(e) => {
                  const pk2 = [...(s.packages ?? [])];
                  pk2[i] = { ...pk, qty: Number(e.target.value) };
                  upd({ packages: pk2 });
                }}
              />
              <TextInput
                type="number"
                step="0.01"
                value={pk.priceUSD}
                onChange={(e) => {
                  const pk2 = [...(s.packages ?? [])];
                  pk2[i] = { ...pk, priceUSD: Number(e.target.value) };
                  upd({ packages: pk2 });
                }}
              />
              <button
                onClick={() => upd({ packages: (s.packages ?? []).filter((x) => x.id !== pk.id) })}
                aria-label={t("common.delete")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <AccentButton
            size="sm"
            variant="ghost"
            onClick={() => upd({ packages: [...(s.packages ?? []), { id: genId("pkg"), label: "", qty: 0, priceUSD: 0 }] })}
          >
            <Plus size={13} />
            {t("admin.addPackage")}
          </AccentButton>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("shop.warranty") + " (" + t("common.optional") + ")"}>
          <TextInput value={s.warranty ?? ""} onChange={(e) => upd({ warranty: e.target.value })} placeholder="30 days refill" />
        </Field>
        <div className="flex items-end gap-2 pb-1">
          <Toggle checked={s.active} onChange={(v) => upd({ active: v })} label={t("admin.active")} />
          <span className="text-xs font-semibold text-muted-foreground">{s.active ? t("admin.enabled") : t("admin.disabled")}</span>
        </div>
      </div>
      <Field label="Description">
        <TextArea value={s.description ?? ""} onChange={(e) => upd({ description: e.target.value })} />
      </Field>

      <div className="flex justify-end gap-2">
        <AccentButton variant="ghost" size="sm" onClick={onClose}>
          {t("common.cancel")}
        </AccentButton>
        <AccentButton
          size="sm"
          onClick={() => {
            if (!s.name.trim()) return;
            const payload: ServiceType =
              mode === "pkg"
                ? { ...s, packages: (s.packages ?? []).filter((p) => p.label.trim()) }
                : s;
            onSave(payload);
          }}
        >
          <Save size={13} />
          {lang === "en" ? "Save service" : t("common.save")}
        </AccentButton>
      </div>
      <p className="text-[10px] text-muted-foreground">Platform: {platformKind}</p>
    </div>
  );
}

function ServicesAdmin() {
  const { t } = useI18n();
  const { push } = useToasts();
  const { platforms } = useCatalog();
  const [selId, setSelId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [platformModal, setPlatformModal] = useState(false);
  const [np, setNp] = useState({ id: "", name: "", kind: "social" as "social" | "game", color: "#22d3ee", unit: "followers" });

  const sel = platforms.find((p) => p.id === selId) ?? platforms[0] ?? null;

  const persist = async (platform: Platform, msg: string) => {
    const ok = await savePlatform(platform);
    push(ok ? "success" : "info", msg, ok ? "✓ synced to cloud" : "saved locally, will sync");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <div className="space-y-2">
        <div className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelId(p.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all lg:w-full",
                sel?.id === p.id ? "pill-active bg-accent" : "border-border/70 hover:border-acc-1/35",
              )}
            >
              <PlatformIcon id={p.id} size={16} />
              <span className="truncate">{p.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{p.services.length}</span>
            </button>
          ))}
        </div>
        <AccentButton
          size="sm"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setNp({ id: "", name: "", kind: "social", color: "#22d3ee", unit: "followers" });
            setPlatformModal(true);
          }}
        >
          <Plus size={13} />
          Add platform
        </AccentButton>
      </div>

      <div className="space-y-3">
        {sel ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <PlatformIcon id={sel.id} size={18} />
                {sel.name}
              </h3>
              <AccentButton size="sm" onClick={() => setEditing(emptyService())}>
                <Plus size={13} />
                {t("admin.addService")}
              </AccentButton>
            </div>

            {sel.services.map((s) => (
              <GlassCard key={s.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.name || "(unnamed)"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {s.packages?.length
                      ? `${s.packages.length} packages · $${Math.min(...s.packages.map((x) => x.priceUSD))}+`
                      : `$${s.pricePerKUSD ?? 0} /1k · ${s.minQty}–${s.maxQty}`}
                    {s.speed ? ` · ${s.speed}` : ""}
                  </p>
                </div>
                <Toggle
                  checked={s.active}
                  onChange={(v) => {
                    void persist(
                      { ...sel, services: sel.services.map((x) => (x.id === s.id ? { ...x, active: v } : x)) },
                      `${s.name} ${v ? "enabled" : "disabled"}`,
                    );
                  }}
                />
                <AccentButton size="sm" variant="ghost" onClick={() => setEditing(s)}>
                  {t("common.edit")}
                </AccentButton>
                <button
                  onClick={() => {
                    if (confirm(t("admin.confirmDelete"))) {
                      void deleteServiceType(sel.id, s.id).then(() => push("success", "Deleted", s.name));
                    }
                  }}
                  aria-label={t("common.delete")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={15} />
                </button>
              </GlassCard>
            ))}
          </>
        ) : null}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={t("admin.addService")} wide>
        {editing && sel ? (
          <ServiceEditor
            initial={editing}
            platformKind={sel.kind}
            onClose={() => setEditing(null)}
            onSave={(svc) => {
              const exists = sel.services.some((x) => x.id === svc.id);
              void persist(
                {
                  ...sel,
                  services: exists ? sel.services.map((x) => (x.id === svc.id ? svc : x)) : [svc, ...sel.services],
                },
                exists ? "Service updated" : "Service added",
              );
              setEditing(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal open={platformModal} onClose={() => setPlatformModal(false)} title="Add platform">
        <div className="space-y-3">
          <Field label="Platform ID (unique)">
            <TextInput value={np.id} onChange={(e) => setNp({ ...np, id: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })} placeholder="threads" />
          </Field>
          <Field label="Name">
            <TextInput value={np.name} onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="Threads" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kind">
              <select
                value={np.kind}
                onChange={(e) => setNp({ ...np, kind: e.target.value as "social" | "game" })}
                className="field"
              >
                <option value="social">social</option>
                <option value="game">game</option>
              </select>
            </Field>
            <Field label="Unit">
              <TextInput value={np.unit} onChange={(e) => setNp({ ...np, unit: e.target.value })} placeholder="followers" />
            </Field>
          </div>
          <Field label="Brand color">
            <TextInput value={np.color} onChange={(e) => setNp({ ...np, color: e.target.value })} placeholder="#22d3ee" />
          </Field>
          <div className="flex justify-end gap-2">
            <AccentButton variant="ghost" size="sm" onClick={() => setPlatformModal(false)}>
              {t("common.cancel")}
            </AccentButton>
            <AccentButton
              size="sm"
              onClick={() => {
                if (!np.id || !np.name) return;
                void persist({ ...np, services: [] } as Platform, "Platform added");
                setSelId(np.id);
                setPlatformModal(false);
              }}
            >
              {t("common.add")}
            </AccentButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================== PAYMENTS TAB ============================== */

function ChannelEditor({
  name,
  ch,
  onChange,
}: {
  name: string;
  ch: LocalPaymentChannel;
  onChange: (c: LocalPaymentChannel) => void;
}) {
  const { t } = useI18n();
  const { push } = useToasts();
  return (
    <GlassCard className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-bold">
          <Wallet size={14} className="text-acc-1" />
          {name}
        </h4>
        <div className="flex items-center gap-2">
          <Toggle checked={ch.enabled} onChange={(v) => onChange({ ...ch, enabled: v })} />
          <span className="text-[11px] font-semibold text-muted-foreground">{ch.enabled ? t("admin.enabled") : t("admin.disabled")}</span>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("checkout.accountName")}>
          <TextInput value={ch.accountName ?? ""} onChange={(e) => onChange({ ...ch, accountName: e.target.value })} />
        </Field>
        <Field label={t("checkout.accountNumber")}>
          <TextInput value={ch.accountNumber ?? ""} onChange={(e) => onChange({ ...ch, accountNumber: e.target.value })} className="font-mono" />
        </Field>
      </div>
      <Field label={t("admin.qrUrl")}>
        <TextInput value={ch.qrUrl ?? ""} onChange={(e) => onChange({ ...ch, qrUrl: e.target.value })} placeholder="https://…/qr.png" />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <label className="glass flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold">
          <ImageIcon size={13} className="text-acc-1" />
          {t("admin.uploadQr")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const url = await fileToCompressedDataUrl(f, 520);
                onChange({ ...ch, qrUrl: url });
                push("success", t("admin.uploadQr"), "✓");
              } catch {
                push("error", "Image failed");
              }
            }}
          />
        </label>
        {ch.qrUrl ? (
          <SafeImage src={ch.qrUrl} alt="QR preview" className="h-24 w-24 rounded-xl border border-border bg-white p-1.5" />
        ) : null}
      </div>
      <Field label="Instructions">
        <TextArea value={ch.instructions ?? ""} onChange={(e) => onChange({ ...ch, instructions: e.target.value })} />
      </Field>
    </GlassCard>
  );
}

function PaymentsAdmin() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const { push } = useToasts();
  const [rate, setRate] = useState(String(settings.exchangeRate));
  const [crypto, setCrypto] = useState(settings.payments.crypto);
  const [esewa, setEsewa] = useState(settings.payments.esewa);
  const [khalti, setKhalti] = useState(settings.payments.khalti);
  const [bank, setBank] = useState(settings.payments.bank);

  const save = async () => {
    const ok = await saveSettingsPatch({
      exchangeRate: Math.max(1, Number(rate) || settings.exchangeRate),
      payments: { crypto, esewa, khalti, bank },
    });
    push(ok ? "success" : "info", t("admin.saved"), ok ? "✓ synced" : "queued offline");
  };

  return (
    <div className="space-y-4">
      <GlassCard className="flex flex-wrap items-end justify-between gap-4 p-5">
        <Field label={t("admin.rate")} className="w-56">
          <TextInput type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} className="font-mono" />
        </Field>
        <SaveBtn onClick={() => void save()} />
      </GlassCard>

      <GlassCard className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-bold">
            <Coins size={14} className="text-acc-2" />
            Crypto wallets
          </h4>
          <div className="flex items-center gap-2">
            <Toggle checked={crypto.enabled} onChange={(v) => setCrypto({ ...crypto, enabled: v })} />
            <span className="text-[11px] font-semibold text-muted-foreground">{crypto.enabled ? t("admin.enabled") : t("admin.disabled")}</span>
          </div>
        </div>
        {crypto.wallets.map((w, i) => (
          <div key={w.id} className="grid grid-cols-[130px_1fr_32px] items-center gap-2">
            <TextInput
              value={w.network}
              onChange={(e) => {
                const ws = [...crypto.wallets];
                ws[i] = { ...w, network: e.target.value };
                setCrypto({ ...crypto, wallets: ws });
              }}
              placeholder="USDT (TRC-20)"
            />
            <TextInput
              value={w.address}
              onChange={(e) => {
                const ws = [...crypto.wallets];
                ws[i] = { ...w, address: e.target.value };
                setCrypto({ ...crypto, wallets: ws });
              }}
              className="font-mono text-xs"
              placeholder="wallet address"
            />
            <button
              onClick={() => setCrypto({ ...crypto, wallets: crypto.wallets.filter((x) => x.id !== w.id) })}
              aria-label={t("common.delete")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AccentButton
            size="sm"
            variant="ghost"
            onClick={() => setCrypto({ ...crypto, wallets: [...crypto.wallets, { id: genId("w"), network: "", address: "" }] })}
          >
            <Plus size={13} />
            {t("admin.addWallet")}
          </AccentButton>
          <QRImage value={crypto.wallets[0]?.address ?? ""} size={90} caption="preview" />
        </div>
        <Field label="Crypto instructions">
          <TextArea value={crypto.instructions ?? ""} onChange={(e) => setCrypto({ ...crypto, instructions: e.target.value })} />
        </Field>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChannelEditor name="eSewa" ch={esewa} onChange={setEsewa} />
        <ChannelEditor name="Khalti" ch={khalti} onChange={setKhalti} />
        <ChannelEditor name="Bank Transfer" ch={bank} onChange={setBank} />
      </div>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <AccentButton onClick={() => void save()} size="lg">
          <Save size={15} />
          {t("common.save")} — Payments
        </AccentButton>
      </div>
    </div>
  );
}

/* ============================== CHATBOT TAB ============================== */

function ChatbotAdmin() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const { push } = useToasts();
  const [cfg, setCfg] = useState(settings.chatbot);

  const save = async () => {
    const ok = await saveSettingsPatch({ chatbot: cfg });
    push(ok ? "success" : "info", t("admin.saved"), ok ? "✓ synced" : "queued offline");
  };

  const updFaq = (id: string, patch: Partial<FaqEntry>) =>
    setCfg({ ...cfg, faqs: cfg.faqs.map((f) => (f.id === id ? { ...f, ...patch } : f)) });

  const updQa = (id: string, patch: Partial<QuickAction>) =>
    setCfg({ ...cfg, quickActions: cfg.quickActions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="flex items-center gap-2 text-sm font-bold">
            <Bot size={15} className="text-acc-1" />
            AI Chatbot
          </h4>
          <div className="flex items-center gap-2">
            <Toggle checked={cfg.enabled} onChange={(v) => setCfg({ ...cfg, enabled: v })} />
            <span className="text-[11px] font-semibold text-muted-foreground">{cfg.enabled ? t("admin.enabled") : t("admin.disabled")}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bot name">
            <TextInput value={cfg.botName} onChange={(e) => setCfg({ ...cfg, botName: e.target.value })} />
          </Field>
          <Field label={t("admin.welcomeMsg")}>
            <TextInput value={cfg.welcome} onChange={(e) => setCfg({ ...cfg, welcome: e.target.value })} />
          </Field>
        </div>
        <Field label={t("admin.sysPrompt")}>
          <TextArea value={cfg.systemPrompt} onChange={(e) => setCfg({ ...cfg, systemPrompt: e.target.value })} className="min-h-28" />
        </Field>
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <h4 className="text-sm font-bold">{t("admin.quickActions")}</h4>
        {cfg.quickActions.map((q) => (
          <div key={q.id} className="grid grid-cols-[140px_1fr_32px] items-center gap-2">
            <TextInput value={q.label} onChange={(e) => updQa(q.id, { label: e.target.value })} placeholder="Label" />
            <TextInput value={q.message} onChange={(e) => updQa(q.id, { message: e.target.value })} placeholder="Message sent" />
            <button
              onClick={() => setCfg({ ...cfg, quickActions: cfg.quickActions.filter((x) => x.id !== q.id) })}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10"
              aria-label={t("common.delete")}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <AccentButton
          size="sm"
          variant="ghost"
          onClick={() =>
            setCfg({ ...cfg, quickActions: [...cfg.quickActions, { id: genId("qa"), label: "New action", message: "New action" }] })
          }
        >
          <Plus size={13} />
          {t("common.add")}
        </AccentButton>
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <h4 className="text-sm font-bold">FAQ / auto-replies</h4>
        {cfg.faqs.map((f) => (
          <div key={f.id} className="space-y-2 rounded-xl border border-border/60 p-3">
            <div className="grid grid-cols-[1fr_32px] items-center gap-2">
              <TextInput value={f.q} onChange={(e) => updFaq(f.id, { q: e.target.value })} placeholder="Question / keywords" />
              <button
                onClick={() => setCfg({ ...cfg, faqs: cfg.faqs.filter((x) => x.id !== f.id) })}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10"
                aria-label={t("common.delete")}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <TextArea value={f.a} onChange={(e) => updFaq(f.id, { a: e.target.value })} placeholder="Answer" className="min-h-16" />
          </div>
        ))}
        <AccentButton
          size="sm"
          variant="ghost"
          onClick={() => setCfg({ ...cfg, faqs: [...cfg.faqs, { id: genId("faq"), q: "", a: "" }] })}
        >
          <Plus size={13} />
          {t("admin.addFaq")}
        </AccentButton>
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <h4 className="text-sm font-bold">External AI (optional — OpenAI compatible)</h4>
        <p className="text-xs text-muted-foreground">
          If set, the bot answers via this API using your system instructions; otherwise the built-in smart assistant replies from live store data.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("admin.endpoint")}>
            <TextInput value={cfg.apiEndpoint ?? ""} onChange={(e) => setCfg({ ...cfg, apiEndpoint: e.target.value })} placeholder="https://api.openai.com/v1" />
          </Field>
          <Field label={t("admin.apiKey")}>
            <TextInput type="password" value={cfg.apiKey ?? ""} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} placeholder="sk-…" />
          </Field>
        </div>
        <Field label="Model">
          <TextInput value={cfg.model ?? ""} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} placeholder="gpt-4o-mini" />
        </Field>
      </GlassCard>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <AccentButton onClick={() => void save()} size="lg">
          <Save size={15} />
          {t("common.save")}
        </AccentButton>
      </div>
    </div>
  );
}

/* ============================== LINKS TAB ============================== */

function LinksAdmin() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const { push } = useToasts();
  const [social, setSocial] = useState(settings.social);

  const fields: Array<{ key: keyof typeof social; label: string; ph: string }> = [
    { key: "telegram", label: "Telegram", ph: "https://t.me/…" },
    { key: "whatsapp", label: "WhatsApp", ph: "https://wa.me/977…" },
    { key: "email", label: "Email", ph: "support@…" },
    { key: "instagram", label: "Instagram", ph: "https://instagram.com/…" },
    { key: "facebook", label: "Facebook", ph: "https://facebook.com/…" },
    { key: "youtube", label: "YouTube", ph: "https://youtube.com/@…" },
  ];

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-3 p-5">
        <h4 className="flex items-center gap-2 text-sm font-bold">
          <Link2 size={15} className="text-acc-1" />
          Contact & social links (footer, chat, account)
        </h4>
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <TextInput
              value={social[f.key] ?? ""}
              onChange={(e) => setSocial({ ...social, [f.key]: e.target.value })}
              placeholder={f.ph}
            />
          </Field>
        ))}
      </GlassCard>
      <div className="flex justify-end">
        <AccentButton
          onClick={async () => {
            const ok = await saveSettingsPatch({ social });
            push(ok ? "success" : "info", t("admin.saved"), ok ? "✓" : "queued");
          }}
        >
          <Save size={14} />
          {t("common.save")}
        </AccentButton>
      </div>
    </div>
  );
}

/* ============================== USERS TAB ============================== */

function UsersAdmin() {
  const { t } = useI18n();
  const { users } = useUsers();
  const { user: me } = useAuth();

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <GlassCard key={u.uid} className="flex flex-wrap items-center gap-3 p-4">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold text-white"
            style={{ background: "linear-gradient(135deg, var(--acc-1), var(--acc-2))" }}
          >
            {(u.name || "G").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {u.name} {me?.uid === u.uid ? <span className="text-[10px] font-bold text-acc-1">(you)</span> : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {u.email ?? "—"} · {u.provider} · {new Date(u.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Segmented
            size="sm"
            value={u.role}
            onChange={(v) => void saveUserProfile({ ...u, role: v as "user" | "admin" })}
            options={[
              { value: "user", label: "user" },
              { value: "admin", label: "admin" },
            ]}
          />
        </GlassCard>
      ))}
      {users.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Users size={16} />
          {t("orders.empty")}
        </p>
      ) : null}
    </div>
  );
}

/* ============================== SETTINGS TAB ============================== */

function SettingsAdmin() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const { push } = useToasts();
  const [siteName, setSiteName] = useState(settings.siteName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [hours, setHours] = useState(settings.supportHours ?? "");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [fbJson, setFbJson] = useState(() => {
    try {
      const cfg = getFirebaseConfig();
      return cfg.apiKey ? JSON.stringify(cfg, null, 2) : "";
    } catch {
      return "";
    }
  });

  const download = () => {
    try {
      const blob = new Blob([exportLocalData()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ezfamenp-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      push("error", "Export failed");
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-3 p-5">
        <h4 className="text-sm font-bold">Branding</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("admin.siteName")}>
            <TextInput value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </Field>
          <Field label={t("admin.tagline")}>
            <TextInput value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </Field>
        </div>
        <Field label="Support hours">
          <TextInput value={hours} onChange={(e) => setHours(e.target.value)} placeholder="24/7 live support" />
        </Field>
        <AccentButton
          size="sm"
          onClick={async () => {
            const ok = await saveSettingsPatch({ siteName, tagline, supportHours: hours });
            push(ok ? "success" : "info", t("admin.saved"));
          }}
        >
          <Save size={13} />
          {t("common.save")}
        </AccentButton>
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <h4 className="flex items-center gap-2 text-sm font-bold">
          <Lock size={14} className="text-acc-2" />
          Admin credentials
        </h4>
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t("admin.userNew")} className="w-64">
            <TextInput value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="ramesh" autoComplete="off" />
          </Field>
          <Field label={t("admin.passNew")} className="w-64">
            <TextInput type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="••••••••" />
          </Field>
          <AccentButton
            size="sm"
            onClick={async () => {
              const patch: Partial<Settings> = {};
              if (newUser.trim()) {
                patch.adminUserHash = await sha256Hex(newUser.trim().toLowerCase());
              }
              if (newPass) {
                if (newPass.length < 6) {
                  push("error", t("auth.errPass"));
                  return;
                }
                patch.adminPassHash = await sha256Hex(newPass);
              }
              if (Object.keys(patch).length === 0) {
                push("info", t("admin.saved"), "nothing changed");
                return;
              }
              const ok = await saveSettingsPatch(patch);
              push(ok ? "success" : "info", t("admin.saved"), "admin credentials updated");
              setNewUser("");
              setNewPass("");
            }}
          >
            <KeyRound size={13} />
            Update
          </AccentButton>
        </div>
        <p className="text-[11px] text-muted-foreground">Default credentials on fresh installs: ramesh / agrim — change them here.</p>
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <h4 className="text-sm font-bold">{t("admin.firebase")}</h4>
        <p className="text-xs text-muted-foreground">{t("admin.firebaseHint")}</p>
        <TextArea
          value={fbJson}
          onChange={(e) => setFbJson(e.target.value)}
          placeholder={'{\n  "apiKey": "…",\n  "authDomain": "…",\n  "databaseURL": "…",\n  "projectId": "…",\n  "appId": "…"\n}'}
          className="min-h-32 font-mono text-xs"
        />
        <div className="flex flex-wrap gap-2">
          <AccentButton
            size="sm"
            onClick={() => {
              try {
                const parsed = JSON.parse(fbJson) as Record<string, string>;
                if (!parsed.databaseURL) {
                  push("error", "databaseURL is required");
                  return;
                }
                saveFirebaseConfigOverride(parsed);
                push("success", t("admin.saved"), "Reloading…");
                setTimeout(() => window.location.reload(), 900);
              } catch {
                push("error", "Invalid JSON");
              }
            }}
          >
            <Save size={13} />
            Apply & reload
          </AccentButton>
          <AccentButton
            size="sm"
            variant="ghost"
            onClick={() => {
              saveFirebaseConfigOverride(null);
              push("success", "Firebase override cleared", "Reloading…");
              setTimeout(() => window.location.reload(), 900);
            }}
          >
            Reset
          </AccentButton>
        </div>
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <h4 className="flex items-center gap-2 text-sm font-bold">
          <Download size={14} className="text-acc-3" />
          {t("admin.exportData")}
        </h4>
        <div className="flex flex-wrap gap-2">
          <AccentButton size="sm" variant="ghost" onClick={download}>
            <Download size={13} />
            {t("admin.exportData")}
          </AccentButton>
          <AccentButton
            size="sm"
            variant="ghost"
            onClick={() => {
              resetLocalData();
              push("success", t("admin.resetCache"), "✓");
            }}
          >
            <Trash2 size={13} />
            {t("admin.resetCache")}
          </AccentButton>
          <AccentButton
            size="sm"
            variant="ghost"
            onClick={async () => {
              await dbSet("csmm/catalog", DEFAULT_CATALOG);
              await dbSet("csmm/settings", { ...DEFAULT_SETTINGS, updatedAt: Date.now() });
              push("success", "Defaults re-seeded", "catalog + settings");
            }}
          >
            <RefreshCw size={13} />
            Re-seed defaults
          </AccentButton>
        </div>
      </GlassCard>
    </div>
  );
}

/* ============================== SHELL ============================== */

export function AdminView() {
  const { t } = useI18n();
  const { user, isAdmin } = useAuth();
  const { orders, ready } = useAllOrders();
  const { settings } = useSettings();
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return typeof window !== "undefined" && sessionStorage.getItem(LS_ADMIN_OK) === "1";
    } catch {
      return false;
    }
  });
  const [tab, setTab] = useState<Tab>("dashboard");

  const gatePassed = unlocked || isAdmin;
  const settingsKey = settings.updatedAt ?? 0;

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: "dashboard", label: t("admin.title").split(" ")[0], icon: <MessageSquare size={13} /> },
    { id: "orders", label: "Orders", icon: <ShoppingBag size={13} /> },
    { id: "services", label: "Services", icon: <Package size={13} /> },
    { id: "payments", label: "Payments", icon: <Coins size={13} /> },
    { id: "chatbot", label: "AI Bot", icon: <Bot size={13} /> },
    { id: "links", label: "Links", icon: <Link2 size={13} /> },
    { id: "users", label: "Users", icon: <Users size={13} /> },
    { id: "settings", label: "Settings", icon: <ShieldCheck size={13} /> },
  ];

  if (!gatePassed) {
    return <Gate onPass={() => setUnlocked(true)} />;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28">
      <SectionTitle eyebrow={`#/original — ${user?.role === "admin" ? "role: admin" : "access unlocked"}`} title={t("admin.title")} />

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              "glass flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all",
              tab === tb.id && "pill-active text-acc-1",
            )}
          >
            {tb.icon}
            {tb.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${tab}-${settingsKey}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
        >
          {tab === "dashboard" ? <Dashboard orders={orders} /> : null}
          {tab === "orders" ? (
            !ready ? (
              <p className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : (
              <OrdersAdmin orders={orders} />
            )
          ) : null}
          {tab === "services" ? <ServicesAdmin /> : null}
          {tab === "payments" ? <PaymentsAdmin /> : null}
          {tab === "chatbot" ? <ChatbotAdmin /> : null}
          {tab === "links" ? <LinksAdmin /> : null}
          {tab === "users" ? <UsersAdmin /> : null}
          {tab === "settings" ? <SettingsAdmin /> : null}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
