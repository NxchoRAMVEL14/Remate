// Remate · conexión con Supabase.
// Déjalo vacío para usar la app solo en modo demo (los datos se quedan en el navegador).
// Para conectar la nube: Supabase → Project Settings → API. Copia "Project URL" y la clave
// "anon public" (o "publishable"). Esa clave es pública: la protege la seguridad por filas (RLS) del esquema SQL.
export const CONFIG = {
  SUPABASE_URL: "https://dvehbawawaibanvedkcm.supabase.co",        // por ejemplo: https://abcdefghijk.supabase.co
  SUPABASE_ANON_KEY: "sb_publishable_un8vlLwhL-IFeVkyRscseA_-pETY2Jy",   // por ejemplo: eyJhbGciOi...  (o sb_publishable_...)
};
