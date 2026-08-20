import { AuthForm } from "@/components/auth/auth-form";

type AuthShellProps = {
  callbackUrl: string;
  mode: "login" | "register";
};

const flowSteps = [
  {
    description: "作为商品创作的起点",
    title: "上传商品图",
  },
  {
    description: "识别类别、用户和卖点",
    title: "AI 商品分析",
  },
  {
    description: "生成标题、卖点、图片和场景图",
    title: "上架文案与商品图",
  },
  {
    description: "汇总为可复制、可下载的 Markdown 素材包",
    title: "素材包整理",
  },
];

export function AuthShell({ callbackUrl, mode }: AuthShellProps) {
  const isRegister = mode === "register";

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-brand-panel">
          <div className="auth-brand-copy">
            <p className="auth-brand-eyebrow">CLOUDAI WORKSPACE</p>
            <h1>从一张商品图开始</h1>
            <p>上传商品图，CloudAI 会帮你完成商品策划、上架文案、商品图精修、商品套图和 Markdown 商品素材包。</p>
          </div>

          <div className="auth-flow-preview" aria-label="CloudAI 商品创作流程">
            {flowSteps.map((step, index) => (
              <article className={index === 1 ? "auth-flow-step active" : "auth-flow-step"} key={step.title}>
                <span className="auth-flow-step-index">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <section className="auth-card glass-card">
          <p className="eyebrow">CloudAI Account</p>
          <h1>{isRegister ? "注册 CloudAI" : "登录 CloudAI"}</h1>
          <p>{isRegister ? "创建一个轻量账号，开始体验 AI 商品创作工作台。" : "进入你的 AI 商品创作工作台，继续生成商品分析、文案、图片和素材包。"}</p>
          <AuthForm callbackUrl={callbackUrl} mode={mode} />
        </section>
      </section>
    </main>
  );
}
