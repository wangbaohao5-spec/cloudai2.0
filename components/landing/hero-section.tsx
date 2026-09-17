import { EditorialFrameHero } from "@/components/landing/editorial-frame-hero";
import Link from "next/link";

type HeroSectionProps = {
  isAuthenticated: boolean;
};

export function HeroSection({ isAuthenticated }: HeroSectionProps) {
  return (
    <section id="hero" className="landing-hero" aria-labelledby="landing-hero-title">
      <div className="landing-shell landing-hero-inner">
        <div className="landing-hero-copy">
          <p className="landing-status">封闭内测 · 仅向受邀用户开放</p>
          <h1 id="landing-hero-title">AI 电商商品上架内容工作台</h1>
          <p className="landing-hero-description">
            从一张商品图开始，先分析商品、确认卖点，再制作上架文案与商品图片，逐步完成套图和详情页。所有内容围绕同一个商品，在同一工作区整理并继续创作。
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-button landing-button-primary" href={isAuthenticated ? "/dashboard/products" : "#product"}>
              {isAuthenticated ? "进入工作台" : "查看产品"}
            </Link>
            <Link className="landing-button landing-button-secondary" href={isAuthenticated ? "#workflow" : "/login"}>
              {isAuthenticated ? "了解工作流" : "已有内测账号？登录"}
            </Link>
          </div>
        </div>

        <figure className="landing-context-map" aria-labelledby="landing-context-caption">
          <figcaption id="landing-context-caption">
            <span>产品结构说明</span>
            <strong>一个商品，一条持续的内容工作流</strong>
          </figcaption>
          <EditorialFrameHero />
          <p>结构示意，不代表具体商品生成结果。</p>
        </figure>
      </div>
    </section>
  );
}
