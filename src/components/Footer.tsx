"use client";

/* ============================================================
 * EzFameNp — glass footer with dynamic links from admin panel
 * ============================================================ */

import { Mail, MessageCircle, Send, Youtube, Instagram, Facebook } from "lucide-react";
import { Logo, PayGlyph } from "@/components/icons";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/data";
import { useUI } from "@/lib/store";
import { HashLink } from "@/lib/router";

function SocialButton({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) return null;
  const external = href.startsWith("http") || href.includes("@");
  return (
    <a
      href={href.includes("@") && !href.startsWith("http") ? `mailto:${href}` : href}
      target={external && !href.includes("@") ? "_blank" : undefined}
      rel="noreferrer noopener"
      aria-label={label}
      className="glass glass-hover flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:text-acc-1"
    >
      {children}
    </a>
  );
}

export function Footer() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const { currency } = useUI();
  const { social } = settings;
  const rate = settings.exchangeRate;

  return (
    <footer className="relative z-10 mt-auto pb-safe">
      <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <div className="glass mb-8 flex flex-wrap items-center justify-center gap-3 rounded-2xl px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("footer.payments")}
          </span>
          {settings.payments.esewa.enabled ? <PayGlyph method="esewa" size={30} /> : null}
          {settings.payments.khalti.enabled ? <PayGlyph method="khalti" size={30} /> : null}
          {settings.payments.bank.enabled ? <PayGlyph method="bank" size={22} className="text-acc-1" /> : null}
          {settings.payments.crypto.enabled ? <PayGlyph method="crypto" size={22} className="text-acc-2" /> : null}
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            · 1 USD = {rate.toFixed(2)} NPR ({currency === "NPR" ? "live rate" : "switch to रु for NPR"})
          </span>
        </div>

        <div className="grid gap-10 px-2 py-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <Logo size={30} />
              <span className="font-[family-name:var(--f-display)] text-base font-bold tracking-wider text-gradient">
                {settings.siteName}
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{t("footer.about")}</p>
            <div className="flex gap-2 pt-1">
              <SocialButton href={social.telegram} label="Telegram">
                <Send size={16} />
              </SocialButton>
              <SocialButton href={social.whatsapp} label="WhatsApp">
                <MessageCircle size={16} />
              </SocialButton>
              <SocialButton href={social.instagram} label="Instagram">
                <Instagram size={16} />
              </SocialButton>
              <SocialButton href={social.facebook} label="Facebook">
                <Facebook size={16} />
              </SocialButton>
              <SocialButton href={social.youtube} label="YouTube">
                <Youtube size={16} />
              </SocialButton>
              <SocialButton href={social.email} label="Email">
                <Mail size={16} />
              </SocialButton>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("footer.links")}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <HashLink to="/" className="text-muted-foreground transition-colors hover:text-acc-1">
                  {t("nav.home")}
                </HashLink>
              </li>
              <li>
                <HashLink to="/orders" className="text-muted-foreground transition-colors hover:text-acc-1">
                  {t("nav.orders")}
                </HashLink>
              </li>
              <li>
                <HashLink to="/account" className="text-muted-foreground transition-colors hover:text-acc-1">
                  {t("nav.account")}
                </HashLink>
              </li>
              <li>
                <HashLink to="/login" className="text-muted-foreground transition-colors hover:text-acc-1">
                  {t("nav.login")}
                </HashLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("footer.support")}
            </h4>
            <ul className="space-y-2 text-sm">
              {social.telegram ? (
                <li>
                  <a href={social.telegram} target="_blank" rel="noreferrer noopener" className="text-muted-foreground transition-colors hover:text-acc-1">
                    Telegram — {settings.supportHours ?? "24/7"}
                  </a>
                </li>
              ) : null}
              {social.whatsapp ? (
                <li>
                  <a href={social.whatsapp} target="_blank" rel="noreferrer noopener" className="text-muted-foreground transition-colors hover:text-acc-1">
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {social.email ? (
                <li>
                  <a href={`mailto:${social.email}`} className="text-muted-foreground transition-colors hover:text-acc-1">
                    {social.email}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("footer.payments")}
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>eSewa · Khalti · Bank Transfer</li>
              <li>USDT (TRC-20) · Bitcoin</li>
              <li className="font-mono text-xs">Rate: $1 = {rate.toFixed(2)} रु</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.siteName}. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
