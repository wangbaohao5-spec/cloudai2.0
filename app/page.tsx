import { auth } from "@/auth";
import { FeatureSection } from "@/components/landing/feature-section";
import { HeroSection } from "@/components/landing/hero-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import "@/components/landing/landing.css";

export default async function HomePage() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#landing-main">
        跳到主要内容
      </a>
      <SiteHeader isAuthenticated={isAuthenticated} />
      <main id="landing-main">
        <HeroSection isAuthenticated={isAuthenticated} />
        {/* An approved real-product case will be inserted here in B10-3. */}
        <FeatureSection isAuthenticated={isAuthenticated} />
      </main>
      <SiteFooter isAuthenticated={isAuthenticated} />
    </div>
  );
}
