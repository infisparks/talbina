export default {
  async fetch(request, env, ctx) {
    // Standard CORS headers allowing requests from any web origin (including Vercel & localhost)
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
        const instance = body.instance || "Ahtemad";
        const apiKey = body.apikey || "vR39h6avY69g7kAU3YQbS6V6XEvudson";

        if (!number || !text) {
          return new Response(
            JSON.stringify({ success: false, error: "Missing required fields: number, text" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const targetUrl = `https://ev0.infispark.in/message/sendText/${instance}`;

        // Forward request to ev0 server with apikey header
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
