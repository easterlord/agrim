"use client";

/* ============================================================
 * EzfaNep — home view: hero, category pills, configurator,
 * live pricing, stats, features, how-it-works.
 * ============================================================ */

import { AnimatePresence, motion } from "framer-motion";
import {
  BadgePercent,
  Bot,
  ChevronRight,
  Gamepad2,
  Gauge,
  Link2,
  Package as PackageIcon,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PlatformIcon } from "@/components/icons";
import { CountUp, GlassCard, AccentButton, SectionTitle, Segmented, TextInput } from "@/components/ui-kit";
import { Tx, useI18n } from "@/lib/i18n";
import { useCatalog, useSettings } from "@/lib/data";
import { useDraft, useUI } from "@/lib/store";
import { navigate } from "@/lib/router";
import { calcQtyPrice, cn, convertUSD, findPackage, fmtNPR, fmtUSD } from "@/lib/utils";
import type { Platform, ServiceType } from "@/lib/types";

/* ============================ HERO ============================ */

const FLOAT_CHIPS = [
  { icon: "👥", text: "+1,000 Followers", className: "left-[4%] top-[24%] hidden lg:flex", delay: 0 },
  { icon: "⚡", text: "UC delivered in 5 min", className: "right-[6%] top-[30%] hidden lg:flex", delay: 0.8 },
  { icon: "❤️", text: "+5,000 Likes", className: "left-[10%] bottom-[18%] hidden lg:flex", delay: 1.6 },
  { icon: "💎", text: "Free Fire x2 Bonus", className: "right-[10%] bottom-[22%] hidden lg:flex", delay: 2.2 },
];

