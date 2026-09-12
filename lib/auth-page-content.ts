import { BRAND } from "@/lib/brand";

export const CLOSED_BETA_REGISTRATION_CONTENT = {
  eyebrow: "CLOSED BETA",
  title: `${BRAND.name} 封闭内测`,
  description: `${BRAND.name} 目前处于封闭内测阶段，当前暂未开放自助注册。`,
  actionLabel: "已有测试账号，前往登录",
  actionHref: "/login",
  registrationEnabled: false,
} as const;
