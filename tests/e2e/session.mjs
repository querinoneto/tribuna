// Gera o cookie de sessão do @supabase/ssr para um e-mail (apenas para testes locais).
import { createHmac } from "node:crypto";
const [,, id, email] = process.argv;
const secret = "super-secret-jwt-token-with-at-least-32-characters-long";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 3600 * 6;
const h = b64({ alg: "HS256", typ: "JWT" });
const p = b64({ sub: id, email, role: "authenticated", aud: "authenticated", exp, iat: exp - 21600, session_id: "local" });
const access = `${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
const session = { access_token: access, refresh_token: "local", token_type: "bearer", expires_in: 21600, expires_at: exp,
  user: { id, email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} } };
console.log("base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"));
