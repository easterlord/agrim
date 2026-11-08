"use client";

/* ============================================================
 * EzFame — floating AI support assistant (admin-configurable)
 * ============================================================ */

import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageSquare, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { GlassCard } from "@/components/ui-kit";
import { Tx, googleTranslate, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCatalog, useSettings } from "@/lib/data";
import { useChat, useSyncStatus, useUI } from "@/lib/store";
import { useAllOrders } from "@/lib/data";
import { readLocalOrders } from "@/lib/localOrders";
import { botReply, type ChatMessage } from "@/lib/chatbot";
import { cn } from "@/lib/utils";
import type { Order } from "@/lib/types";

export function ChatWidget() {
  const { settings } = useSettings();
  const { platforms } = useCatalog();
  const { orders } = useAllOrders();
  const { user } = useAuth();
  const { currency } = useUI();
  const { t, lang } = useI18n();
  const sync = useSyncStatus();
  const { chatOpen, setChatOpen } = useChat();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const welcomed = useRef(false);

  const cfg = settings.chatbot;
  const visible = cfg.enabled;

  const myOrders = useMemo<Order[]>(() => {
    const local = readLocalOrders();
    const mine = user ? orders.filter((o) => o.userId === user.uid) : [];
    const map = new Map<string, Order>();
    const dbById = new Map(orders.map((o) => [o.id, o]));
    // fresher cloud copies win over the local mirror
    for (const o of local) {
      const cloud = dbById.get(o.id);
      map.set(o.id, cloud ? { ...o, ...cloud, items: o.items ?? cloud.items ?? [] } : o);
    }
    for (const o of mine) map.set(o.id, { ...map.get(o.id), ...o, items: o.items ?? [] });
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, [orders, user]);

  useEffect(() => {
    if (chatOpen && !welcomed.current && cfg.welcome) {
      welcomed.current = true;
      setMessages([{ role: "assistant", content: cfg.welcome }]);
    }
  }, [chatOpen, cfg.welcome]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setTyping(true);
    try {
      let reply = await botReply(
        text,
        next,
        {
          settings,
          catalog: platforms,
          orders: myOrders,
          currency,
          rate: settings.exchangeRate,
          userName: user?.name,
        },
      );
      if (lang !== "en") {
        reply = await googleTranslate(reply, lang);
      }
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry — I'm offline right now. Please use Telegram support." }]);
    } finally {
      setTyping(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* launcher — perfectly round, spring-animated FAB */}
      <motion.button
        initial={{ scale: 0, rotate: -120 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.9 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setChatOpen(!chatOpen)}
        aria-label={t("chat.title")}
        title={t("chat.title")}
        className="fab-shift fixed right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full shadow-[0_10px_36px_-6px_rgba(0,0,0,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-acc-1/70"
        style={
          {
            bottom: "max(1.25rem, env(safe-area-inset-bottom))",
            background: "var(--acc-1)",
            color: "#ffffff",
          } as React.CSSProperties
        }
      >
        {/* breathing halo ring */}
        {!chatOpen ? (
          <motion.span
            aria-hidden="true"
            animate={{ scale: [1, 1.45], opacity: [0.45, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, var(--acc-1) 0%, transparent 70%)" }}
          />
        ) : null}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={chatOpen ? "x" : "bot"}
            initial={{ opacity: 0, scale: 0.4, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.4, rotate: 90 }}
            transition={{ duration: 0.16 }}
            className="relative flex items-center justify-center"
          >
            {chatOpen ? <X size={22} /> : <MessageSquare size={22} />}
          </motion.span>
        </AnimatePresence>
        {!chatOpen ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#06131c] bg-emerald-400" />
          </span>
        ) : null}
      </motion.button>

      {/* panel */}
      <AnimatePresence>
        {chatOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed inset-x-2 z-[80] origin-bottom-right sm:inset-x-auto sm:right-5"
            style={{ bottom: "calc(max(1.25rem, env(safe-area-inset-bottom)) + 3.75rem)" }}
          >
            <GlassCard strong className="chat-tail flex h-[30rem] max-h-[68vh] flex-col overflow-hidden rounded-3xl sm:w-[23rem]">
              {/* header */}
              <div className="flex items-center gap-3 border-b border-border/60 p-4">
                <span
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ background: "linear-gradient(135deg, var(--acc-1), var(--acc-2))" }}
                >
                  <Bot size={19} />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0f1e] bg-emerald-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    <Tx text={cfg.botName} />
                  </p>
                  <p className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                    <span className={cn("dot-live", sync !== "online" && "!bg-amber-400 !shadow-amber-400")} />
                    {sync === "online" ? "online" : t("sync.local")}
                  </p>
                </div>
              </div>

              {/* messages */}
              <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                        m.role === "user"
                          ? "rounded-br-sm text-white"
                          : "glass rounded-bl-sm",
                      )}
                      style={
                        m.role === "user"
                          ? { background: "linear-gradient(135deg, var(--acc-1), var(--acc-2))", color: "#071018" }
                          : undefined
                      }
                    >
                      {m.content}
                    </div>
                  </motion.div>
                ))}

                {typing ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="glass flex items-center gap-1.5 rounded-2xl rounded-bl-sm px-4 py-3">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.7, repeat: Infinity, delay: d * 0.15 }}
                          className="h-1.5 w-1.5 rounded-full bg-acc-1"
                        />
                      ))}
                      <span className="ml-1 text-[10px] text-muted-foreground">{t("chat.typing")}</span>
                    </div>
                  </motion.div>
                ) : null}
              </div>

              {/* quick actions */}
              {cfg.quickActions?.length ? (
                <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 pb-2">
                  {cfg.quickActions.slice(0, 4).map((qa) => (
                    <button
                      key={qa.id}
                      onClick={() => void send(qa.message)}
                      className="glass shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-all hover:border-acc-1/50 hover:text-foreground"
                    >
                      <Tx text={qa.label} />
                    </button>
                  ))}
                </div>
              ) : null}

              {/* input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
                className="flex items-center gap-2 border-t border-border/60 p-3"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("chat.placeholder")}
                  aria-label={t("chat.placeholder")}
                  className="field flex-1 !rounded-full !py-2.5 text-[13px]"
                />
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  disabled={!input.trim() || typing}
                  aria-label="Send message"
                  className="btn-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
                >
                  <Send size={15} />
                </motion.button>
              </form>
            </GlassCard>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
