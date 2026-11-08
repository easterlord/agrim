"use client";

/* ============================================================
 * EzFame — bespoke glass UI kit
 * ============================================================ */

import { AnimatePresence, animate, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { useToasts } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

/* ---------------- GlassCard ---------------- */

export function GlassCard({
  children,
  className,
  hover = false,
  strong = false,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  strong?: boolean;
}) {
  return (
    <div className={cn("glass rounded-2xl", strong && "glass-strong", hover && "glass-hover", className)}>
      {children}
    </div>
  );
}

/* ---------------- Section heading ---------------- */

export function SectionTitle({
  eyebrow,
  title,
  sub,
  center = false,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  center?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mb-8", center && "text-center")}
    >
      {eyebrow ? (
        <div className={cn("mb-2 flex items-center gap-2", center && "justify-center")}>
          <span className="h-px w-8 bg-gradient-to-r from-transparent via-acc-1 to-acc-2" />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-acc-1">
            {eyebrow}
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent via-acc-2 to-acc-1" />
        </div>
      ) : null}
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {sub ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base" style={!center ? {} : { marginInline: "auto" }}>{sub}</p> : null}
    </motion.div>
  );
}

/* ---------------- Accent button ---------------- */

export function AccentButton({
  children,
  onClick,
  className,
  disabled,
  type = "button",
  variant = "accent",
  size = "md",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  variant?: "accent" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "px-3.5 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3 text-base",
  };
  const variants = {
    accent: "btn-accent font-semibold",
    ghost:
      "glass font-semibold hover:border-acc-1/50 transition-all duration-300 text-foreground",
    danger:
      "bg-red-500/15 text-red-500 border border-red-500/40 font-semibold hover:bg-red-500/25 transition-colors",
  };
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl",
        sizes[size],
        variants[variant],
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

/* ---------------- Segmented control (animated) ---------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: Array<{ value: T; label: React.ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const id = useRef(`seg-${Math.random().toString(36).slice(2, 8)}`);
  return (
    <div
      className={cn(
        "glass relative inline-flex items-center gap-1 rounded-full p-1",
        size === "sm" ? "text-[11px]" : "text-xs",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 rounded-full px-3.5 py-1.5 font-semibold transition-colors duration-200",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId={id.current}
                className="absolute inset-0 -z-10 rounded-full"
                style={{
                  background:
                    "linear-gradient(93deg, color-mix(in oklab, var(--acc-1) 24%, transparent), color-mix(in oklab, var(--acc-2) 24%, transparent))",
                  boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--acc-1) 45%, transparent)",
                }}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Toggle ---------------- */

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300",
        checked ? "bg-gradient-to-r from-acc-1 to-acc-2" : "bg-muted-foreground/25",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md",
          checked ? "left-[22px]" : "left-0.5",
        )}
      />
    </button>
  );
}

/* ---------------- Inputs ---------------- */

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label ? (
        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      ) : null}
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("field", props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("field min-h-24 resize-y", props.className)} />;
}

/* ---------------- QR code renderer ---------------- */

export function QRImage({
  value,
  size = 180,
  className,
  caption,
}: {
  value: string;
  size?: number;
  className?: string;
  caption?: string;
}) {
  const [gen, setGen] = useState<{ v: string; url: string }>({ v: "", url: "" });
  const url = gen.v === value ? gen.url : "";

  useEffect(() => {
    let alive = true;
    if (!value) return;
    QRCode.toDataURL(value, {
      margin: 1,
      width: 480,
      errorCorrectionLevel: "M",
      color: { dark: "#0a0f1e", light: "#ffffff" },
    })
      .then((u) => {
        if (alive) setGen({ v: value, url: u });
      })
      .catch(() => {
        if (alive) setGen({ v: value, url: "" });
      });
    return () => {
      alive = false;
    };
  }, [value]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className="overflow-hidden rounded-xl border border-border bg-white p-2 shadow-inner"
        style={{ width: size, height: size }}
      >
        {url ? (
          <motion.img
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            src={url}
            alt="Payment QR code"
            width={size - 16}
            height={size - 16}
            className="h-full w-full rounded-lg object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}
      </div>
      {caption ? <span className="text-[11px] text-muted-foreground">{caption}</span> : null}
    </div>
  );
}

/* ---------------- remote/qr image with graceful fallback ---------------- */

export function SafeImage({
  src,
  alt,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!src || failed) {
    return fallback ? (
      <div className={className}>{fallback}</div>
    ) : (
      <div className={cn("flex items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground", className)}>
        ⬛ QR unavailable
      </div>
    );
  }
  return (
    <div className={cn("relative", className)}>
      {!loaded ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
        className={cn("h-full w-full rounded-xl object-contain transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
      />
    </div>
  );
}

/* ---------------- Status badge ---------------- */

const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  processing: "bg-cyan-500/15 text-cyan-500 border-cyan-500/40",
  completed: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  rejected: "bg-red-500/15 text-red-500 border-red-500/40",
  cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/40",
};

export function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        STATUS_STYLE[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/* ---------------- CountUp ---------------- */

export function CountUp({
  to,
  suffix = "",
  prefix = "",
  decimals = 0,
  duration = 1.6,
  className,
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          const controls = animate(0, to, {
            duration,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (v) => setVal(v),
          });
          return () => controls.stop();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className={cn("glass glass-strong w-full rounded-2xl p-5", wide ? "max-w-2xl" : "max-w-md")}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto pr-1">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ---------------- Toast stack ---------------- */

const TOAST_ICON = {
  success: <CheckCircle2 size={18} className="text-emerald-400" />,
  error: <AlertTriangle size={18} className="text-red-400" />,
  info: <Info size={18} className="text-cyan-300" />,
};

export function ToastStack() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[95] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2 sm:left-4 sm:translate-x-0">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="glass glass-strong pointer-events-auto flex items-start gap-3 rounded-xl p-3 pr-2"
            role="status"
          >
            <span className="mt-0.5 shrink-0">{TOAST_ICON[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{t.title}</p>
              {t.message ? <p className="mt-0.5 text-xs text-muted-foreground">{t.message}</p> : null}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- misc ---------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-8 w-8 animate-spin rounded-full border-2 border-transparent", className)}
      style={{
        borderTopColor: "var(--acc-1)",
        borderRightColor: "var(--acc-2)",
      }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function EmptyState({
  icon,
  title,
  sub,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="glass flex h-16 w-16 items-center justify-center rounded-2xl text-acc-1">{icon}</div>
      <p className="text-base font-semibold">{title}</p>
      {sub ? <p className="max-w-sm text-sm text-muted-foreground">{sub}</p> : null}
      {action}
    </div>
  );
}
