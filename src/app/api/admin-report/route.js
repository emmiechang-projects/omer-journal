import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export async function GET(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Get all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, display_name, title, company, created_at, enriched_at, referral_code, referral_count, referred_by')
    .order('created_at', { ascending: false });

  if (!profiles) {
    return Response.json({ error: 'Could not fetch profiles' });
  }

  // Get entry counts per user
  const { data: entries } = await supabase
    .from('entries')
    .select('user_id, day');

  const entryCounts = {};
  if (entries) {
    entries.forEach(e => {
      entryCounts[e.user_id] = (entryCounts[e.user_id] || 0) + 1;
    });
  }

  // Calculate new users in last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const newUsers = profiles.filter(p => new Date(p.created_at) > yesterday);

  // Omer day
  const OMER_START = new Date("2026-04-02");
  const now = new Date();
  const currentDay = Math.floor((now - OMER_START) / (1000 * 60 * 60 * 24));

  // Estimate API costs
  // ~$0.01-0.02 per Claude Sonnet call, ~$0.001 per Apollo lookup
  const usersWithEntries = profiles.filter(p => entryCounts[p.id] > 0).length;
  const totalEntries = entries ? entries.length : 0;
  const estimatedClaudeCost = (usersWithEntries * currentDay * 0.015).toFixed(2);
  const estimatedApolloCost = (profiles.length * 0.02).toFixed(2);

  // Build user table rows
  const userRows = profiles.map(p => {
    const count = entryCounts[p.id] || 0;
    const isNew = new Date(p.created_at) > yesterday;
    const signupDate = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const referredByEmail = p.referred_by ? profiles.find(r => r.id === p.referred_by)?.email?.split('@')[0] || '?' : '—';
    return `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 8px 12px; font-size: 13px;">${isNew ? '🆕 ' : ''}${p.display_name || '—'}</td>
        <td style="padding: 8px 12px; font-size: 13px;">${p.email}</td>
        <td style="padding: 8px 12px; font-size: 13px;">${p.title || '—'}</td>
        <td style="padding: 8px 12px; font-size: 13px;">${p.company || '—'}</td>
        <td style="padding: 8px 12px; font-size: 13px; text-align: center;">${count}</td>
        <td style="padding: 8px 12px; font-size: 13px; text-align: center;">${p.referral_count || 0}</td>
        <td style="padding: 8px 12px; font-size: 13px;">${referredByEmail}</td>
        <td style="padding: 8px 12px; font-size: 13px;">${signupDate}</td>
      </tr>
    `;
  }).join('');

  const emailHtml = `
    <div style="font-family: Helvetica Neue, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #2a2520; background-color: #faf8f5;">
      <h1 style="font-size: 22px; font-weight: 500; margin: 0 0 4px 0;">Count the Omer — Daily Report</h1>
      <p style="font-size: 13px; color: #998b7d; margin: 0 0 32px 0;">Day ${currentDay} of 49 · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>

      <div style="display: flex; gap: 16px; margin-bottom: 32px;">
        <div style="flex: 1; padding: 20px; background: white; border-radius: 8px; border: 1px solid #eee; text-align: center;">
          <p style="font-size: 32px; font-weight: 600; margin: 0; color: #D4A574;">${profiles.length}</p>
          <p style="font-size: 12px; color: #998b7d; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Total Users</p>
        </div>
        <div style="flex: 1; padding: 20px; background: white; border-radius: 8px; border: 1px solid #eee; text-align: center;">
          <p style="font-size: 32px; font-weight: 600; margin: 0; color: #D4A574;">${newUsers.length}</p>
          <p style="font-size: 12px; color: #998b7d; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">New Today</p>
        </div>
        <div style="flex: 1; padding: 20px; background: white; border-radius: 8px; border: 1px solid #eee; text-align: center;">
          <p style="font-size: 32px; font-weight: 600; margin: 0; color: #D4A574;">${totalEntries}</p>
          <p style="font-size: 12px; color: #998b7d; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Total Entries</p>
        </div>
        <div style="flex: 1; padding: 20px; background: white; border-radius: 8px; border: 1px solid #eee; text-align: center;">
          <p style="font-size: 32px; font-weight: 600; margin: 0; color: #D4A574;">${usersWithEntries}</p>
          <p style="font-size: 12px; color: #998b7d; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Active Writers</p>
        </div>
      </div>

      <div style="margin-bottom: 32px; padding: 16px 20px; background: white; border-radius: 8px; border: 1px solid #eee;">
        <p style="font-size: 13px; font-weight: 600; margin: 0 0 8px 0;">Estimated Costs (cumulative)</p>
        <p style="font-size: 13px; color: #666; margin: 0;">Claude API (daily emails): ~$${estimatedClaudeCost}</p>
        <p style="font-size: 13px; color: #666; margin: 4px 0 0 0;">Apollo enrichment: ~$${estimatedApolloCost}</p>
        <p style="font-size: 13px; color: #666; margin: 4px 0 0 0;">Resend emails: free tier</p>
        <p style="font-size: 13px; font-weight: 600; color: #D4A574; margin: 8px 0 0 0;">Total: ~$${(parseFloat(estimatedClaudeCost) + parseFloat(estimatedApolloCost)).toFixed(2)}</p>
      </div>

      <h2 style="font-size: 16px; font-weight: 500; margin: 0 0 12px 0;">All Users</h2>
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; border: 1px solid #eee;">
          <thead>
            <tr style="background: #f5f0eb;">
              <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; color: #998b7d;">Name</th>
              <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; color: #998b7d;">Email</th>
              <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; color: #998b7d;">Title</th>
              <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; color: #998b7d;">Company</th>
              <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: center; color: #998b7d;">Entries</th>
              <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: center; color: #998b7d;">Refs</th>
              <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; color: #998b7d;">Via</th>
              <th style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: left; color: #998b7d;">Joined</th>
            </tr>
          </thead>
          <tbody>
            ${userRows}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center;">
        <p style="font-size: 11px; color: #b8ad9f;">counttheomer.com · Admin Report</p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: 'Omer Admin <omer@counttheomer.com>',
    to: 'emmie.chang+omer@gmail.com',
    subject: `Omer Report · Day ${currentDay} · ${profiles.length} users · ${newUsers.length} new today`,
    html: emailHtml,
  });

  return Response.json({
    message: 'Admin report sent',
    totalUsers: profiles.length,
    newToday: newUsers.length,
    totalEntries,
    activeWriters: usersWithEntries,
  });
}
