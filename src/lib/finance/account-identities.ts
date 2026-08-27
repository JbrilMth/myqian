export interface AccountIdentity {
  brandKey: string;
  displayName: string;
  dotColor: string; // Tailwind background color class for the subtle dot
  borderAccent: string; // Subtle left border accent for cards
  badgeClass: string; // Light & dark badge class
  iconBg: string; // Subtle icon container background
  textColor: string; // Subtle brand text color
}

/**
 * Registry of recognized financial institutions & payment channels
 * with subtle, restrained identity colors.
 */
export const ACCOUNT_IDENTITIES: Record<string, AccountIdentity> = {
  wechat: {
    brandKey: "wechat",
    displayName: "WeChat Pay",
    dotColor: "bg-emerald-500",
    borderAccent: "border-l-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
    textColor: "text-emerald-700 dark:text-emerald-300",
  },
  alipay: {
    brandKey: "alipay",
    displayName: "Alipay",
    dotColor: "bg-sky-500",
    borderAccent: "border-l-sky-500",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
    iconBg: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400",
    textColor: "text-sky-700 dark:text-sky-300",
  },
  icbc: {
    brandKey: "icbc",
    displayName: "ICBC",
    dotColor: "bg-rose-500",
    borderAccent: "border-l-rose-500",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
    iconBg: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
    textColor: "text-rose-700 dark:text-rose-300",
  },
  cih: {
    brandKey: "cih",
    displayName: "CIH Bank",
    dotColor: "bg-orange-500",
    borderAccent: "border-l-orange-500",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
    iconBg: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400",
    textColor: "text-orange-700 dark:text-orange-300",
  },
  attijari: {
    brandKey: "attijari",
    displayName: "Attijariwafa Bank",
    dotColor: "bg-amber-500",
    borderAccent: "border-l-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    iconBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
    textColor: "text-amber-700 dark:text-amber-300",
  },
  cash: {
    brandKey: "cash",
    displayName: "Cash",
    dotColor: "bg-zinc-500",
    borderAccent: "border-l-zinc-400 dark:border-l-zinc-500",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    iconBg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300",
    textColor: "text-zinc-700 dark:text-zinc-300",
  },
  default: {
    brandKey: "default",
    displayName: "Account",
    dotColor: "bg-zinc-400",
    borderAccent: "border-l-zinc-300 dark:border-l-zinc-700",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    iconBg: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300",
    textColor: "text-zinc-700 dark:text-zinc-300",
  },
};

/**
 * Resolves subtle visual identity cues based on account name and account type.
 */
export function getAccountIdentity(
  name?: string | null,
  type?: string | null
): AccountIdentity {
  if (!name && !type) return ACCOUNT_IDENTITIES.default;

  const n = (name || "").toLowerCase();
  const t = (type || "").toLowerCase();

  // 1. WeChat
  if (n.includes("wechat") || n.includes("微信") || n.includes("wx")) {
    return ACCOUNT_IDENTITIES.wechat;
  }

  // 2. Alipay
  if (n.includes("alipay") || n.includes("支付宝") || n.includes("zfb")) {
    return ACCOUNT_IDENTITIES.alipay;
  }

  // 3. ICBC
  if (n.includes("icbc") || n.includes("工商") || n.includes("工行")) {
    return ACCOUNT_IDENTITIES.icbc;
  }

  // 4. CIH
  if (n.includes("cih")) {
    return ACCOUNT_IDENTITIES.cih;
  }

  // 5. Attijariwafa
  if (n.includes("attijari") || n.includes("wafa") || n.includes("awb")) {
    return ACCOUNT_IDENTITIES.attijari;
  }

  // 6. Cash
  if (t === "cash" || n.includes("cash") || n.includes("现金") || n.includes("espèces")) {
    return ACCOUNT_IDENTITIES.cash;
  }

  return ACCOUNT_IDENTITIES.default;
}
