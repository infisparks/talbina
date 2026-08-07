"use client";

import React, { useState, useEffect } from "react";
import {
  saveOrUpdateLead,
  getLeadById,
  findExistingLead,
  checkExistingLeadByEmailOrPhone,
  sanitizeEmailToId,
  sanitizeDateKey,
  getBookedSlotsForDate,
  sanitizeSlotKey,
  LeadData,
} from "@/lib/firebase";
import { getCampaignConfig, DEFAULT_CAMPAIGN_ID } from "@/config/campaigns";
import { event as fbEvent, customEvent as fbCustomEvent, getPreservedQueryString } from "@/lib/fpixel";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: 1 | 2 | 3 | 4;
  initialLeadId?: string | null;
  initialCreatedDate?: string | null;
  campaignName?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Exact 8 daily time slots
const DAILY_TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "03:00 PM",
  "07:00 PM",
  "09:00 PM",
];

/**
 * Helper: Check if a specific time slot string (e.g. "09:00 AM") has already passed for a given date.
 */
export function isSlotTimePassed(
  timeStr: string,
  day: number,
  month: number,
  year: number
): boolean {
  const now = new Date();

  // Past dates
  if (year < now.getFullYear()) return true;
  if (year === now.getFullYear() && month < now.getMonth()) return true;
  if (year === now.getFullYear() && month === now.getMonth() && day < now.getDate()) return true;

  // Future dates (tomorrow or later)
  if (year > now.getFullYear() || month > now.getMonth() || day > now.getDate()) return false;

  // Selected date is TODAY: parse slot time
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return false;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  const slotDate = new Date(year, month, day, hours, minutes, 0, 0);
  return slotDate.getTime() <= now.getTime();
}

/**
 * Pure client-side static WhatsApp message sender.
 * Tries user's direct Evolution API endpoint https://ev0.infispark.in/message/sendText/mudassir first.
 * If ev0.infispark.in fails or is blocked by CORS/network error, falls back to https://first.infiplus.in/api/whatsapp/message/send-text.
 */
async function sendWhatsAppDirectMessage(contactNumber: string, messageText: string) {
  const cleanPhone = contactNumber.replace(/\D/g, "");
  const formattedNumber = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;

  // 1. Direct call to https://ev0.infispark.in/message/sendText/mudassir (User API format)
  try {
    const res = await fetch("https://ev0.infispark.in/message/sendText/mudassir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: formattedNumber,
        text: messageText,
      }),
    });
    if (res.ok) {
      console.log(`✅ WhatsApp message sent to ${formattedNumber} via ev0.infispark.in`);
      return;
    }
  } catch (error) {
    console.warn("⚠️ ev0.infispark.in direct call error, attempting fallback:", error);
  }

  // 2. Fallback to https://first.infiplus.in/api/whatsapp/message/send-text
  try {
    await fetch("https://first.infiplus.in/api/whatsapp/message/send-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instanceName: "mudassir",
        session: "mudassir",
        number: formattedNumber,
        text: messageText,
      }),
    });
    console.log(`✅ WhatsApp message sent to ${formattedNumber} via fallback server`);
  } catch (fallbackError) {
    console.error("❌ WhatsApp fallback error:", fallbackError);
  }
}

