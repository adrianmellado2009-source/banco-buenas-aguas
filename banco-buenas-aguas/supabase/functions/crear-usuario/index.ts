// ============================================================
// Edge Function: crear-usuario
// Solo puede invocarla un admin autenticado. Crea el usuario en
// Supabase Auth (requiere service role key) y su perfil asociado.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

function generarNumeroCuenta() {
  return "BBA-" + Math.floor(10000000 + Math.random() * 89999999).toString();
}

function generarPasswordTemporal() {
  return Math.random().toString(36).slice(-10) + "!A1";
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    // Cliente "en nombre del usuario" para comprobar que quien llama es admin
    const supabaseAsCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await supabaseAsCaller.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
    }

    const { data: profile } = await supabaseAsCaller
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Solo el admin puede crear usuarios" }), {
        status: 403,
      });
    }

    const body = await req.json();
    const {
      email,
      full_name,
      salary_amount = 0,
      salary_frequency_days = 7,
      transfer_limit_per_tx = null,
      transfer_limit_daily = null,
    } = body;

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "Faltan email o nombre" }), { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const tempPassword = generarPasswordTemporal();

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });
    if (createError || !created?.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? "Error creando usuario" }), {
        status: 500,
      });
    }

    const { error: perfilError } = await supabaseAdmin.rpc("crear_perfil", {
      user_id: created.user.id,
      p_full_name: full_name,
      p_account_number: generarNumeroCuenta(),
      p_salary_amount: salary_amount,
      p_salary_frequency_days: salary_frequency_days,
      p_transfer_limit_per_tx: transfer_limit_per_tx,
      p_transfer_limit_daily: transfer_limit_daily,
    });
    if (perfilError) {
      return new Response(JSON.stringify({ error: perfilError.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ email, temp_password: tempPassword, user_id: created.user.id }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
