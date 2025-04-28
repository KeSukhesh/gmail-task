import { getToken } from "next-auth/jwt";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

export async function GET(req: Request) {
  console.log("==== API DEBUG ====");
  console.log("env NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET);
  console.log("incoming cookie:", req.headers.get("cookie"));

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  console.log("token:", token);

  if (!token?.accessToken) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const gmailRes = await fetch(`${GMAIL_API}?maxResults=10`, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    });

    if (!gmailRes.ok) {
      // ensure valid JSON response
      return new Response(JSON.stringify({ error: "Failed to fetch emails" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await gmailRes.json();

    // no emails returned
    if (!data.messages) {
      return new Response(JSON.stringify({ messages: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch minimal info for each email
    const messages = await Promise.all(
      data.messages.map(async (msg: { id: string }) => {
        const detailRes = await fetch(`${GMAIL_API}/${msg.id}`, {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
          },
        });
        const detail = await detailRes.json();
        return {
          id: msg.id,
          snippet: detail.snippet,
          internalDate: detail.internalDate,
          payload: detail.payload,
        };
      }),
    );
    console.log("messages", messages);
    return new Response(JSON.stringify({ messages }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
