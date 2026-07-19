function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

async function hashPassword(password) {
  const enc = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (path === "/auth/signup" && request.method === "POST") {
      const { email, phone, password, full_name } = await request.json();
      if (!email || !password) return json({ error: "email and password required" }, 400);

      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
      if (existing) return json({ error: "User already exists" }, 400);

      const id = crypto.randomUUID();
      const password_hash = await hashPassword(password);

      await env.DB.prepare("INSERT INTO users (id, email, phone, password_hash) VALUES (?, ?, ?, ?)")
        .bind(id, email, phone || null, password_hash).run();

      await env.DB.prepare(
        "INSERT INTO profiles (id, registration_id, full_name, phone, status) VALUES (?, ?, ?, ?, 'active')"
      ).bind(id, phone || email, full_name || "", phone || null).run();

      return json({ id, email, message: "Signup successful" });
    }

    if (path === "/auth/login" && request.method === "POST") {
      const { identifier, password } = await request.json();
      if (!identifier || !password) return json({ error: "identifier and password required" }, 400);

      const password_hash = await hashPassword(password);
      const user = await env.DB.prepare(
        "SELECT id, email, phone FROM users WHERE (email = ? OR phone = ?) AND password_hash = ?"
      ).bind(identifier, identifier, password_hash).first();

      if (!user) return json({ error: "Invalid registration ID or password" }, 400);

      const profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(user.id).first();
      const roleRow = await env.DB.prepare("SELECT role FROM user_roles WHERE user_id = ?").bind(user.id).first();

      return json({ user, profile, role: roleRow ? roleRow.role : "user" });
    }

    return json({ error: "Not found" }, 404);
  },
};
