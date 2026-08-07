import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { number, text, instance = "Ahtemad", apikey } = body;

    const apiKey =
      apikey ||
      process.env.WHATSAPP_API_KEY ||
      process.env.NEXT_PUBLIC_WHATSAPP_API_KEY ||
      "vR39h6avY69g7kAU3YQbS6V6XEvudson";

    const serverUrl = (process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || "https://evo.infispark.in").replace(/\/$/, "");
    const targetUrl = `${serverUrl}/message/sendText/${instance}`;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
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
