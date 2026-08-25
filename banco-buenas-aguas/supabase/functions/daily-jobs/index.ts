// ============================================================
// Edge Function: daily-jobs
// Invocada diariamente por pg_cron (o por el scheduler de Supabase).
// Aplica impuestos recurrentes que tocan y el interés de ahorro.
// Usa la service role key: se ejecuta del lado servidor, nunca en el cliente.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Protege el endpoint: solo pg_cron / llamadas con el secreto interno
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== Deno.env.get("CRON_SECRET")) {
    return new Response("No autorizado", { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const resultados: Record<string, unknown> = {};

  // 1. Impuestos recurrentes que tocan hoy
  const { data: taxes, error: taxesError } = await supabase
    .from("taxes")
    .select("*")
    .eq("kind", "recurrente")
    .eq("active", true);

  if (taxesError) {
    return new Response(JSON.stringify({ error: taxesError.message }), { status: 500 });
  }

  const aplicados: string[] = [];
  const ahora = new Date();

  for (const tax of taxes ?? []) {
    const ultimaVez = tax.last_applied_at ? new Date(tax.last_applied_at) : null;
    const toca =
      !ultimaVez ||
      ahora.getTime() - ultimaVez.getTime() >= (tax.frequency_days ?? 0) * 86400000;

    if (toca) {
      const { error } = await supabase.rpc("aplicar_impuesto", { tax_id: tax.id });
      if (!error) aplicados.push(tax.id);
    }
  }
  resultados.impuestos_aplicados = aplicados;

  // 2. Interés de ahorro (la propia función comprueba si toca según frequency_days)
  const { error: interesError } = await supabase.rpc("aplicar_interes_ahorro");
  resultados.interes_ahorro = interesError ? { error: interesError.message } : "ok";

  return new Response(JSON.stringify(resultados), {
    headers: { "Content-Type": "application/json" },
  });
});
