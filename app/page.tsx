import { FeatureSection } from "@/components/landing/feature-section";
import { HeroSection } from "@/components/landing/hero-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <HeroSection />
        <FeatureSection />
      </main>
      <SiteFooter />
    </>
  );
}
