"use strict";

// Estas dos credenciales son públicas (anon/publishable key) — están pensadas
// para vivir en el frontend. Nunca pongas aquí la "service_role key".
const SUPABASE_URL = "https://iplvriskhfhivibytwxn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Cf3ngk-CzqYGtky65xvysg_qOgCiYnz";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
