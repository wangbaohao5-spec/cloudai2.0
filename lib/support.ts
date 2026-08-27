export const SUPPORT_FEEDBACK_SUBJECT = "CloudAI Beta Feedback";

export const SUPPORT_FEEDBACK_TEMPLATE = `问题类型：
发生页面：
操作步骤：
预期结果：
实际结果：
大概发生时间：
商品名称 / History ID（如方便）：`;

export const SUPPORT_FEEDBACK_GUIDANCE = [
  "遇到问题的页面",
  "操作步骤和实际结果",
  "问题发生的大概时间",
  "相关截图",
  "商品名称或 History ID（如方便）",
] as const;

type SupportContactInput = {
  email?: string;
  qq?: string;
  wechat?: string;
};

function normalizeContactValue(value?: string) {
  return value?.trim() || "";
}

function isValidSupportEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getSupportContact(input: SupportContactInput) {
  const emailCandidate = normalizeContactValue(input.email);
  const email = isValidSupportEmail(emailCandidate) ? emailCandidate : "";
  const qq = normalizeContactValue(input.qq);
  const wechat = normalizeContactValue(input.wechat);
  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent(SUPPORT_FEEDBACK_SUBJECT)}&body=${encodeURIComponent(
        SUPPORT_FEEDBACK_TEMPLATE,
      )}`
    : null;

  return {
    email,
    hasAnyContact: Boolean(email || qq || wechat),
    mailto,
    qq,
    wechat,
  };
}
