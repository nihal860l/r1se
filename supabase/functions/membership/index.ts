import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate via getClaims
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Service role client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Parse body once
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'check') {
      const { data, error } = await adminClient
        .from('memberships')
        .select('tier, is_active, expires_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      const isExpired = data?.expires_at && new Date(data.expires_at) < new Date();

      return new Response(JSON.stringify({
        tier: data?.tier || 'free',
        is_active: (data?.is_active ?? false) && !isExpired,
        expires_at: data?.expires_at || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'activate') {
      // Server-controlled activation — ready for future payment webhook integration
      // Only service role can write to memberships table (no INSERT/UPDATE RLS for users)
      const tier = body.tier || 'premium';
      const expires_at = body.expires_at || null;

      const { error } = await adminClient
        .from('memberships')
        .upsert({
          user_id: userId,
          tier,
          is_active: true,
          expires_at,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'deactivate') {
      const { error } = await adminClient
        .from('memberships')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use: check, activate, deactivate' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
