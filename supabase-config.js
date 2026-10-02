"use strict";

// Credenciales públicas (anon / publishable key) para el frontend.
// Nunca incluyas aquí la "service_role key".
const SUPABASE_URL = "https://iplvriskhfhivibytwxn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Cf3ngk-CzqYGtky65xvysg_qOgCiYnz";

// Validación de la librería en el entorno global antes de instanciar
if (typeof window !== "undefined" && window.supabase) {
  var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error("Supabase SDK no está cargado. Asegúrate de incluir el CDN en el HTML antes de este script.");
}
