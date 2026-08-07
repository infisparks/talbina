"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { event as fbEvent, customEvent as fbCustomEvent, getPreservedQueryString } from "@/lib/fpixel";
import { BookingModal } from "@/components/BookingModal";

function URLParamsHandler({
  onConfigureBooking,
}: {
  onConfigureBooking: (config: {
    isOpen: boolean;
    step: 1 | 2 | 3 | 4;
    leadId: string | null;
    createdDate: string | null;
    campaignName: string | null;
  }) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pathname = window.location.pathname;
    const stepParam = searchParams.get("step");
    const bookingParam =
      searchParams.get("booking") ||
      searchParams.get("book") ||
      searchParams.get("form") ||
      searchParams.get("openBooking");
    const leadIdParam = searchParams.get("leadId");
    const createdDateParam = searchParams.get("createdDate");
    const campaignParam = searchParams.get("campaign");

    let targetStep: 1 | 2 | 3 | 4 | null = null;

    if (pathname === "/detail" || pathname === "/form") targetStep = 1;
    else if (pathname === "/survey" || pathname === "/survery") targetStep = 2;
    else if (pathname === "/meeting") targetStep = 3;
    else if (pathname === "/success") targetStep = 4;
    else if (stepParam === "survey" || stepParam === "survery" || stepParam === "2") targetStep = 2;
    else if (stepParam === "meeting" || stepParam === "3") targetStep = 3;
    else if (stepParam === "4" || stepParam === "success") targetStep = 4;
    else if (stepParam === "1" || stepParam === "contact" || stepParam === "detail" || stepParam === "form" || stepParam === "book" || bookingParam) targetStep = 1;
    else if (campaignParam) targetStep = 1;

    if (targetStep !== null) {
      onConfigureBooking({
        isOpen: true,
        step: targetStep,
        leadId: leadIdParam,
        createdDate: createdDateParam,
        campaignName: campaignParam || "talbina",
      });
    }
  }, [searchParams]);

  return null;
}

