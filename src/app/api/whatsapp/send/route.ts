import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { number, text, instance = "Ahtemad" } = body;

    const targetUrl = `https://ev0.infispark.in/message/sendText/${instance}`;
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ number, text }),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ success: res.ok, data });
  } catch (error: any) {
    console.error("WhatsApp Proxy Route Error:", error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}