export function BookingModal({
  isOpen,
  onClose,
  initialStep = 1,
  initialLeadId = null,
  initialCreatedDate = null,
  campaignName = DEFAULT_CAMPAIGN_ID,
}: BookingModalProps) {
  // Load dynamic campaign questions & info
  const activeCampaign = getCampaignConfig(campaignName);

  // Step 1: Initial Contact Form
  // Step 2: Qualification Typeform Questionnaire
  // Step 3: Interactive Calendar Booking (Month, Date & Slot Selection)
  // Step 4: Final Success Confirmation & WhatsApp redirect
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep);

  // User explicitly reselecting slot override flag
  const [isReselectingSlot, setIsReselectingSlot] = useState<boolean>(false);

  // Show "Already Submitted" popup if user has already filled contact form
  const [showAlreadySubmittedPopup, setShowAlreadySubmittedPopup] = useState<boolean>(false);

  // Lead ID & Creation Date in Firebase & LocalStorage
  const [firebaseLeadId, setFirebaseLeadId] = useState<string | null>(initialLeadId);
  const [createdDate, setCreatedDate] = useState<string | null>(initialCreatedDate);

  // Step 1 Form Data
  const [contactInfo, setContactInfo] = useState({
    fullName: "",
    email: "",
    phone: "",
    countryCode: "+91",
  });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmittingStep1, setIsSubmittingStep1] = useState(false);

  // Step 2 Questionnaire State
  const [activeQIndex, setActiveQIndex] = useState<number>(0);
  const [qAnswers, setQAnswers] = useState<Record<string, string>>({});

  // Real Today Metrics
  const realToday = new Date();
  const realTodayYear = realToday.getFullYear();
  const realTodayMonth = realToday.getMonth();
  const realTodayDay = realToday.getDate();

  // Calendar State
  const [currentYear, setCurrentYear] = useState<number>(realTodayYear);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(realTodayMonth);
  const [selectedDay, setSelectedDay] = useState<number>(realTodayDay);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [bookedSlotsMap, setBookedSlotsMap] = useState<Record<string, boolean>>({});
  const [generatedMeetUrl, setGeneratedMeetUrl] = useState<string | null>(null);

  // Keep state synced with initialStep prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
      setFirebaseLeadId(initialLeadId);
      setCreatedDate(initialCreatedDate);
    }
  }, [isOpen, initialStep, initialLeadId, initialCreatedDate]);

  // Load existing lead state & LocalStorage cache when modal opens
  useEffect(() => {
    if (!isOpen) return;

    try {
      const storedLeadId = localStorage.getItem("firstoption_lead_id");
      const storedStatus = localStorage.getItem("firstoption_lead_status");
      const storedAnswers = localStorage.getItem("firstoption_survey_answers");
      const storedContact = localStorage.getItem("firstoption_contact_info");

      if (storedContact) {
        try {
          const parsed = JSON.parse(storedContact);
          if (parsed && parsed.email) {
            setContactInfo(parsed);
          }
        } catch (e) {
          console.error("Failed to parse cached contact info:", e);
        }
      }

      if (storedAnswers) {
        try {
          setQAnswers(JSON.parse(storedAnswers));
        } catch (e) {
          console.error("Failed to parse cached survey answers:", e);
        }
      }

      if (initialLeadId) {
        setFirebaseLeadId(initialLeadId);
        findExistingLead(initialLeadId, "", activeCampaign.id).then((result) => {
          const lead = result?.lead;
          if (lead) {
            setContactInfo({
              fullName: lead.fullName || "",
              email: lead.email || "",
              phone: lead.phone || "",
              countryCode: lead.countryCode || "+91",
            });

            if (lead.survey) setQAnswers(lead.survey);

            if (
              !isReselectingSlot &&
              (lead.status === "survey_completed" || lead.status === "completed")
            ) {
              setShowAlreadySubmittedPopup(true);
            }
          }
        });
      } else if (storedLeadId) {
        setFirebaseLeadId(storedLeadId);
        if (!isReselectingSlot && (storedStatus === "survey_completed" || storedStatus === "completed")) {
          setShowAlreadySubmittedPopup(true);
        }
      }
    } catch (e) {
      console.error("LocalStorage read exception:", e);
    }
  }, [isOpen, initialLeadId, isReselectingSlot]);

  // Real-time Firebase Listener for Booked Slots on active date
  useEffect(() => {
    if (!isOpen || step !== 3) return;

    const formattedMonth = (currentMonthIndex + 1).toString().padStart(2, "0");
    const formattedDay = selectedDay.toString().padStart(2, "0");
    const dateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

    getBookedSlotsForDate(dateStr, activeCampaign.id).then((slotsMap) => {
      setBookedSlotsMap(slotsMap);
    });
  }, [isOpen, step, selectedDay, currentMonthIndex, currentYear]);

  if (!isOpen) return null;

  // Real-time Field Blur Handlers
  const handleEmailBlur = async () => {
    const trimmedEmail = contactInfo.email.trim();
    if (!trimmedEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError("Please enter a valid work email address");
      return;
    }
    setEmailError(null);

    const emailPrefixId = sanitizeEmailToId(trimmedEmail);
    const existingResult = await findExistingLead(emailPrefixId, null, activeCampaign.id);
    if (existingResult && existingResult.lead) {
      const lead = existingResult.lead;
      setFirebaseLeadId(emailPrefixId);
      setCreatedDate(sanitizeDateKey(existingResult.createdDate));

      if (lead.fullName && !contactInfo.fullName) {
        setContactInfo((prev) => ({
          ...prev,
          fullName: lead.fullName,
          phone: lead.phone || prev.phone,
        }));
      }

      if (lead.survey) setQAnswers(lead.survey);

      if (
        !isReselectingSlot &&
        (lead.status === "survey_completed" || lead.status === "completed")
      ) {
        setShowAlreadySubmittedPopup(true);
      }
    }
  };

  const handlePhoneBlur = async () => {
    const cleanPhone = contactInfo.phone.replace(/\D/g, "");
    if (!cleanPhone) return;

    if (cleanPhone.length !== 10) {
      setPhoneError("Please enter a valid 10-digit mobile number");
      return;
    }
    setPhoneError(null);

    const existingResult = await findExistingLead("", cleanPhone, activeCampaign.id);
    if (existingResult && existingResult.lead) {
      const lead = existingResult.lead;
      if (lead.fullName && !contactInfo.fullName) {
        setContactInfo((prev) => ({
          ...prev,
          fullName: lead.fullName,
          email: lead.email || prev.email,
        }));
      }

      if (lead.survey) setQAnswers(lead.survey);

      if (
        !isReselectingSlot &&
        (lead.status === "survey_completed" || lead.status === "completed")
      ) {
        setShowAlreadySubmittedPopup(true);
      }
    }
  };

  // Step 1 Submit: Instant local transition + async Firebase database save
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = contactInfo.email.trim();
    const cleanPhone = contactInfo.phone.replace(/\D/g, "");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError("Please enter a valid work email address");
      return;
    }

    if (cleanPhone.length !== 10) {
      setPhoneError("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsSubmittingStep1(true);
    const emailPrefixId = firebaseLeadId || sanitizeEmailToId(trimmedEmail);
    const nowISO = createdDate || new Date().toISOString();

    const initialPayload: LeadData = {
      fullName: contactInfo.fullName,
      email: trimmedEmail,
      phone: cleanPhone,
      countryCode: contactInfo.countryCode,
      status: "partial",
      pipelineStage: "contact_saved",
      stageMovedAt: new Date().toISOString(),
    };

    try {
      // 1. INSTANT LOCAL PERSISTENCE: Save to LocalStorage immediately
      localStorage.setItem("firstoption_lead_id", emailPrefixId);
      localStorage.setItem("firstoption_lead_status", "contact_saved");
      localStorage.setItem("firstoption_contact_info", JSON.stringify(contactInfo));

      // 2. INSTANT UI TRANSITION: Move to Step 2 (Survey Questionnaire) immediately
      setStep(2);

      // Save initial lead to Firebase database asynchronously in background
      saveOrUpdateLead(initialPayload, emailPrefixId, nowISO, activeCampaign.id).catch((err) =>
        console.error("Async Step 1 saveOrUpdateLead error:", err)
      );

      // Track Meta Pixel Lead event
      fbEvent("Lead", {
        content_name: activeCampaign.title || "Talbina Distributor Partnership",
        currency: "INR",
        value: 0,
      });
      fbEvent("ViewContent", {
        content_name: "Survey Questionnaire Page",
      });
      fbCustomEvent("FormSubmit", {
        form_name: "Step 1 Contact Form",
        campaign: activeCampaign.id,
      });

      // Trigger automatic WhatsApp Welcome Message in background
      const cleanUserPhone = `${contactInfo.countryCode}${cleanPhone}`;
      const welcomeText = `Hello ${contactInfo.fullName || "Partner"},\n\nThank you for applying for the Talbina Distributor Partnership Program 2026! Our team will contact you soon.`;

      sendWhatsAppDirectMessage(cleanUserPhone, welcomeText);

      // Asynchronously trigger Meta Conversions API (CAPI) for Lead
      try {
        fetch("/api/whatsapp/capi-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "Lead",
            eventSourceUrl: typeof window !== "undefined" ? window.location.href : "https://talbina.in/survey",
            email: contactInfo.email,
            phone: cleanUserPhone,
            fullName: contactInfo.fullName,
            customData: {
              content_name: activeCampaign.title || "Talbina Distributor Partnership",
              currency: "INR",
              value: 0,
            },
          }),
        }).catch(() => {});
      } catch (e) {}
    } catch (err) {
      console.error("Submit Step 1 Error:", err);
    } finally {
      setIsSubmittingStep1(false);
    }
  };

  // Step 2 Submit: Save Survey Answers to SAME Firebase Lead Node
  const handleStep2Submit = async () => {
    const emailPrefixId = firebaseLeadId || sanitizeEmailToId(contactInfo.email);

    try {
      localStorage.setItem("firstoption_survey_answers", JSON.stringify(qAnswers));
      localStorage.setItem("firstoption_lead_status", "survey_completed");
    } catch (e) {
      console.error("LocalStorage survey save error:", e);
    }

    // Transition to Step 3 (Meeting Calendar / Slot Selection)
    setStep(3);

    fbEvent("CompleteRegistration", {
      content_name: "Talbina Partnership Survey",
      campaign: activeCampaign.id,
    });

    const surveyPayload: LeadData = {
      fullName: contactInfo.fullName,
      email: contactInfo.email,
      phone: contactInfo.phone.replace(/\D/g, ""),
      countryCode: contactInfo.countryCode,
      status: "survey_completed",
      pipelineStage: "survey_completed",
      stageMovedAt: new Date().toISOString(),
      survey: qAnswers,
    };

    saveOrUpdateLead(surveyPayload, emailPrefixId, createdDate, activeCampaign.id).catch((err) =>
      console.error("Async survey saveOrUpdateLead error:", err)
    );

    try {
      fetch("/api/whatsapp/auto-send-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName: "mudassir",
          session: "mudassir",
          fullName: contactInfo.fullName,
          email: contactInfo.email,
          phone: `${contactInfo.countryCode}${contactInfo.phone.replace(/\D/g, "")}`,
        }),
      }).catch(() => {});
    } catch (e) {}
  };

  const handleReset = () => {
    setStep(1);
    setIsReselectingSlot(false);
    setShowAlreadySubmittedPopup(false);
    setActiveQIndex(0);
    setSelectedTimeSlot(null);
    setPhoneError(null);

    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    onClose();
  };

  // Month Switching Handlers
  const isPrevMonthDisabled =
    currentYear < realTodayYear ||
    (currentYear === realTodayYear && currentMonthIndex <= realTodayMonth);

  const handlePrevMonth = () => {
    if (isPrevMonthDisabled) return;

    if (currentMonthIndex > 0) {
      setCurrentMonthIndex(currentMonthIndex - 1);
    } else {
      setCurrentMonthIndex(11);
      setCurrentYear(currentYear - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex < 11) {
      setCurrentMonthIndex(currentMonthIndex + 1);
    } else {
      setCurrentMonthIndex(0);
      setCurrentYear(currentYear + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonthIndex, 1).getDay();

  const isPastDay = (dayNum: number) => {
    if (currentYear < realTodayYear) return true;
    if (currentYear === realTodayYear && currentMonthIndex < realTodayMonth) return true;
    if (
      currentYear === realTodayYear &&
      currentMonthIndex === realTodayMonth &&
      dayNum < realTodayDay
    ) {
      return true;
    }
    return false;
  };

  // Step 3 Submit: Slot Booking
  const handleSelectSlot = (time: string) => {
    const slotKey = sanitizeSlotKey(time);
    if (bookedSlotsMap[slotKey]) return;

    const GOOGLE_MEET_URL = "https://meet.google.com/umb-fmid-jjy";
    setSelectedTimeSlot(time);
    setIsReselectingSlot(false);
    setGeneratedMeetUrl(GOOGLE_MEET_URL);
    setStep(4);

    fbEvent("Schedule", {
      content_name: "Talbina Partnership Call Booking",
      campaign: activeCampaign.id,
    });

    const emailPrefixId = firebaseLeadId || sanitizeEmailToId(contactInfo.email);
    const formattedMonth = (currentMonthIndex + 1).toString().padStart(2, "0");
    const formattedDay = selectedDay.toString().padStart(2, "0");
    const appointmentDateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;

    try {
      fetch("/api/whatsapp/capi-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "Schedule",
          eventSourceUrl: typeof window !== "undefined" ? window.location.href : "https://talbina.in/success",
          email: contactInfo.email,
          phone: `${contactInfo.countryCode}${contactInfo.phone.replace(/\D/g, "")}`,
          fullName: contactInfo.fullName,
          customData: {
            content_name: "Talbina Partnership Call Booking",
            meeting_date: appointmentDateStr,
            meeting_time: time,
          },
        }),
      }).catch(() => {});
    } catch (e) {}

    const completedPayload: LeadData = {
      fullName: contactInfo.fullName,
      email: contactInfo.email,
      phone: contactInfo.phone.replace(/\D/g, ""),
      countryCode: contactInfo.countryCode,
      status: "completed",
      pipelineStage: "meeting_booked",
      stageMovedAt: new Date().toISOString(),
      survey: qAnswers,
      meeting: {
        meetingDate: appointmentDateStr,
        meetingTime: time,
        bookedAt: new Date().toISOString(),
      },
    };

    saveOrUpdateLead(completedPayload, emailPrefixId, createdDate, activeCampaign.id).catch((err) =>
      console.error("Async saveOrUpdateLead error:", err)
    );

    const formattedDateStr = `${MONTH_NAMES[currentMonthIndex]} ${selectedDay}, ${currentYear}`;
    const cleanUserPhone = `${contactInfo.countryCode}${contactInfo.phone.replace(/\D/g, "")}`;
    const meetingMessageText = `Hello ${contactInfo.fullName || "Partner"},\n\nYour Talbina Distributor Partnership Consultation Call has been booked successfully! 🎉\n\n📅 Date: ${formattedDateStr}\n⏰ Time: ${time}\n🔗 Google Meet Link: ${GOOGLE_MEET_URL}\n\nOur team will connect with you at your chosen slot. Thank you!`;

    sendWhatsAppDirectMessage(cleanUserPhone, meetingMessageText);
  };

  const formattedBookingDate = `${selectedDay} ${MONTH_NAMES[currentMonthIndex]} ${currentYear}`;

  const whatsappUrl = `https://api.whatsapp.com/send?phone=918329494445&text=${encodeURIComponent(
    `Hi Talbina Team, I have submitted my Distributor Partnership Application.\nName: ${contactInfo.fullName || "User"}\nEmail: ${contactInfo.email || "N/A"}\nPhone: ${contactInfo.countryCode} ${contactInfo.phone || "N/A"}\nPreferred Call Slot: ${formattedBookingDate} at ${selectedTimeSlot || "02:00 PM"}`
  )}`;

  const qualificationQuestions = activeCampaign.questions;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-toast-in overflow-y-auto">
      {/* Popup: Already Filled Form Notice */}
      {showAlreadySubmittedPopup ? (
        <div className="bg-brandCream text-gray-800 border-2 border-amber-400/80 w-full max-w-md sm:max-w-lg rounded-3xl p-5 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto font-sans text-center my-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-amber-200/60 text-gray-800 font-black flex items-center justify-center hover:bg-amber-300 transition-colors"
          >
            ✕
          </button>

          {/* Badge & Icon */}
          <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 text-emerald-700 flex items-center justify-center text-3xl mx-auto shadow-md mb-3 font-black">
            ✓
          </div>

          <div className="inline-flex items-center space-x-1.5 bg-brandPillGreen border border-emerald-300/60 px-3 py-1 rounded-full text-brandGreen text-xs font-bold mb-3">
            <span>OFFICIAL DISTRIBUTOR APPLICANT</span>
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-black text-brandDark leading-tight">
            Application Already Submitted!
          </h3>

          {/* Subtext */}
          <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed mt-2 max-w-sm mx-auto">
            Aapki details pehle se saved hain. Direct assistance ya partnership discussion ke liye humari team se contact karein:
          </p>

          {/* Display Existing Contact Details Card */}
          {contactInfo.fullName && (
            <div className="bg-white border border-amber-300/80 rounded-2xl p-3.5 mt-4 text-left text-xs space-y-1.5 font-sans shadow-inner">
              <div className="flex justify-between items-center text-gray-600">
                <span>Applicant Name:</span>
                <span className="text-brandDark font-bold">{contactInfo.fullName}</span>
              </div>
              {contactInfo.email && (
                <div className="flex justify-between items-center text-gray-600">
                  <span>Email:</span>
                  <span className="text-emerald-700 font-bold">{contactInfo.email}</span>
                </div>
              )}
              {contactInfo.phone && (
                <div className="flex justify-between items-center text-gray-600">
                  <span>Phone / WhatsApp:</span>
                  <span className="text-brandDark font-bold">{contactInfo.countryCode} {contactInfo.phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Phone Support Display Card */}
          <div className="bg-gradient-to-r from-amber-100 via-amber-50 to-emerald-100 border border-amber-300 rounded-2xl p-3.5 mt-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-brandGreen text-amber-300 flex items-center justify-center text-lg flex-shrink-0 font-bold">
                📞
              </div>
              <div>
                <p className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider">Distributor Helpline</p>
                <p className="text-base sm:text-lg font-black text-brandDark tracking-wide">+91 832 949 4445</p>
              </div>
            </div>
            <a
              href="tel:+918329494445"
              className="btn-shimmer text-brandDark font-black px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1 shadow transition-transform active:scale-95 cursor-pointer"
            >
              <span>Call Now</span>
            </a>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 mt-5">
            <a
              href={`https://wa.me/918329494445?text=${encodeURIComponent(
                `Hi Talbina Team, I submitted my distributor application and have a query.\nName: ${contactInfo.fullName || "User"}\nPhone: ${contactInfo.phone || "N/A"}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black p-3.5 rounded-2xl text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
            >
              <span>💬 Chat on WhatsApp (+91 832 949 4445)</span>
            </a>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAlreadySubmittedPopup(false);
                  setIsReselectingSlot(true);
                  setStep(3);
                }}
                className="bg-amber-100 hover:bg-amber-200 border border-amber-300 text-brandDark font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>📅 Select Call Slot</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAlreadySubmittedPopup(false);
                  setStep(1);
                }}
                className="bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>✏ Edit Details</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Step 1: Contact Form (Talbina Luxury Emerald & Gold Styling) */}
          {step === 1 && (
            <div className="bg-brandCream rounded-3xl max-w-md w-full p-5 sm:p-6 relative border-2 border-amber-400/80 shadow-2xl overflow-y-auto max-h-[90vh] my-auto">
              {/* Close Button */}
              <button
                onClick={handleReset}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-amber-200/60 text-gray-800 font-black flex items-center justify-center hover:bg-amber-300 transition-colors"
              >
                ✕
              </button>

              {/* Header */}
              <div className="text-center mb-4">
                <span className="inline-block bg-brandPillGreen text-brandGreen font-extrabold text-[10px] px-3.5 py-0.5 rounded-full uppercase tracking-wider mb-1 shadow-sm">
                  OFFICIAL APPLICATION
                </span>
                <h3 className="text-lg sm:text-xl font-black text-brandDark">
                  Distributor Partnership Form
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  Apni details submit karein, humari team aapko contact karegi.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleStep1Submit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Aapka Poora Naam"
                    value={contactInfo.fullName}
                    onChange={(e) => {
                      const capitalized = e.target.value.replace(/(^|\s)\S/g, (l) => l.toUpperCase());
                      setContactInfo({ ...contactInfo, fullName: capitalized });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-brandGreen text-xs sm:text-sm bg-white shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={contactInfo.email}
                    onChange={(e) => {
                      setContactInfo({ ...contactInfo, email: e.target.value });
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={handleEmailBlur}
                    className={`w-full px-3.5 py-2.5 rounded-xl border ${
                      emailError ? "border-red-500" : "border-amber-300 focus:ring-2 focus:ring-brandGreen"
                    } text-xs sm:text-sm bg-white shadow-inner outline-none`}
                  />
                  {emailError && (
                    <p className="text-red-600 font-bold text-xs mt-1">⚠ {emailError}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Phone / WhatsApp Number *
                  </label>
                  <div className="flex items-center bg-white border border-amber-300 rounded-xl overflow-hidden shadow-inner">
                    <div className="px-3 py-2.5 bg-amber-100 text-xs font-bold text-brandDark border-r border-amber-300">
                      🇮🇳 +91
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={10}
                      required
                      placeholder="10 Digits Mobile Number"
                      value={contactInfo.phone}
                      onChange={(e) => {
                        const onlyNums = e.target.value.replace(/\D/g, "");
                        setContactInfo({ ...contactInfo, phone: onlyNums });
                        if (phoneError) setPhoneError(null);
                      }}
                      onBlur={handlePhoneBlur}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-transparent focus:outline-none font-mono"
                    />
                  </div>
                  {phoneError && (
                    <p className="text-red-600 font-bold text-xs mt-1">⚠ {phoneError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingStep1}
                  className="w-full btn-shimmer text-brandDark font-black text-xs sm:text-sm py-3.5 rounded-xl shadow-lg mt-2 transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>{isSubmittingStep1 ? "Submitting Application..." : "Submit Partnership Application"}</span>
                  <svg className="w-4 h-4 text-brandDark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>

                <p className="text-[10px] text-center text-gray-500 mt-2 flex items-center justify-center gap-1">
                  <span>🔒</span> Aapki details 100% confidential rahengi.
                </p>
              </form>
            </div>
          )}

          {/* Step 2: 2-Question Talbina Survey */}
          {step === 2 && (
            <div className="bg-brandCream rounded-3xl max-w-md w-full p-5 sm:p-6 relative border-2 border-amber-400/80 shadow-2xl overflow-y-auto max-h-[90vh] my-auto">
              <button
                onClick={handleReset}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-amber-200/60 text-gray-800 font-black flex items-center justify-center hover:bg-amber-300 transition-colors"
              >
                ✕
              </button>

              <div className="text-center mb-4">
                <span className="inline-block bg-brandPillGreen text-brandGreen font-extrabold text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider mb-1">
                  STEP 2 OF 2: QUALIFICATION
                </span>
                <h3 className="text-base sm:text-lg font-black text-brandDark">
                  Distributor Partnership Survey
                </h3>
              </div>

              {(() => {
                const currentQ = qualificationQuestions[activeQIndex];
                if (!currentQ) return null;
                return (
                  <div className="space-y-3.5">
                    <div className="text-xs sm:text-sm font-extrabold text-brandDark">
                      <span className="text-amber-800 mr-1.5">Q{activeQIndex + 1}.</span>
                      {currentQ.question}
                    </div>

                    <div className="space-y-2">
                      {currentQ.options.map((opt) => {
                        const isSelected = qAnswers[currentQ.field] === opt.label;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                              setQAnswers({ ...qAnswers, [currentQ.field]: opt.label });
                              if (activeQIndex < qualificationQuestions.length - 1) {
                                setActiveQIndex(activeQIndex + 1);
                              }
                            }}
                            className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                              isSelected
                                ? "bg-amber-100 border-amber-500 text-brandDark font-bold shadow-sm"
                                : "bg-white border-amber-200 text-gray-800 hover:border-amber-400"
                            }`}
                          >
                            <span className="text-xs sm:text-sm font-semibold">{opt.label}</span>
                            <span className="w-5 h-5 rounded-full bg-amber-200/80 text-brandDark text-[10px] font-bold flex items-center justify-center">
                              {opt.key}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-amber-200">
                      <button
                        type="button"
                        disabled={activeQIndex === 0}
                        onClick={() => setActiveQIndex(Math.max(0, activeQIndex - 1))}
                        className="text-xs font-bold text-gray-600 hover:text-brandDark disabled:opacity-30"
                      >
                        ← Back
                      </button>

                      {activeQIndex === qualificationQuestions.length - 1 ? (
                        <button
                          type="button"
                          onClick={handleStep2Submit}
                          className="btn-shimmer text-brandDark font-black text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1"
                        >
                          <span>Complete & Select Call Slot</span>
                          <svg className="w-3.5 h-3.5 text-brandDark" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveQIndex(activeQIndex + 1)}
                          className="bg-brandGreen text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm"
                        >
                          Next Question →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Step 3: Call / Meeting Slot Selection */}
          {step === 3 && (
            <div className="bg-brandCream rounded-3xl max-w-md w-full p-4 sm:p-6 relative border-2 border-amber-400/80 shadow-2xl overflow-y-auto max-h-[92vh] my-auto space-y-3">
              <div className="flex items-center justify-between border-b border-amber-300/80 pb-2">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-brandDark">
                    Select Distributor Call Slot
                  </h3>
                  <p className="text-[11px] text-gray-600">Choose convenient date & time for partnership discussion</p>
                </div>
                <button
                  onClick={handleReset}
                  className="w-7 h-7 rounded-full bg-amber-200/60 text-gray-800 font-black flex items-center justify-center hover:bg-amber-300"
                >
                  ✕
                </button>
              </div>

              {/* Host Card Info */}
              <div className="bg-white border border-amber-300/80 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-full bg-brandGreen text-amber-300 font-black flex items-center justify-center text-sm shadow">
                    🤝
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-brandDark">
                      Talbina Partnership Team
                    </h4>
                    <p className="text-[10px] text-emerald-800 font-bold">Distributor Consultation Call</p>
                  </div>
                </div>
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  30 Min Call
                </span>
              </div>

              {/* Calendar Card */}
              <div className="border border-amber-300/80 rounded-2xl p-3 bg-white space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold text-brandDark">
                  <button
                    type="button"
                    disabled={isPrevMonthDisabled}
                    onClick={handlePrevMonth}
                    className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-extrabold disabled:opacity-30"
                  >
                    ← Prev
                  </button>

                  <span className="text-xs font-black text-brandDark bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                    {MONTH_NAMES[currentMonthIndex]} {currentYear}
                  </span>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="px-2 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-extrabold"
                  >
                    Next →
                  </button>
                </div>

                <div className="grid grid-cols-7 text-center text-[9px] font-bold text-gray-500 border-b border-gray-200 pb-1">
                  <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold">
                  {[...Array(firstDayOfWeek)].map((_, emptyIdx) => (
                    <div key={`empty-${emptyIdx}`} className="p-1" />
                  ))}

                  {[...Array(daysInMonth)].map((_, i) => {
                    const dayNum = i + 1;
                    const isSelected = selectedDay === dayNum;
                    const isPast = isPastDay(dayNum);

                    return (
                      <button
                        key={dayNum}
                        disabled={isPast}
                        onClick={() => setSelectedDay(dayNum)}
                        className={`p-1.5 sm:p-2 rounded-xl transition-all text-xs font-bold ${
                          isPast
                            ? "text-gray-400 bg-gray-100 cursor-not-allowed opacity-40 line-through"
                            : isSelected
                            ? "bg-brandGreen text-white font-black shadow-md scale-105"
                            : "text-gray-800 hover:bg-amber-100 hover:text-brandDark"
                        }`}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-brandDark">
                  <span>📅 {formattedBookingDate}</span>
                  <span className="text-amber-800 text-[10px] font-bold">Select Call Slot</span>
                </div>

                {(() => {
                  const activeSlots = DAILY_TIME_SLOTS.filter(
                    (time) => !isSlotTimePassed(time, selectedDay, currentMonthIndex, currentYear)
                  );

                  if (activeSlots.length === 0) {
                    return (
                      <div className="p-3 text-center rounded-xl bg-amber-50 border border-amber-200 text-xs font-medium text-gray-700">
                        ⏰ Today's slots have passed. Please select an upcoming date above.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1">
                      {activeSlots.map((time) => {
                        const slotKey = sanitizeSlotKey(time);
                        const isBooked = bookedSlotsMap[slotKey] === true;

                        return (
                          <button
                            key={time}
                            disabled={isBooked}
                            onClick={() => handleSelectSlot(time)}
                            className={`w-full p-2.5 rounded-xl text-xs font-bold transition-all ${
                              isBooked
                                ? "bg-gray-200 text-gray-400 cursor-not-allowed line-through"
                                : "btn-shimmer text-brandDark font-black shadow hover:scale-105 active:scale-95"
                            }`}
                          >
                            <span>{isBooked ? `${time} (Booked)` : time}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Step 4: Final Success Confirmation */}
          {step === 4 && (
            <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center border-2 border-emerald-500 shadow-2xl relative space-y-4 my-auto">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto font-black shadow-inner">
                ✓
              </div>

              <div>
                <h3 className="text-xl font-black text-brandDark mb-1">
                  Partnership Application Received! 🎉
                </h3>
                <p className="text-xs text-emerald-800 font-bold">
                  Consultation Call Slot: {formattedBookingDate} at {selectedTimeSlot}
                </p>
              </div>

              <div className="bg-brandCream border border-amber-300/80 rounded-2xl p-3.5 text-left text-xs text-gray-700 space-y-1 font-medium shadow-inner">
                <div><span className="text-gray-500">Name:</span> <strong>{contactInfo.fullName || "User"}</strong></div>
                <div><span className="text-gray-500">Phone:</span> <strong>{contactInfo.countryCode} {contactInfo.phone || "N/A"}</strong></div>
                <div><span className="text-gray-500">Program:</span> <strong>{activeCampaign.title}</strong></div>
                <div><span className="text-gray-500">Booked Slot:</span> <strong>{formattedBookingDate} ({selectedTimeSlot})</strong></div>
              </div>

              {/* Google Meet Link Display Card */}
              <div className="bg-blue-50/90 border border-blue-300/80 rounded-2xl p-3.5 text-left space-y-1.5 shadow-sm">
                <div className="flex items-center space-x-2 text-blue-950 font-black text-xs">
                  <span>🎥 Google Meet Call Link:</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-blue-700 font-bold text-xs truncate">
                    https://meet.google.com/umb-fmid-jjy
                  </span>
                  <a
                    href="https://meet.google.com/umb-fmid-jjy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap transition-transform active:scale-95"
                  >
                    Join Meet ↗
                  </a>
                </div>
              </div>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleReset}
                className="block w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-3.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-transform active:scale-95"
              >
                💬 Confirm Slot On WhatsApp & Return to Home
              </a>

              <button
                onClick={handleReset}
                className="w-full bg-brandGreen text-white font-bold py-3 rounded-xl text-xs shadow-sm"
              >
                Back to Home Page
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