export function Hero() {
  const { t } = useI18n();
  const { platforms } = useCatalog();

  const scrollToShop = () => {
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const totalServices = platforms.reduce((s, p) => s + p.services.filter((x) => x.active).length, 0);

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32">
      {FLOAT_CHIPS.map((chip) => (
        <motion.div
          key={chip.text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: [0, -12, 0] }}
          transition={{ opacity: { delay: 0.6 + chip.delay * 0.3, duration: 0.6 }, y: { duration: 5 + chip.delay, repeat: Infinity, ease: "easeInOut" } }}
          className={cn("glass absolute z-10 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground", chip.className)}
        >
          <span>{chip.icon}</span>
          {chip.text}
        </motion.div>
      ))}

      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5"
        >
          <span className="dot-live" />
          <span className="text-xs font-semibold tracking-wide text-muted-foreground">{t("hero.badge")}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl"
        >
          {t("hero.title1")}
          <br />
          <span className="text-gradient soft-emboss">{t("hero.title2")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base"
        >
          {t("hero.sub")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.28 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <AccentButton size="lg" onClick={scrollToShop}>
            <Rocket size={17} />
            {t("hero.cta1")}
          </AccentButton>
          <AccentButton size="lg" variant="ghost" onClick={scrollToShop}>
            {t("hero.cta2")}
            <ChevronRight size={16} />
          </AccentButton>
        </motion.div>

        {/* stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { value: totalServices || 60, suffix: "+", label: t("hero.stat1"), decimals: 0 },
            { value: 18450, suffix: "+", label: t("hero.stat2"), decimals: 0 },
            { value: 9300, suffix: "+", label: t("hero.stat3"), decimals: 0 },
            { value: 4.9, suffix: "★", label: t("hero.stat4"), decimals: 1 },
          ].map((s, i) => (
            <GlassCard key={s.label} className="px-3 py-4" hover>
              <div className="font-[family-name:var(--f-display)] text-xl font-extrabold text-gradient sm:text-2xl">
                <CountUp to={s.value} suffix={s.suffix} decimals={s.decimals} duration={1.4 + i * 0.2} />
              </div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
            </GlassCard>
          ))}
        </motion.div>
      </div>

      {/* platform marquee */}
      <div className="relative mt-14 overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,black 12%,black 88%,transparent)]">
        <div className="animate-marquee flex w-max gap-3">
          {[...platforms, ...platforms].map((p, i) => (
            <div key={`${p.id}-${i}`} className="glass flex items-center gap-2 rounded-full px-4 py-2">
              <PlatformIcon id={p.id} size={16} />
              <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ======================= CATEGORY PILLS ======================= */

export function CategoryBar({
  platforms,
  active,
  onSelect,
}: {
  platforms: Platform[];
  active: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const [kind, setKind] = useState<"social" | "game">("social");

  const filtered = useMemo(() => platforms.filter((p) => p.kind === kind), [platforms, kind]);

  // derived effective selection — no state-sync effects needed
  const activeId = active && filtered.some((p) => p.id === active) ? active : filtered[0]?.id ?? null;

  const switchKind = (k: "social" | "game") => {
    setKind(k);
    const list = platforms.filter((p) => p.kind === k);
    if (list.length && !list.some((p) => p.id === active)) onSelect(list[0].id);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Segmented
          value={kind}
          onChange={(v) => switchKind(v as "social" | "game")}
          options={[
            { value: "social", label: <span className="flex items-center gap-1.5"><Sparkles size={12} /> {t("shop.social")}</span> },
            { value: "game", label: <span className="flex items-center gap-1.5"><Gamepad2 size={12} /> {t("shop.games")}</span> },
          ]}
        />
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
        <AnimatePresence mode="popLayout">
          {filtered.map((p, i) => {
            const isActive = p.id === activeId;
            return (
              <motion.button
                layout
                key={p.id}
                initial={{ opacity: 0, scale: 0.85, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.03, type: "spring", stiffness: 380, damping: 28 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(p.id)}
                aria-pressed={isActive}
                className={cn(
                  "glass flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all",
                  isActive && "pill-active",
                )}
                style={isActive ? { color: p.color } : undefined}
              >
                <PlatformIcon id={p.id} size={17} className={cn(!isActive && "text-muted-foreground")} />
                <span className={cn(!isActive && "text-muted-foreground")}>{p.name}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ======================= CONFIGURATOR ======================= */

function ServiceRow({
  service,
  active,
  onClick,
}: {
  service: ServiceType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-300",
        active
          ? "pill-active bg-accent"
          : "border-border/70 bg-transparent hover:border-acc-1/35 hover:bg-muted/60",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">
          <Tx text={service.name} />
        </span>
        {service.speed ? (
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Gauge size={10} />
            <Tx text={service.speed} />
          </span>
        ) : null}
      </span>
      <ChevronRight size={15} className={cn("shrink-0 transition-transform group-hover:translate-x-0.5", active ? "text-acc-1" : "text-muted-foreground")} />
    </button>
  );
}

export function Configurator({
  platformId,
  onSelectPlatform,
}: {
  platformId: string | null;
  onSelectPlatform: (id: string) => void;
}) {
  const { t } = useI18n();
  const { platforms } = useCatalog();
  const { settings } = useSettings();
  const { currency } = useUI();
  const draft = useDraft();

  const [typeId, setTypeId] = useState<string | null>(draft.typeId);
  const [qty, setQty] = useState<number>(draft.quantity ?? 1000);
  const [packageId, setPackageId] = useState<string | null>(draft.packageId);
  const [playerId, setPlayerId] = useState(draft.playerId ?? "");
  const [link, setLink] = useState(draft.link ?? "");
  const [err, setErr] = useState("");

  /* derived selection chain — zero sync effects */
  const platform = platforms.find((p) => p.id === platformId) ?? platforms[0] ?? null;
  const activeServices = useMemo(
    () => platform?.services.filter((s) => s.active) ?? [],
    [platform],
  );
  const service = activeServices.find((s) => s.id === typeId) ?? activeServices[0] ?? null;
  const isGame = platform?.kind === "game";
  const effPackageId =
    service?.packages?.length
      ? service.packages.some((p) => p.id === packageId)
        ? packageId
        : service.packages[0].id
      : null;

  const price = useMemo(() => {
    if (!service) return { usd: 0, valid: false, qty: 0 };
    if (service.packages?.length) {
      const pk = findPackage(service, effPackageId);
      return { usd: pk?.priceUSD ?? 0, valid: true, qty: pk?.qty ?? 0 };
    }
    const r = calcQtyPrice(service, qty);
    return { usd: r.usd, valid: r.valid, qty: r.qty };
  }, [service, effPackageId, qty]);

  const shown = currency === "NPR" ? fmtNPR(convertUSD(price.usd, settings.exchangeRate)) : fmtUSD(price.usd);

  const buy = () => {
    setErr("");
    if (!platform || !service) return;
    if (service.packages?.length && !effPackageId) {
      setErr(t("shop.package"));
      return;
    }
    if (!service.packages?.length && !price.valid) {
      setErr(`${t("shop.min")}: ${service.minQty ?? 100}`);
      return;
    }
    if (isGame && !playerId.trim()) {
      setErr(t("shop.uidHint"));
      document.getElementById("cfg-player")?.focus();
      return;
    }
    draft.setDraft({
      platformId: platform.id,
      typeId: service.id,
      quantity: service.packages?.length ? null : price.qty,
      packageId: service.packages?.length ? effPackageId : null,
      playerId: playerId.trim(),
      link: link.trim(),
    });
    navigate("/checkout");
  };

  const sliderFill =
    service && service.maxQty && service.maxQty > (service.minQty ?? 100)
      ? `${(((qty - (service.minQty ?? 100)) / (service.maxQty - (service.minQty ?? 100))) * 100).toFixed(1)}%`
      : "50%";

  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="grid lg:grid-cols-[320px_1fr]">
        {/* service list */}
        <div className="border-b border-border/60 p-5 lg:border-b-0 lg:border-r">
          {platform ? (
            <div className="mb-4 flex items-center gap-3">
              <span className="glass flex h-11 w-11 items-center justify-center rounded-xl" style={{ color: platform.color }}>
                <PlatformIcon id={platform.id} size={22} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{platform.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {activeServices.length} {t("nav.services").toLowerCase()}
                </p>
              </div>
            </div>
          ) : null}

          <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1 lg:max-h-[420px]">
            {activeServices.map((s) => (
              <ServiceRow key={s.id} service={s} active={s.id === service?.id} onClick={() => setTypeId(s.id)} />
            ))}
            {platform && activeServices.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">{t("shop.selectPrompt")}</p>
            ) : null}
          </div>
        </div>

        {/* config panel */}
        <div className="p-5 sm:p-6">
          <AnimatePresence mode="wait">
            {service ? (
              <motion.div
                key={`${platform?.id}-${service.id}`}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">
                    <Tx text={service.name} />
                  </h3>
                  {service.warranty ? (
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                      <Tx text={service.warranty} />
                    </span>
                  ) : null}
                  {service.speed ? (
                    <span className="flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-500">
                      <Zap size={10} />
                      <Tx text={service.speed} />
                    </span>
                  ) : null}
                </div>

                {service.description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <Tx text={service.description} />
                  </p>
                ) : null}

                {/* quantity based */}
                {!service.packages?.length && service.pricePerKUSD ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("shop.quantity")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[500, 1000, 5000, 10000].map((v) => (
                          <button
                            key={v}
                            onClick={() => setQty(v)}
                            className={cn(
                              "rounded-lg px-2 py-1 font-mono text-[11px] font-bold transition-colors",
                              qty === v ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {v >= 1000 ? `${v / 1000}k` : v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="range"
                      className="slider-accent"
                      style={{ ["--fill" as string]: sliderFill }}
                      min={service.minQty ?? 100}
                      max={service.maxQty ?? 100000}
                      step={service.stepQty ?? 50}
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      aria-label={t("shop.quantity")}
                    />

                    <div className="flex items-center gap-3">
                      <TextInput
                        type="number"
                        value={qty}
                        min={service.minQty}
                        max={service.maxQty}
                        step={service.stepQty}
                        onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))}
                        className="w-36 font-mono"
                        aria-label={t("shop.quantity")}
                      />
                      <span className="text-xs text-muted-foreground">
                        {t("shop.min")}: {service.minQty} · {t("shop.max")}: {(service.maxQty ?? 0).toLocaleString()} · {fmtUSD(service.pricePerKUSD ?? 0)} {t("shop.perK")}
                      </span>
                    </div>

                    {!isGame ? (
                      <div className="relative">
                        <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <TextInput
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                          placeholder={t("shop.linkHint")}
                          className="pl-9"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* packages (games) */}
                {service.packages?.length ? (
                  <div className="space-y-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("shop.package")}
                    </span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {service.packages.map((pk) => {
                        const activeP = pk.id === effPackageId;
                        return (
                          <motion.button
                            key={pk.id}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setPackageId(pk.id)}
                            className={cn(
                              "relative rounded-xl border p-3 text-left transition-all duration-300",
                              activeP ? "pill-active bg-accent" : "border-border/70 hover:border-acc-1/35",
                            )}
                          >
                            {pk.hot ? (
                              <span className="absolute -top-2 right-2 rounded-full bg-gradient-to-r from-amber-500 to-red-500 px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                                HOT
                              </span>
                            ) : null}
                            <p className="text-sm font-bold">{pk.label}</p>
                            {pk.bonus ? <p className="text-[10px] font-semibold text-emerald-500">{pk.bonus}</p> : null}
                            <p className="mt-1 font-mono text-xs text-acc-1">
                              {currency === "NPR" ? fmtNPR(convertUSD(pk.priceUSD, settings.exchangeRate)) : fmtUSD(pk.priceUSD)}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="relative">
                      <Gamepad2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <TextInput
                        id="cfg-player"
                        value={playerId}
                        onChange={(e) => setPlayerId(e.target.value)}
                        placeholder={`${t("shop.uidLabel")} — ${t("shop.uidHint")}`}
                        className="pl-9"
                      />
                    </div>
                  </div>
                ) : null}

                {/* price + buy */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-acc-1/25 bg-gradient-to-r from-[color-mix(in_oklab,var(--acc-1)_10%,transparent)] to-[color-mix(in_oklab,var(--acc-2)_10%,transparent)] p-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {t("shop.price")}
                    </p>
                    <AnimatePresence mode="popLayout">
                      <motion.p
                        key={shown}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.22 }}
                        className="font-[family-name:var(--f-display)] text-2xl font-extrabold text-gradient sm:text-3xl"
                      >
                        {shown}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <AccentButton size="lg" onClick={buy} disabled={!price.valid || price.usd <= 0}>
                    <ShoppingBag size={16} />
                    {t("shop.buyNow")}
                  </AccentButton>
                </div>

                {err ? (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-semibold text-red-400">
                    {err}
                  </motion.p>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-64 items-center justify-center text-sm text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <PackageIcon size={16} />
                  {t("shop.selectPrompt")}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </GlassCard>
  );
}

/* ======================= SHOP SECTION ======================= */

export function ShopSection() {
  const { t } = useI18n();
  const { platforms } = useCatalog();
  const draft = useDraft();
  const [active, setActive] = useState<string | null>(draft.platformId);

  return (
    <section id="shop" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6">
      <SectionTitle eyebrow="ORDER NOW" title={t("shop.title")} sub={t("shop.sub")} center />
      <CategoryBar platforms={platforms} active={active} onSelect={setActive} />
      <div className="mt-8">
        <Configurator platformId={active} onSelectPlatform={setActive} />
      </div>
    </section>
  );
}

/* ======================= FEATURES ======================= */

export function Features() {
  const { t } = useI18n();
  const features = [
    { icon: <Zap size={20} />, title: t("hero.stat4"), desc: t("hero.sub"), tint: "var(--acc-1)" },
    { icon: <ShieldCheck size={20} />, title: "100% Safe", desc: "No passwords needed — only public links & game UIDs. Privacy-first delivery.", tint: "var(--acc-2)" },
    { icon: <Bot size={20} />, title: t("chat.title"), desc: "AI assistant answers pricing & order questions instantly, 24/7.", tint: "var(--acc-3)" },
    { icon: <BadgePercent size={20} />, title: "Best Rates", desc: "Live USD ⇄ NPR conversion with the lowest prices in Nepal — updated by the store.", tint: "var(--ok)" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <GlassCard hover className="h-full p-5">
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ color: f.tint, background: `color-mix(in oklab, ${f.tint} 14%, transparent)` }}
              >
                {f.icon}
              </div>
              <h3 className="text-sm font-bold">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ======================= HOW IT WORKS ======================= */

export function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { icon: <Sparkles size={18} />, title: t("shop.title"), desc: t("shop.sub") },
    { icon: <ShieldCheck size={18} />, title: t("checkout.payMethod"), desc: t("checkout.payFirst") },
    { icon: <Rocket size={18} />, title: t("hero.stat4"), desc: t("checkout.successMsg") },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <SectionTitle eyebrow="HOW IT WORKS" title={t("shop.title")} center />
      <div className="relative grid gap-4 md:grid-cols-3">
        <div className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-gradient-to-r from-acc-1/40 via-acc-2/40 to-acc-3/40 md:block" />
        {steps.map((s, i) => (
          <motion.div
            key={s.title + String(i)}
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.12, duration: 0.5 }}
            className="relative text-center"
          >
            <div className="glass relative z-10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ color: "var(--acc-1)" }}>
              {s.icon}
              <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-extrabold text-white" style={{ background: "linear-gradient(135deg, var(--acc-1), var(--acc-2))" }}>
                {i + 1}
              </span>
            </div>
            <h3 className="text-sm font-bold">{s.title}</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
