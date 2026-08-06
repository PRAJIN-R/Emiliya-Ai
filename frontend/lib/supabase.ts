import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const getJwtProjectRef = (token?: string) => {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(normalized));
    return typeof json.ref === "string" ? json.ref : null;
  } catch {
    return null;
  }
};

const getUrlProjectRef = (value?: string) => {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(".supabase.co", "");
  } catch {
    return null;
  }
};

const isLikelyValidUrl = (value?: string) => {
  if (!value) return false;
  if (value.includes("YOUR_PROJECT_REF") || value.includes("your_project_ref")) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
};

const isLikelyValidKey = (value?: string) => {
  if (!value) return false;
  if (value.includes("YOUR_SUPABASE_ANON_KEY") || value === "your_supabase_anon_key") return false;
  return value.length > 40; // Basic length check for JWT
};

const urlProjectRef = getUrlProjectRef(supabaseUrl);
const jwtProjectRef = getJwtProjectRef(supabaseAnonKey);
const projectRefsMatch = Boolean(urlProjectRef && jwtProjectRef && urlProjectRef === jwtProjectRef);
const hasBasicConfig = Boolean(supabaseUrl && supabaseAnonKey && isLikelyValidUrl(supabaseUrl) && isLikelyValidKey(supabaseAnonKey));

export const supabaseConfigured = hasBasicConfig;
export const supabaseConfigError =
  !hasBasicConfig
    ? "Supabase is not configured correctly. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local, then restart the dev server."
    : !projectRefsMatch
    ? "Supabase project URL and Anon Key project reference do not match. Double-check the values in frontend/.env.local."
    : null;

export const supabase = supabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : null;
