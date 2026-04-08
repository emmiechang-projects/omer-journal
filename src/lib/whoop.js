import { createClient } from '@supabase/supabase-js';

// Refresh Whoop access token if expired
async function refreshTokenIfNeeded(profile, supabase) {
  const now = new Date();
  const expiresAt = new Date(profile.whoop_token_expires_at);

  // Refresh if expiring in next 5 minutes
  if (now < new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
    return profile.whoop_access_token;
  }

  try {
    const response = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: profile.whoop_refresh_token,
        client_id: process.env.WHOOP_CLIENT_ID,
        client_secret: process.env.WHOOP_CLIENT_SECRET,
        scope: 'offline read:recovery read:sleep read:workout read:cycles',
      }),
    });

    const data = await response.json();

    if (!data.access_token) {
      console.error('Whoop token refresh failed:', data);
      return null;
    }

    const newExpiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString();

    await supabase
      .from('profiles')
      .update({
        whoop_access_token: data.access_token,
        whoop_refresh_token: data.refresh_token || profile.whoop_refresh_token,
        whoop_token_expires_at: newExpiresAt,
      })
      .eq('id', profile.id);

    return data.access_token;
  } catch (err) {
    console.error('Whoop refresh error:', err);
    return null;
  }
}

// Fetch today's Whoop data for a user
export async function fetchWhoopData(profile) {
  if (!profile.whoop_connected || !profile.whoop_access_token) {
    return null;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const accessToken = await refreshTokenIfNeeded(profile, supabase);
  if (!accessToken) return null;

  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    // Fetch recovery (most recent)
    const recoveryRes = await fetch('https://api.prod.whoop.com/developer/v1/recovery?limit=1', { headers });
    const recoveryData = await recoveryRes.json();
    const recovery = recoveryData.records?.[0];

    // Fetch sleep (most recent)
    const sleepRes = await fetch('https://api.prod.whoop.com/developer/v1/activity/sleep?limit=1', { headers });
    const sleepData = await sleepRes.json();
    const sleep = sleepData.records?.[0];

    // Fetch cycle (most recent — contains strain)
    const cycleRes = await fetch('https://api.prod.whoop.com/developer/v1/cycle?limit=1', { headers });
    const cycleData = await cycleRes.json();
    const cycle = cycleData.records?.[0];

    // Build a human-readable summary for the AI
    const metrics = {};

    if (recovery?.score) {
      metrics.recoveryScore = recovery.score.recovery_score;
      metrics.hrv = recovery.score.hrv_rmssd_milli;
      metrics.restingHR = recovery.score.resting_heart_rate;
    }

    if (sleep?.score) {
      const durationMs = sleep.score.stage_summary?.total_in_bed_time_milli || 0;
      metrics.sleepHours = (durationMs / 3600000).toFixed(1);
      metrics.sleepScore = sleep.score.sleep_performance_percentage;
      metrics.remMinutes = Math.round((sleep.score.stage_summary?.total_rem_sleep_time_milli || 0) / 60000);
      metrics.deepMinutes = Math.round((sleep.score.stage_summary?.total_slow_wave_sleep_time_milli || 0) / 60000);
    }

    if (cycle?.score) {
      metrics.strain = cycle.score.strain;
      metrics.calories = Math.round(cycle.score.kilojoule / 4.184);
    }

    // Only return if we got meaningful data
    if (Object.keys(metrics).length === 0) return null;

    return metrics;
  } catch (err) {
    console.error('Whoop data fetch error:', err);
    return null;
  }
}

// Format Whoop data for the AI prompt — NOT a stats dump, but context for synthesis
export function formatWhoopForPrompt(metrics) {
  if (!metrics) return '';

  const parts = [];

  if (metrics.recoveryScore !== undefined) {
    if (metrics.recoveryScore >= 67) parts.push(`Body is in the green — ${metrics.recoveryScore}% recovery. They're physically ready for whatever today throws at them.`);
    else if (metrics.recoveryScore >= 34) parts.push(`Body is in the yellow — ${metrics.recoveryScore}% recovery. Not depleted but not fully charged either. Operating at 60%.`);
    else parts.push(`Body is in the red — ${metrics.recoveryScore}% recovery. Their system is asking for rest and they may or may not be listening.`);
  }

  if (metrics.sleepHours) {
    if (parseFloat(metrics.sleepHours) >= 7.5) parts.push(`Slept ${metrics.sleepHours} hours — solid rest.`);
    else if (parseFloat(metrics.sleepHours) >= 6) parts.push(`Only ${metrics.sleepHours} hours of sleep. Running on less than ideal.`);
    else parts.push(`${metrics.sleepHours} hours of sleep. The body is keeping score even if the mind isn't.`);
  }

  if (metrics.hrv) {
    parts.push(`HRV at ${metrics.hrv.toFixed(0)}ms — ${metrics.hrv > 60 ? 'nervous system is calm and adaptive' : metrics.hrv > 40 ? 'moderate stress load' : 'high stress, low adaptability'}.`);
  }

  if (metrics.strain) {
    if (metrics.strain >= 14) parts.push(`High strain day (${metrics.strain.toFixed(1)}) — they pushed hard physically.`);
    else if (metrics.strain >= 8) parts.push(`Moderate strain (${metrics.strain.toFixed(1)}) — active but not maxed.`);
    else parts.push(`Low strain day (${metrics.strain.toFixed(1)}) — mostly rest or light activity.`);
  }

  if (parts.length === 0) return '';

  return `\nBODY DATA (from Whoop — use this as texture, NOT as a stats report. Weave it into the reflection naturally. Don't list numbers. Instead, notice what the body is saying and connect it to the sefirah or their journal entries):\n${parts.join(' ')}`;
}
