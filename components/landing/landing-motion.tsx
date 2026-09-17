"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = "[data-landing-reveal]";
const ENTERED_CLASS = "is-motion-entered";
const HERO_PLAYING_CLASS = "is-hero-motion-playing";
const HERO_COMPLETE_CLASS = "is-hero-motion-complete";
const HERO_OFFSCREEN_CLASS = "is-hero-offscreen";

export function LandingMotion() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".landing-page");
    if (!page) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const revealElements = Array.from(page.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      return;
    }

    page.classList.add("landing-motion-enhanced");

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const element = entry.target as HTMLElement;
          element.classList.add(ENTERED_CLASS);
          revealObserver.unobserve(element);
        });
      },
      {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.15,
      },
    );

    revealElements.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight * 0.88) {
        return;
      }

      revealObserver.observe(element);
    });

    const hero = page.querySelector<HTMLElement>("[data-landing-hero-motion]");
    const heroMotionViewport = window.matchMedia("(min-width: 700px)");
    let heroObserver: IntersectionObserver | undefined;
    let heroIsVisible = false;
    let heroHasPlayed = false;

    const startHeroMotion = () => {
      if (
        !hero ||
        heroHasPlayed ||
        !heroIsVisible ||
        !heroMotionViewport.matches ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      heroHasPlayed = true;
      hero.classList.add(HERO_PLAYING_CLASS);
    };

    const handleHeroAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName !== "landing-hero-frame-build") {
        return;
      }

      hero?.classList.remove(HERO_PLAYING_CLASS);
      hero?.classList.add(HERO_COMPLETE_CLASS);
    };

    if (hero) {
      hero.addEventListener("animationend", handleHeroAnimationEnd);
      heroMotionViewport.addEventListener("change", startHeroMotion);
      heroObserver = new IntersectionObserver(
        ([entry]) => {
          heroIsVisible = entry.isIntersecting;
          hero.classList.toggle(HERO_OFFSCREEN_CLASS, !heroIsVisible);
          startHeroMotion();
        },
        { threshold: 0.2 },
      );
      heroObserver.observe(hero);
    }

    const header = page.querySelector<HTMLElement>(".landing-header");
    let headerFrame: number | undefined;

    const updateHeader = () => {
      headerFrame = undefined;
      header?.classList.toggle("is-scrolled", window.scrollY > 16);
    };

    const handleScroll = () => {
      if (headerFrame === undefined) {
        headerFrame = window.requestAnimationFrame(updateHeader);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    updateHeader();

    const handleVisibilityChange = () => {
      page.classList.toggle("is-motion-paused", document.visibilityState === "hidden");
      startHeroMotion();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    handleVisibilityChange();

    return () => {
      revealObserver.disconnect();
      heroObserver?.disconnect();
      hero?.removeEventListener("animationend", handleHeroAnimationEnd);
      heroMotionViewport.removeEventListener("change", startHeroMotion);
      window.removeEventListener("scroll", handleScroll);
      if (headerFrame !== undefined) {
        window.cancelAnimationFrame(headerFrame);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      page.classList.remove("landing-motion-enhanced", "is-motion-paused");
      hero?.classList.remove(HERO_PLAYING_CLASS, HERO_COMPLETE_CLASS, HERO_OFFSCREEN_CLASS);
    };
  }, []);

  return null;
}