export default function Home({
  defaultStep,
  defaultOpen = false,
}: {
  defaultStep?: 1 | 2 | 3 | 4;
  defaultOpen?: boolean;
} = {}) {
  const [bookingConfig, setBookingConfig] = useState<{
    isOpen: boolean;
    step: 1 | 2 | 3 | 4;
    leadId: string | null;
    createdDate: string | null;
    campaignName: string | null;
  }>({
    isOpen: defaultOpen || !!defaultStep,
    step: defaultStep || 1,
    leadId: null,
    createdDate: null,
    campaignName: "talbina",
  });

  const [showStickyBar, setShowStickyBar] = useState(false);
  const heroSectionRef = useRef<HTMLElement>(null);

  // Dispatch initial PageView via Meta Browser Pixel and Node.js CAPI
  useEffect(() => {
    if (typeof window === "undefined") return;

    const serverUrl = (process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || "https://first.infiplus.in").replace(/\/$/, "");
    const params = new URLSearchParams(window.location.search);
    const testCode = params.get("test_event_code") || params.get("fbtest") || undefined;

    fetch(`${serverUrl}/api/whatsapp/capi-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "PageView",
        eventSourceUrl: window.location.href,
        testEventCode: testCode,
      }),
    }).catch(() => {});
  }, []);

  // Intersection observer for sticky mobile bottom CTA bar
  useEffect(() => {
    const heroEl = heroSectionRef.current;
    if (!heroEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setShowStickyBar(!entry.isIntersecting);
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(heroEl);
    return () => observer.disconnect();
  }, []);

  const handleOpenBooking = useCallback(() => {
    if (typeof window !== "undefined") {
      const preserved = getPreservedQueryString();
      window.history.pushState({}, "", "/detail" + preserved);
    }

    fbEvent("ViewContent", {
      content_name: "Talbina Apply CTA Click",
    });
    fbCustomEvent("ButtonClick", {
      button_name: "Distributor Partnership Apply CTA",
    });

    setBookingConfig({
      isOpen: true,
      step: 1,
      leadId: null,
      createdDate: null,
      campaignName: "talbina",
    });
  }, []);

  const handleCloseBooking = useCallback(() => {
    if (typeof window !== "undefined") {
      const preserved = getPreservedQueryString();
      window.history.pushState({}, "", "/" + preserved);
    }

    setBookingConfig({
      isOpen: false,
      step: 1,
      leadId: null,
      createdDate: null,
      campaignName: "talbina",
    });
  }, []);

  const handleConfigureBooking = useCallback(
    (config: {
      isOpen: boolean;
      step: 1 | 2 | 3 | 4;
      leadId: string | null;
      createdDate: string | null;
      campaignName: string | null;
    }) => {
      setBookingConfig((prev) => {
        if (
          prev.isOpen === config.isOpen &&
          prev.step === config.step &&
          prev.leadId === config.leadId &&
          prev.createdDate === config.createdDate &&
          prev.campaignName === config.campaignName
        ) {
          return prev;
        }
        return config;
      });
    },
    []
  );

  return (
    <div className="w-full text-gray-800 bg-[#FAF7ED] min-h-screen antialiased bg-luxury-pattern font-sans pb-20 md:pb-0">
      <Suspense fallback={null}>
        <URLParamsHandler onConfigureBooking={handleConfigureBooking} />
      </Suspense>

      {/* 1. TOP ANNOUNCEMENT BAR */}
      <header className="bg-gradient-to-r from-[#052213] via-[#08321D] to-[#052213] text-white text-[11px] sm:text-xs md:text-sm py-2.5 px-3 text-center font-medium tracking-wide sticky top-0 z-40 shadow-lg border-b border-amber-400/20">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
            <svg className="w-3.5 h-3.5 text-amber-300 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            Earn Up To 50% Margin
          </span>
          <span className="text-amber-400/40 font-light">|</span>
          <span className="text-amber-100">Direct Company Supply</span>
          <span className="text-amber-400/40 font-light">|</span>
          <span className="text-amber-200">Growing Health Food Category</span>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-3xl mx-auto bg-[#FAF7ED] min-h-screen shadow-2xl relative border-x border-amber-900/10">

        {/* 2. HERO SECTION */}
        <section ref={heroSectionRef} id="heroSection" className="px-4 sm:px-6 pt-4 pb-6 sm:py-8 text-center flex flex-col items-center">
          {/* Top Tag Badge */}
          <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-md border border-amber-400/60 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#052213] tracking-wider uppercase mb-2 sm:mb-3 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-amber-800">BUSINESS OPPORTUNITY 2026</span>
          </div>

          {/* PRODUCT DISPLAY VISUAL CARD */}
          <div className="w-full relative my-2 sm:my-4 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 sm:border-4 border-white bg-gradient-to-b from-amber-100/80 via-amber-50/50 to-emerald-950/20 p-2 sm:p-4 transition-all">
            <div className="absolute -top-16 -left-16 w-44 h-44 bg-amber-300/40 rounded-full blur-3xl pointer-events-none glow-effect"></div>
            <div className="absolute -bottom-16 -right-16 w-44 h-44 bg-emerald-500/30 rounded-full blur-3xl pointer-events-none glow-effect"></div>

            {/* Floating Highlights */}
            <div className="absolute top-3 left-3 z-10 hidden sm:flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#08321D] shadow-md border border-emerald-200">
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              100% Natural Formula
            </div>
            <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-1.5 bg-amber-400/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-extrabold text-[#052213] shadow-md border border-amber-300">
              <svg className="w-3.5 h-3.5 text-[#052213]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-1.348l-6 5a1 1 0 00-.312.82c.032.55.19 1.08.45 1.571a8 8 0 1013.882-6.223 1 1 0 00-1.57-1.28L12.395 2.553z" clipRule="evenodd"/>
              </svg>
              High Demand Product
            </div>

            {/* Product Hero Image */}
            <div className="relative w-full max-w-md mx-auto rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border border-amber-400/40 group">
              <img src="/hero.png" alt="Aetmaad Talbina Hero Product" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          </div>

          {/* Headline & Subheadline */}
          <div className="w-full max-w-xl mx-auto my-2 sm:my-3">
            <h1 className="text-lg sm:text-3xl md:text-4xl font-black text-[#052213] leading-snug sm:leading-tight tracking-tight mb-2">
              Talbina Ke Authorized Distributor Baniye Aur <span className="text-[#B88D32] underline decoration-amber-400/60 decoration-wavy decoration-1">Fast Growing Health Food Category</span> Mein Apna Business Expand Kijiye
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-gray-700 font-medium leading-relaxed">
              <strong className="text-[#052213] font-bold bg-amber-100/80 px-2 py-0.5 rounded">50% Distributor Margin</strong> | Direct Company Supply | Premium Natural Product
            </p>
          </div>

          {/* Key Stats Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 my-2 py-2 sm:py-3 w-full border-y border-amber-900/10">
            <div className="bg-white/90 backdrop-blur-sm p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-amber-300/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-lg sm:text-3xl font-black text-[#052213]">50%</div>
              <div className="text-[9px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider">MARGIN</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-amber-300/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-lg sm:text-3xl font-black text-[#052213]">₹300</div>
              <div className="text-[9px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider">MRP</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-amber-300/60 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-lg sm:text-3xl font-black text-[#052213]">100%</div>
              <div className="text-[9px] sm:text-xs font-bold text-amber-900 uppercase tracking-wider">NATURAL</div>
            </div>
          </div>

          {/* Main Distributor CTA Button */}
          <div className="w-full mt-3 mb-1">
            <button
              onClick={handleOpenBooking}
              className="w-full btn-shimmer text-[#052213] font-black text-sm sm:text-base py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-gold-glow border border-amber-200 transition-all transform active:scale-95 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>🤝</span>
              <span>Distributor Partnership Ke Liye Apply Karein</span>
              <svg className="w-4 h-4 text-[#052213] group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </button>
          </div>
        </section>

        {/* 3. CHALLENGES SECTION */}
        <section className="px-4 sm:px-6 py-9 bg-[#FAF7ED] relative border-t border-amber-900/10">
          <div className="text-center mb-6">
            <span className="inline-block bg-[#D7F2E3] text-[#08321D] border border-emerald-300/60 font-bold text-[10px] sm:text-xs px-4 py-1 rounded-full uppercase tracking-wider mb-2 shadow-sm">
              CHALLENGES
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#052213] leading-snug">
              Kya Aap Bhi In Challenges Ka Samna Kar Rahe Hain?
            </h2>
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <div className="bg-[#FDF7E2] p-4 rounded-2xl border border-amber-300/70 flex items-start gap-3.5 shadow-sm hover:shadow-md transition-all">
              <div className="w-6 h-6 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-600 font-extrabold text-xs shrink-0 mt-0.5">✕</div>
              <p className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed">
                Market mein naye products aate hain lekin <span className="text-[#DC2626] font-bold bg-red-50 px-1.5 py-0.5 rounded">demand create nahi hoti</span>
              </p>
            </div>

            <div className="bg-[#FDF7E2] p-4 rounded-2xl border border-amber-300/70 flex items-start gap-3.5 shadow-sm hover:shadow-md transition-all">
              <div className="w-6 h-6 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-600 font-extrabold text-xs shrink-0 mt-0.5">✕</div>
              <p className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed">
                <span className="text-[#DC2626] font-bold bg-red-50 px-1.5 py-0.5 rounded">Low margin products</span> profit ko limit kar dete hain
              </p>
            </div>

            <div className="bg-[#FDF7E2] p-4 rounded-2xl border border-amber-300/70 flex items-start gap-3.5 shadow-sm hover:shadow-md transition-all">
              <div className="w-6 h-6 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-600 font-extrabold text-xs shrink-0 mt-0.5">✕</div>
              <p className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed">
                Kai brands distributors appoint karte hain lekin <span className="text-[#DC2626] font-bold bg-red-50 px-1.5 py-0.5 rounded">support nahi dete</span>
              </p>
            </div>

            <div className="bg-[#FDF7E2] p-4 rounded-2xl border border-amber-300/70 flex items-start gap-3.5 shadow-sm hover:shadow-md transition-all">
              <div className="w-6 h-6 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-600 font-extrabold text-xs shrink-0 mt-0.5">✕</div>
              <p className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed">
                Inventory stock mein pada rehta hai aur <span className="text-[#DC2626] font-bold bg-red-50 px-1.5 py-0.5 rounded">capital block</span> ho jaata hai
              </p>
            </div>

            <div className="bg-[#FDF7E2] p-4 rounded-2xl border border-amber-300/70 flex items-start gap-3.5 shadow-sm hover:shadow-md transition-all">
              <div className="w-6 h-6 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-600 font-extrabold text-xs shrink-0 mt-0.5">✕</div>
              <p className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed">
                Retailers <span className="text-[#DC2626] font-bold bg-red-50 px-1.5 py-0.5 rounded">repeat orders</span> nahi dete
              </p>
            </div>

            <div className="bg-[#FDF7E2] p-4 rounded-2xl border border-amber-300/70 flex items-start gap-3.5 shadow-sm hover:shadow-md transition-all">
              <div className="w-6 h-6 rounded-full bg-red-100 border border-red-300 flex items-center justify-center text-red-600 font-extrabold text-xs shrink-0 mt-0.5">✕</div>
              <p className="text-xs sm:text-sm text-gray-800 font-medium leading-relaxed">
                Market mein alag aur profitable <span className="text-[#DC2626] font-bold bg-red-50 px-1.5 py-0.5 rounded">products dhoondhna mushkil</span> ho gaya hai
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-amber-300/80 text-center italic text-xs sm:text-sm text-gray-700 font-medium max-w-md mx-auto leading-relaxed shadow-sm">
            "Agar inme se koi bhi challenge aapke business mein hai, to shayad aapko ek better category aur stronger product portfolio ki zarurat hai."
          </div>
        </section>

        {/* 4. OPPORTUNITY SECTION */}
        <section className="px-4 sm:px-6 py-10 bg-gradient-to-b from-[#052213] via-[#08321D] to-[#052213] text-white relative">
          <div className="max-w-md mx-auto mb-6 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-400/40 bg-[#052213] group">
            <img src="/Nourishing Food for Mind & Body.png" alt="Aetmaad Talbina - Nourishing Food for Mind & Body" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>

          <div className="text-center mb-6">
            <span className="inline-block bg-[#0E462A] text-amber-300 border border-amber-400/40 font-bold text-[10px] sm:text-xs px-4 py-1 rounded-full uppercase tracking-wider mb-2">
              OPPORTUNITY
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-snug">
              Kyun Talbina Aapke Portfolio Mein Ek <span className="text-gold-gradient">Strong Addition</span> Ban Sakta Hai?
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/90 mt-3 font-normal max-w-md mx-auto leading-relaxed">
              Health aur wellness products ki demand Bharat mein tezi se badh rahi hai. Aaj consumers:
            </p>
          </div>

          <div className="space-y-3 max-w-xl mx-auto">
            <div className="bg-[#0E462A]/90 backdrop-blur-sm p-4 rounded-2xl border border-emerald-500/40 flex items-center gap-3.5 shadow-md hover:border-amber-400/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#052213] border border-amber-400/40 flex items-center justify-center text-amber-300 text-lg shrink-0 shadow-inner">🍃</div>
              <p className="text-xs sm:text-sm text-emerald-50 font-medium">
                Natural & healthy food products ko prefer kar rahe hain
              </p>
            </div>

            <div className="bg-[#0E462A]/90 backdrop-blur-sm p-4 rounded-2xl border border-emerald-500/40 flex items-center gap-3.5 shadow-md hover:border-amber-400/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#052213] border border-amber-400/40 flex items-center justify-center text-amber-300 text-lg shrink-0 shadow-inner">🛡️</div>
              <p className="text-xs sm:text-sm text-emerald-50 font-medium">
                Sugar-free options dhoond rahe hain
              </p>
            </div>

            <div className="bg-[#0E462A]/90 backdrop-blur-sm p-4 rounded-2xl border border-emerald-500/40 flex items-center gap-3.5 shadow-md hover:border-amber-400/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#052213] border border-amber-400/40 flex items-center justify-center text-amber-300 text-lg shrink-0 shadow-inner">🎯</div>
              <p className="text-xs sm:text-sm text-emerald-50 font-medium">
                Daily nutrition products prefer kar rahe hain
              </p>
            </div>

            <div className="bg-[#0E462A]/90 backdrop-blur-sm p-4 rounded-2xl border border-emerald-500/40 flex items-center gap-3.5 shadow-md hover:border-amber-400/50 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#052213] border border-amber-400/40 flex items-center justify-center text-amber-300 text-lg shrink-0 shadow-inner">✨</div>
              <p className="text-xs sm:text-sm text-emerald-50 font-medium">
                Preventive health par focus kar rahe hain
              </p>
            </div>
          </div>

          <div className="mt-6 text-center font-bold text-xs sm:text-sm text-amber-300 tracking-wide">
            ⚡ Talbina is growing demand ko target karta hai.
          </div>
        </section>

        {/* 5. PRODUCT EXPLANATION SECTION */}
        <section className="px-4 sm:px-6 py-10 bg-gradient-to-b from-[#052213] via-[#08321D] to-[#052213] text-white relative overflow-hidden border-t border-amber-400/20">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-6 relative z-10">
            <span className="inline-block bg-[#0E462A] text-amber-300 border border-amber-400/40 font-extrabold text-[10px] sm:text-xs px-4 py-1 rounded-full uppercase tracking-wider mb-2.5 shadow-sm">
              PREMIUM HEALTH FORMULA
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black leading-snug tracking-tight">
              Talbina <span className="text-gold-gradient">Kya Hai?</span>
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/90 mt-2 max-w-md mx-auto leading-relaxed font-light">
              Talbina ek <strong className="text-amber-300 font-bold">100% natural nutritional food blend</strong> hai jo traditional barley, dates & rich dry fruits se tayyar kiya gaya hai.
            </p>
          </div>

          <div className="max-w-md mx-auto mb-8 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-400/50 bg-gradient-to-b from-black/60 via-[#052213]/90 to-emerald-950/90 p-4 sm:p-6 text-center relative group backdrop-blur-md">
            <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-amber-900/20 to-black/80 p-4 border border-amber-400/20 shadow-inner flex flex-col items-center">
              <div className="flex justify-between items-center w-full mb-3 text-[10px] sm:text-xs font-bold text-amber-300">
                <span className="bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full tracking-wider uppercase">✨ Net Vol: 250g</span>
                <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-[#052213] px-3 py-1 rounded-full font-black shadow-md">₹300 MRP</span>
              </div>

              <div className="relative my-2 w-full flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/20 via-emerald-400/20 to-amber-300/30 rounded-full blur-2xl pointer-events-none"></div>
                <img src="/talbina.png" alt="Aetmaad Talbina Premium Pack" className="relative z-10 w-48 sm:w-60 h-auto object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-500" />
              </div>

              <div className="w-full grid grid-cols-2 gap-2 mt-4 text-[10px] sm:text-xs font-bold text-emerald-100">
                <div className="bg-emerald-950/80 border border-amber-400/30 py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
                  <span>🌿</span> 100% Sugar-Free
                </div>
                <div className="bg-emerald-950/80 border border-amber-400/30 py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
                  <span>🛡️</span> Zero Preservatives
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto relative z-10">
            <div className="bg-[#0E462A]/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-emerald-500/40 flex items-center gap-3.5 shadow-md hover:border-amber-400/60 transition-all">
              <div className="w-9 h-9 rounded-xl bg-[#052213] border border-amber-400/40 flex items-center justify-center text-amber-300 text-base shrink-0 shadow-inner">✓</div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-bold text-white">Sugar Free Formula</div>
                <div className="text-[10px] sm:text-xs text-amber-100/80">Diabetic-friendly & natural energy</div>
              </div>
            </div>

            <div className="bg-[#0E462A]/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-emerald-500/40 flex items-center gap-3.5 shadow-md hover:border-amber-400/60 transition-all">
              <div className="w-9 h-9 rounded-xl bg-[#052213] border border-amber-400/40 flex items-center justify-center text-amber-300 text-base shrink-0 shadow-inner">✓</div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-bold text-white">No Preservatives</div>
                <div className="text-[10px] sm:text-xs text-amber-100/80">100% pure & unadulterated quality</div>
              </div>
            </div>

            <div className="bg-[#0E462A]/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-emerald-500/40 flex items-center gap-3.5 shadow-md hover:border-amber-400/60 transition-all">
              <div className="w-9 h-9 rounded-xl bg-[#052213] border border-amber-400/40 flex items-center justify-center text-amber-300 text-base shrink-0 shadow-inner">✓</div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-bold text-white">Easy To Prepare</div>
                <div className="text-[10px] sm:text-xs text-amber-100/80">Ready in 2 minutes with milk/water</div>
              </div>
            </div>

            <div className="bg-[#0E462A]/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-emerald-500/40 flex items-center gap-3.5 shadow-md hover:border-amber-400/60 transition-all">
              <div className="w-9 h-9 rounded-xl bg-[#052213] border border-amber-400/40 flex items-center justify-center text-amber-300 text-base shrink-0 shadow-inner">✓</div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-bold text-white">High Repeat Demand</div>
                <div className="text-[10px] sm:text-xs text-amber-100/80">Fast moving health food category</div>
              </div>
            </div>

            <div className="bg-[#0E462A]/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-emerald-500/40 flex items-center gap-3.5 shadow-md hover:border-amber-400/60 transition-all">
              <div className="w-9 h-9 rounded-xl bg-[#052213] border border-amber-400/40 flex items-center justify-center text-amber-300 text-base shrink-0 shadow-inner">✓</div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-bold text-white">For All Age Groups</div>
                <div className="text-[10px] sm:text-xs text-amber-100/80">Kids, adults & elderly nutrition</div>
              </div>
            </div>

            <div className="bg-[#0E462A]/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-emerald-500/40 flex items-center gap-3.5 shadow-md hover:border-amber-400/60 transition-all">
              <div className="w-9 h-9 rounded-xl bg-[#052213] border border-amber-400/40 flex items-center justify-center text-amber-300 text-base shrink-0 shadow-inner">✓</div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-bold text-white">Premium Zip-Lock Pack</div>
                <div className="text-[10px] sm:text-xs text-amber-100/80">Locks aroma & long shelf freshness</div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. DISTRIBUTOR BENEFITS SECTION */}
        <section className="px-4 sm:px-6 py-10 bg-[#FAF7ED] border-t border-amber-900/10">
          <div className="text-center mb-6">
            <span className="inline-block bg-[#D7F2E3] text-[#08321D] border border-emerald-300/60 font-extrabold text-[10px] sm:text-xs px-4 py-1 rounded-full uppercase tracking-wider mb-2 shadow-sm">
              DISTRIBUTOR BENEFITS
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#052213] leading-snug">
              Distributor Partner Ko <span className="text-[#B88D32] underline decoration-amber-400/60 decoration-wavy decoration-1">Kya Milega?</span>
            </h2>
          </div>

          <div className="max-w-xl mx-auto bg-gradient-to-b from-[#052213] via-emerald-950 to-[#052213] text-white p-5 sm:p-7 rounded-3xl border-2 border-amber-400/50 shadow-2xl mb-8 relative overflow-hidden backdrop-blur-md">
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-400/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between gap-2 border-b border-amber-400/20 pb-3 mb-4">
              <div className="flex items-center gap-1.5 text-amber-300 font-extrabold text-[10px] sm:text-xs tracking-widest uppercase">
                <svg className="w-4 h-4 text-amber-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span>HIGH MARGIN PROFITABILITY</span>
              </div>
              <span className="bg-emerald-900/90 text-emerald-300 text-[9px] sm:text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                DIRECT FACTORY RATE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-black/40 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-400/20 text-center">
                <div className="text-[10px] sm:text-xs text-amber-100/70 uppercase font-semibold tracking-wider">MRP (Retail)</div>
                <div className="text-2xl sm:text-3xl font-black text-white my-1">₹300</div>
                <div className="text-[9px] text-gray-400">Consumer Value</div>
              </div>

              <div className="bg-gradient-to-b from-amber-400/10 to-amber-950/40 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-400/40 text-center">
                <div className="text-[10px] sm:text-xs text-amber-300 uppercase font-bold tracking-wider">Distributor Rate</div>
                <div className="text-2xl sm:text-3xl font-black text-gold-gradient my-1">₹150</div>
                <div className="text-[9px] text-amber-200/80 font-medium">50% Off MRP</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 text-[#052213] text-center py-3 px-4 rounded-2xl font-black text-sm sm:text-lg shadow-gold-glow border border-amber-200 tracking-wide flex items-center justify-center gap-2">
              <span>🔥 NET PROFIT: ₹150 PER PACK</span>
              <span className="bg-[#052213] text-amber-300 text-xs px-2.5 py-0.5 rounded-full font-extrabold">50% MARGIN</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-300/60 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-400 transition-all">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm shrink-0 border border-amber-300">💰</div>
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-[#052213]">50% Distributor Margin</div>
                <div className="text-[10px] sm:text-xs text-gray-600">Category-leading high profit return</div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-300/60 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-400 transition-all">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-300">📈</div>
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-[#052213]">Growing Health Food Category</div>
                <div className="text-[10px] sm:text-xs text-gray-600">Tezi se badhti consumer demand</div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-300/60 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-400 transition-all">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm shrink-0 border border-amber-300">🔄</div>
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-[#052213]">Repeat Purchase Potential</div>
                <div className="text-[10px] sm:text-xs text-gray-600">Daily consumable health product</div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-300/60 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-400 transition-all">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-300">🏭</div>
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-[#052213]">Direct Manufacturer Supply</div>
                <div className="text-[10px] sm:text-xs text-gray-600">No middlemen, guaranteed stock</div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-300/60 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-400 transition-all">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm shrink-0 border border-amber-300">💎</div>
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-[#052213]">Premium Product Positioning</div>
                <div className="text-[10px] sm:text-xs text-gray-600">Aetmaad brand trust & packaging</div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-300/60 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:border-amber-400 transition-all">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-300">🚀</div>
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-[#052213]">Long-Term Opportunity</div>
                <div className="text-[10px] sm:text-xs text-gray-600">Sustainable recurring business model</div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. WHY PARTNER WITH US SECTION */}
        <section className="px-4 sm:px-6 py-9 bg-[#FAF7ED] border-t border-amber-900/10">
          <div className="max-w-md mx-auto mb-6 bg-gradient-to-r from-amber-100 via-amber-50 to-emerald-100 p-5 rounded-3xl border border-amber-300 text-center shadow-md">
            <div className="text-xs font-bold text-amber-800 tracking-widest uppercase">STRONG PARTNERSHIPS</div>
            <div className="text-2xl font-black text-[#052213] tracking-tight my-1">STRONGER FUTURE</div>
            <p className="text-[11px] text-gray-600 font-medium">Grow Together. Succeed Together.</p>
            <div className="text-3xl mt-2">🤝 💼 📜</div>
          </div>

          <div className="text-center mb-6">
            <span className="inline-block bg-[#D7F2E3] text-[#08321D] font-bold text-[10px] sm:text-xs px-4 py-1 rounded-full uppercase tracking-wider mb-2 shadow-sm">
              WHY PARTNER WITH US
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-[#052213] leading-snug">
              Sirf Product Nahi, Ek Long-Term Partnership
            </h2>

            <div className="text-xs sm:text-sm text-gray-700 mt-3 max-w-md mx-auto space-y-1.5 font-normal leading-relaxed">
              <p>Hum distributors ko sirf stock nahi dete.</p>
              <p>Hum ek aisi partnership banana chahte hain jahan dono saath grow karein.</p>
              <p className="font-bold text-[#052213] pt-2 text-sm">Isliye Hum Focus Karte Hain</p>
            </div>
          </div>

          <div className="space-y-2.5 max-w-xl mx-auto">
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">☀️</div>
              <span className="text-xs sm:text-sm font-semibold text-gray-800">Consistent Supply</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">☀️</div>
              <span className="text-xs sm:text-sm font-semibold text-gray-800">Product Quality</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">☀️</div>
              <span className="text-xs sm:text-sm font-semibold text-gray-800">Business Growth</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">☀️</div>
              <span className="text-xs sm:text-sm font-semibold text-gray-800">Long-Term Relationship</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">☀️</div>
              <span className="text-xs sm:text-sm font-semibold text-gray-800">Distributor Success</span>
            </div>
          </div>
        </section>

        {/* 8. FINAL TAKE ACTION / CTA SECTION */}
        <section className="px-4 sm:px-6 py-10 bg-gradient-to-b from-[#052213] to-black text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-luxury-pattern opacity-10"></div>

          <span className="inline-block bg-[#0E462A] text-amber-300 border border-amber-400/30 font-bold text-[10px] sm:text-xs px-4 py-1 rounded-full uppercase tracking-wider mb-3 shadow-sm relative z-10">
            TAKE ACTION
          </span>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-snug mb-3 max-w-lg mx-auto relative z-10">
            Kya Aap Apne Distribution Business Mein Ek <span className="text-gold-gradient">Nayi Growth Opportunity</span> Add Karna Chahte Hain?
          </h2>

          <p className="text-xs sm:text-sm text-amber-100/90 max-w-md mx-auto mb-8 leading-relaxed font-light relative z-10">
            Talbina Distributor Partnership Program ke liye apply karein aur dekhiye kya aapka region available hai.
          </p>

          <div className="max-w-md mx-auto mb-8 relative z-10">
            <button
              onClick={handleOpenBooking}
              className="w-full btn-shimmer text-[#052213] font-black text-sm sm:text-base py-4 px-6 rounded-2xl shadow-gold-glow transition-all transform active:scale-95 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Distributor Partnership Ke Liye Apply Karein</span>
              <svg className="w-4 h-4 text-[#052213] group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </button>
          </div>

          <div className="pt-8 border-t border-emerald-900/80 flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] sm:text-xs text-amber-200/60 font-medium relative z-10">
            <div>© Talbina Distributor Partnership Program</div>
            <div className="tracking-widest uppercase">PREMIUM NATURAL HEALTHY FOOD</div>
          </div>
        </section>

      </main>

      {/* FLOATING STICKY MOBILE CTA BAR */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-[#052213]/95 backdrop-blur-md border-t border-amber-400/30 p-2.5 z-40 md:hidden shadow-2xl transition-all duration-300 transform ${
          showStickyBar ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div className="pl-2">
            <div className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              50% Margin
            </div>
            <div className="text-[10px] text-amber-100/80 font-light">Limited Regions Left</div>
          </div>
          <button
            onClick={handleOpenBooking}
            className="btn-shimmer text-[#052213] font-black text-xs px-4 py-2.5 rounded-xl shadow-lg border border-amber-200 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Apply Now</span>
            <svg className="w-3.5 h-3.5 text-[#052213]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingConfig.isOpen}
        onClose={handleCloseBooking}
        initialStep={bookingConfig.step}
        initialLeadId={bookingConfig.leadId}
        initialCreatedDate={bookingConfig.createdDate}
        campaignName={bookingConfig.campaignName || "talbina"}
      />
    </div>
  );
}
