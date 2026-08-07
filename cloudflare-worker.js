export default {
  async fetch(request, env, ctx) {
    // Enable CORS headers so requests from any browser origin work without CORS errors
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, apikey",
    };

    // 1. Handle CORS Preflight OPTIONS Request
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // 2. Handle POST Request to send WhatsApp message
    if (request.method === "POST") {
      try {
        const body = await request.json();
        const number = body.number;
        const text = body.text;

        // Read from Cloudflare Worker Environment Variables (env) or fallback to defaults
        const instance = body.instance || env.WHATSAPP_INSTANCE || "Ahtemad";
        const apiKey = body.apikey || env.WHATSAPP_API_KEY || "vR39h6avY69g7kAU3YQbS6V6XEvudson";
        const serverUrl = (env.WHATSAPP_SERVER_URL || "https://evo.infispark.in").replace(/\/$/, "");

        if (!number || !text) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing required fields: number, text" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const targetUrl = `${serverUrl}/message/sendText/${instance}`;

        // Forward request to WhatsApp server with apikey header
        const res = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey,
          },
          body: JSON.stringify({ number, text }),
        });

        const data = await res.text();

        return new Response(data, {
          status: res.status,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, error: err.message || "Proxy worker error" }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ status: "online", message: "Talbina WhatsApp Cloudflare Proxy Worker Active" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  },
};
