import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { number, text, instance = "Ahtemad" } = body;

    if (!number || !text) {
      return NextResponse.json({ success: false, message: "Missing number or text" }, { status: 400 });
    }

    const cleanNumber = String(number).replace(/\D/g, "");
    const formattedNumber = cleanNumber.startsWith("91") ? cleanNumber : `91${cleanNumber}`;

    // 1. Try ev0.infispark.in instance
    try {
      const targetUrl = `https://ev0.infispark.in/message/sendText/${instance}`;
      const res = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ number: formattedNumber, text }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json({ success: true, provider: "ev0.infispark.in", data });
      }
    } catch (ev0Error: any) {
      console.warn("Server ev0.infispark.in WhatsApp dispatch error:", ev0Error?.message);
    }

    // 2. Server-side fallback to first.infiplus.in
    try {
      const fallbackUrl = "https://first.infiplus.in/api/whatsapp/message/send-text";
      const resFallback = await fetch(fallbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceName: "mudassir",
          session: "mudassir",
          number: formattedNumber,
          text,
        }),
      });

      if (resFallback.ok) {
        const fallbackData = await resFallback.json().catch(() => ({}));
        return NextResponse.json({ success: true, provider: "fallback.infiplus.in", data: fallbackData });
      }
    } catch (fallbackErr: any) {
      console.error("Server-side WhatsApp fallback error:", fallbackErr?.message);
    }

    return NextResponse.json({ success: false, message: "Failed to dispatch WhatsApp message on server" }, { status: 502 });
  } catch (error: any) {
    console.error("WhatsApp Proxy Route Error:", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
