/**
 * Auto-Lock Sessions Edge Function
 *
 * Purpose: Automatically lock all open attendance sessions at 18:00 daily cutoff
 * Schedule: Daily at 18:00 (São Paulo timezone)
 * Spec: .agent-os/specs/2025-09-29-enhanced-abrir-aula-workflow/spec.md
 *
 * Brazilian Educational Compliance:
 * - Implements "não existe o esquecer" principle
 * - Converts attendance records to immutable legal documents
 * - Enforces INEP daily cutoff requirements
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for monitoring dashboard calls
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutoLockResult {
  success: boolean;
  sessoes_fechadas: number;
  sessoes_ids: string[];
  timestamp_execucao: string;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get current São Paulo time
    const now = new Date();
    const saoPauloTime = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);

    console.log(`[Auto-Lock] Executing at ${saoPauloTime} (São Paulo time)`);

    // Call database function to lock sessions
    const { data, error } = await supabase.rpc("fn_auto_fechar_sessoes_enhanced");

    if (error) {
      console.error("[Auto-Lock] Database error:", error);
      throw error;
    }

    // Parse result (function returns INTEGER or TABLE)
    const sessoesFechadas = typeof data === "number" ? data : data?.sessoes_fechadas || 0;
    const sessoesIds = typeof data === "object" ? data?.sessoes_ids || [] : [];
    const timestampExecucao = typeof data === "object" ? data?.timestamp_execucao : now.toISOString();

    const result: AutoLockResult = {
      success: true,
      sessoes_fechadas: sessoesFechadas,
      sessoes_ids: Array.isArray(sessoesIds) ? sessoesIds : [],
      timestamp_execucao: timestampExecucao || now.toISOString(),
    };

    console.log(`[Auto-Lock] Successfully locked ${sessoesFechadas} sessions`);
    console.log(`[Auto-Lock] Session IDs:`, result.sessoes_ids);

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  } catch (error) {
    console.error("[Auto-Lock] Critical error:", error);

    const errorResult: AutoLockResult = {
      success: false,
      sessoes_fechadas: 0,
      sessoes_ids: [],
      timestamp_execucao: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return new Response(JSON.stringify(errorResult), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});

/**
 * DEPLOYMENT INSTRUCTIONS:
 *
 * 1. Deploy to Supabase:
 *    supabase functions deploy auto-lock-sessions
 *
 * 2. Schedule via Supabase Dashboard:
 *    - Navigate to Edge Functions → auto-lock-sessions
 *    - Enable cron schedule: 0 18 * * * (daily at 18:00)
 *    - Timezone: America/Sao_Paulo
 *
 * 3. Test manually:
 *    curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/auto-lock-sessions \
 *      -H "Authorization: Bearer YOUR_ANON_KEY"
 *
 * 4. Monitor logs:
 *    supabase functions logs auto-lock-sessions
 *
 * 5. Verify execution:
 *    SELECT * FROM sessoes_aula WHERE travada_em::date = CURRENT_DATE;
 */