import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { fetchWhoopData, formatWhoopForPrompt } from '@/lib/whoop';

export const maxDuration = 60;

const SEFIROT_WEEKS = [
  { name: "Chesed", meaning: "Lovingkindness" },
  { name: "Gevurah", meaning: "Discipline" },
  { name: "Tiferet", meaning: "Harmony" },
  { name: "Netzach", meaning: "Endurance" },
  { name: "Hod", meaning: "Humility" },
  { name: "Yesod", meaning: "Foundation" },
  { name: "Malchut", meaning: "Sovereignty" },
];
const SEFIROT_DAYS = ["Chesed", "Gevurah", "Tiferet", "Netzach", "Hod", "Yesod", "Malchut"];

const COSMIC_NOTES = {
  7: "Mars enters Aries", 10: "Mars conjunct Neptune", 12: "Mercury enters Aries",
  14: "New Moon", 17: "Sun enters Taurus", 23: "Uranus enters Gemini",
  26: "Venus squares lunar nodes", 29: "Full Flower Moon in Scorpio",
  42: "Mercury cazimi", 47: "Mercury squares lunar nodes",
};

function getSefirahInfo(day) {
  if (day === 0) return { combined: "Passover — Setting Intention", week: null, weekNum: 0 };
  const weekIdx = Math.floor((day - 1) / 7);
  const dayIdx = (day - 1) % 7;
  return {
    combined: `${SEFIROT_DAYS[dayIdx]} within ${SEFIROT_WEEKS[weekIdx].name}`,
    week: SEFIROT_WEEKS[weekIdx],
    dayOf: SEFIROT_DAYS[dayIdx],
    weekNum: weekIdx + 1,
    dayOfWeek: dayIdx + 1,
    isFirstDayOfWeek: dayIdx === 0,
  };
}

function pickEmailMode(day, entryCount) {
  const sefirah = getSefirahInfo(day);
  
  // First day of a new week = weekly reflection
  if (sefirah.isFirstDayOfWeek && day > 1) return 'weekly_reflection';
  
  // Few entries = keep it light
  if (entryCount < 3) return 'surprise_delight';
  
  // Weighted random for the rest
  const weekNum = sefirah.weekNum;
  let modes;
  
  if (weekNum <= 2) {
    // Weeks 1-2: lighter touch
    modes = ['single_day', 'surprise_delight', 'surprise_delight', 'gentle_nudge'];
  } else if (weekNum <= 4) {
    // Weeks 3-4: going deeper
    modes = ['pattern_spotter', 'single_day', 'challenge', 'surprise_delight', 'callback'];
  } else if (weekNum <= 6) {
    // Weeks 5-6: full depth
    modes = ['deep_pattern', 'challenge', 'callback', 'pattern_spotter', 'narrative'];
  } else {
    // Week 7: synthesis
    modes = ['synthesis', 'narrative', 'deep_pattern', 'callback'];
  }
  
  return modes[Math.floor(Math.random() * modes.length)];
}

function buildPrompt(day, entries, mode, profile, whoopContext) {
  const sefirah = getSefirahInfo(day);
  const cosmicNote = COSMIC_NOTES[day] || '';
  const entryCount = Object.keys(entries).length;
  const weekNum = sefirah.weekNum;
  const firstName = profile?.display_name?.split(' ')[0] 
    || profile?.email?.split('@')[0]?.split('.')[0]?.replace(/[^a-zA-Z]/g, '') 
    || '';

  const dayNumbers = Object.keys(entries).map(Number).sort((a, b) => a - b);
  const lastEntryDay = dayNumbers.length > 0 ? dayNumbers[dayNumbers.length - 1] : -1;
  const daysSinceLastEntry = day - lastEntryDay;
  const missedDays = daysSinceLastEntry > 1;

  let professionalContext = '';
  if (profile && !profile.personalization_opt_out) {
    const parts = [];
    if (profile.title && profile.company) parts.push(`${profile.title} at ${profile.company}`);
    else if (profile.title) parts.push(profile.title);
    else if (profile.company) parts.push(`Works at ${profile.company}`);
    if (profile.industry) parts.push(`Industry: ${profile.industry}`);
    if (profile.bio) parts.push(`About them: ${profile.bio}`);
    if (parts.length > 0) professionalContext = parts.join('. ');
  }

  const entriesText = Object.entries(entries)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([d, e]) => `Day ${d}: ${e.text}`)
    .join('\n\n');

  const allFormats = ['the_mirror', 'the_story', 'the_teaching', 'the_challenge', 'the_gift', 'the_callback'];
  const lastFormat = profile?.last_email_format || '';
  let format;
  if (missedDays) {
    format = 'the_gift';
  } else if (sefirah.isFirstDayOfWeek && day > 1 && entryCount >= 7) {
    format = 'the_callback';
  } else if (entryCount <= 2) {
    const early = ['the_gift', 'the_mirror', 'the_teaching'].filter(f => f !== lastFormat);
    format = early[Math.floor(Math.random() * early.length)];
  } else if (entryCount <= 5) {
    const mid = ['the_mirror', 'the_story', 'the_teaching', 'the_gift'].filter(f => f !== lastFormat);
    format = mid[Math.floor(Math.random() * mid.length)];
  } else {
    const available = allFormats.filter(f => f !== lastFormat);
    format = available[Math.floor(Math.random() * available.length)];
  }

  const formatPrompts = {
    the_mirror: `FORMAT: "The Mirror" — Show them a PATTERN they cannot see. Do NOT recap what they wrote. Synthesize across entries to reveal something hidden — a contradiction, a shift, a blind spot, a strength they don't recognize. Analyze through the lens of today's sefirah and the Omer journey.

ACTION: End with a "reframe" — a new way to see something. "Try this: next time you [specific thing], notice [hidden thing]." Then a question on its own line.`,

    the_story: `FORMAT: "The Story" — Find something HIDDEN they haven't noticed — a pattern, a coincidence, cause-and-effect. Present it as a discovery, something exciting. Analyze through the Omer lens. Do NOT summarize their entries.

ACTION: End with "A small experiment:" — something specific and practical to try tomorrow tied to the insight. Then a question on its own line.`,

    the_teaching: `FORMAT: "The Teaching" — Open with Torah, Talmud, Pirkei Avot, Chassidic wisdom, Midrash, or a rabbi's teaching. The teaching comes FIRST. Then connect it to their life in a surprising way. The connection should feel inevitable but unexpected. Do NOT recap entries.

ACTION: End with a Jewish practice to try tonight — a specific bracha, ritual, or kavannah before writing. Then a question on its own line.`,

    the_challenge: `FORMAT: "The Challenge" — Pick something in their entries that was comfortable or surface-level. Lovingly call it out. Be the friend who says "are you sure?" Push one level deeper. Be direct and a little funny.

ACTION: End with "Here's the move:" — one concrete thing to do RIGHT NOW before opening the journal. Then a question on its own line.`,

    the_gift: `FORMAT: "The Gift" — No analysis. No patterns. Something beautiful, surprising, or funny tied to today's sefirah or cosmic energy. A weird observation, unexpected metaphor, or moment of delight. Make them smile or feel something unexpected.

ACTION: End with one tiny delightful action — text someone, step outside, write one sentence, light a candle. Then a question on its own line.`,

    the_callback: `FORMAT: "The Callback" — Connect two moments far apart in their journey. Show the DELTA — who they were then vs now. Don't recap either entry. Just show the distance traveled. Make growth feel earned and undeniable.

ACTION: End with "Do this:" — read an old entry, then write a response to that version of yourself in tonight's entry. Then a question on its own line.`,
  };

  const promptText = `You're writing a short evening email to ${firstName || 'someone'} during the Omer — 49 days from Passover to Shavuot.

${formatPrompts[format]}

CONTEXT:
- Day ${day} of 49. ${sefirah.combined} (${sefirah.week?.meaning || ''}).
- Week ${weekNum}. They've written ${entryCount} entries.
${missedDays ? `- Haven't written in ${daysSinceLastEntry} days. Welcome back, no guilt.` : ''}
${cosmicNote ? `- ${cosmicNote}` : ''}
${professionalContext ? `- Who they are: ${professionalContext}` : ''}

THEIR ENTRIES (for synthesis — do NOT reiterate these back):
${entriesText || '(No entries yet)'}
${whoopContext || ''}

CRITICAL FORMATTING RULES:
- Start with "${firstName || 'Hey'}," on its own line, then TWO blank lines before the first paragraph.
- SEPARATE EVERY THOUGHT WITH TWO BLANK LINES. This is essential. Each paragraph should be 1-3 sentences max. The email should have 4-6 short paragraphs with blank lines between them.
- The action/tip goes in its own paragraph near the end.
- The final question goes on its own line at the very end, separated by two blank lines.
- Example structure (follow this exactly):

${firstName || 'Hey'},

[First paragraph — the hook or insight. 1-2 sentences.]

[Second paragraph — going deeper. 2-3 sentences.]

[Third paragraph — the action or tip. 1-2 sentences.]

[Final question on its own. One sentence ending in ?]

CRITICAL VOICE RULES:
- NEVER say "welcome back, friend" or "dear friend" or any greeting card language.
- NEVER reiterate or summarize what they wrote. Synthesize, provoke, surprise.
- Sound like a smart, funny friend texting you something that makes you stop and think. Not a sermon. Not a life coach.
- If they have professional context, weave it in only when it genuinely connects.
- No asterisks. No bullet points. No headers. No emojis. No "I noticed that" or "your entries reveal."
- Say "your journal" or "tonight's entry" when referencing writing.
- Every sentence earns its place. Cut anything generic or flowery.
- Write the email body only. No subject line, no sign-off.`;

  return { prompt: promptText, format };
}

export async function GET(request) {
  // Verify this is a cron job call
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && !process.env.VERCEL_URL?.includes('localhost')) {
    // Allow without auth on Vercel (cron jobs are authenticated by Vercel itself)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Calculate current Omer day (server-side, UTC-based, 3am UTC ≈ 7pm PST)
  const OMER_START = new Date("2026-04-02");
  const now = new Date();
  const diffMs = now - OMER_START;
  const currentDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (currentDay < 1 || currentDay > 49) {
    return Response.json({ message: 'Outside Omer period', day: currentDay });
  }

  // Get ALL users (not just those with entries — we want to nudge inactive ones too)
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, email, display_name, title, company, industry, bio, personalization_opt_out, referral_code, last_email_format, referral_count, whoop_connected, whoop_access_token, whoop_refresh_token, whoop_token_expires_at');

  if (!allProfiles || allProfiles.length === 0) {
    return Response.json({ message: 'No users' });
  }

  // Get all entries
  const { data: allEntries } = await supabase
    .from('entries')
    .select('user_id, day, text')
    .order('day');

  let sent = 0;
  let errors = 0;
  let skipped = 0;

  for (const profile of allProfiles) {
    try {
      if (!profile.email) continue;

      // Get this user's entries
      const userEntries = (allEntries || []).filter(e => e.user_id === profile.id);
      const entriesMap = {};
      userEntries.forEach(e => { entriesMap[e.day] = e; });

      // Calculate days since last entry
      const dayNumbers = userEntries.map(e => e.day).sort((a, b) => a - b);
      const lastEntryDay = dayNumbers.length > 0 ? dayNumbers[dayNumbers.length - 1] : -1;
      const daysSinceLastEntry = lastEntryDay >= 0 ? currentDay - lastEntryDay : currentDay;

      // FREQUENCY LOGIC: Should we send today?
      let shouldSend = true;
      let emailType = 'reflection'; // reflection, nudge, reactivation, final

      if (currentDay <= 7) {
        // First week: always send to everyone
        shouldSend = true;
        if (userEntries.length === 0) emailType = 'nudge';
      } else if (daysSinceLastEntry <= 2) {
        // Active: send daily full reflection
        shouldSend = true;
        emailType = 'reflection';
      } else if (daysSinceLastEntry <= 5) {
        // 3-5 days inactive: every other day
        shouldSend = currentDay % 2 === 0;
        emailType = 'nudge';
      } else if (daysSinceLastEntry <= 13) {
        // 6-13 days inactive: once per week (every 7th day)
        shouldSend = currentDay % 7 === 0;
        emailType = 'reactivation';
      } else if (daysSinceLastEntry <= 15) {
        // 14-15 days: one final email
        shouldSend = daysSinceLastEntry === 14;
        emailType = 'final';
      } else {
        // 16+ days: stop completely
        shouldSend = false;
      }

      if (!shouldSend) {
        skipped++;
        continue;
      }

      const sefirah = getSefirahInfo(currentDay);
      const dayCosmicNote = COSMIC_NOTES[currentDay] || '';
      const weekMeaning = sefirah.week?.meaning || '';
      const dayMeaning = sefirah.dayOf ? SEFIROT_WEEKS[SEFIROT_DAYS.indexOf(sefirah.dayOf)]?.meaning || '' : '';
      const englishMeaning = dayMeaning && weekMeaning ? `${dayMeaning} within ${weekMeaning}` : '';
      const firstName = profile.display_name?.split(' ')[0] 
        || profile.email?.split('@')[0]?.split('.')[0]?.replace(/[^a-zA-Z]/g, '') 
        || '';

      let reflection = '';
      let format = 'none';

      if (emailType === 'reflection') {
        // Fetch Whoop data if connected
        let whoopContext = '';
        if (profile.whoop_connected) {
          try {
            const whoopData = await fetchWhoopData(profile);
            whoopContext = formatWhoopForPrompt(whoopData);
          } catch (err) {
            console.error(`Whoop fetch error for ${profile.id}:`, err);
          }
        }

        // Full AI reflection — only for active users with entries
        const result = buildPrompt(currentDay, entriesMap, null, profile, whoopContext);
        format = result.format;

        const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 800,
            messages: [{ role: 'user', content: result.prompt }],
          }),
        });

        const claudeData = await claudeResponse.json();
        reflection = claudeData.content?.[0]?.text || '';

        if (!reflection) {
          console.error(`No reflection for ${profile.id}:`, JSON.stringify(claudeData));
          errors++;
          continue;
        }
      } else if (emailType === 'nudge') {
        // Short nudge — no AI needed
        const nudges = [
          `${firstName || 'Hey'},\n\nDay ${currentDay}. ${sefirah.combined}.\n\nYour journal hasn't heard from you in a few days. No catching up required — just write one thing tonight. Even a sentence counts.\n\nThe Omer doesn't grade you. It just keeps counting.`,
          `${firstName || 'Hey'},\n\nIt's Day ${currentDay} and ${sefirah.combined} — ${englishMeaning || 'a good night to show up'}.\n\nYou don't need to write a masterpiece. You just need to write. Tonight's prompt is waiting and it's a good one.\n\nWhat's one thing on your mind right now?`,
          `${firstName || 'Hey'},\n\nDay ${currentDay}. Still here. Still counting.\n\n${userEntries.length} entries so far — that's ${userEntries.length} more than most people will ever write about their inner life. Come add one more tonight.\n\nWhat shifted for you this week?`,
        ];
        reflection = nudges[currentDay % nudges.length];
      } else if (emailType === 'reactivation') {
        // Weekly reactivation — FOMO + easy re-entry
        reflection = `${firstName || 'Hey'},\n\nIt's been a minute. Here's what you're missing:\n\nWe're on Day ${currentDay} of 49 — ${sefirah.combined} (${englishMeaning}). ${dayCosmicNote ? dayCosmicNote + '.' : ''} ${Object.keys(entriesMap).length > 0 ? `You wrote ${Object.keys(entriesMap).length} entries before you paused, and they're all still there.` : ''}\n\nYou don't need to backfill. You don't need to catch up. Just open your journal tonight and write whatever's true right now. One sentence. That's all it takes to be back.\n\nWhat's different about your life since the last time you wrote?`;
      } else if (emailType === 'final') {
        // Final email — open door, then silence
        reflection = `${firstName || 'Hey'},\n\nThis is the last nudge — promise.\n\nYour Omer journal is at counttheomer.com, right where you left it. ${Object.keys(entriesMap).length > 0 ? `Your ${Object.keys(entriesMap).length} entries are saved.` : ''} If you want to come back, the door's open. If not, no hard feelings.\n\nThe Omer keeps counting either way. And so do you — whether you write it down or not.\n\nHope to see you back. If not, chag sameach when Shavuot comes.`;
      }

      // Send email
      const emailHtml = `
        <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 40px 20px; color: #2a2520; background-color: #faf8f5;">
          <div style="text-align: center; margin-bottom: 32px;">
            <p style="font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: #998b7d; font-family: Helvetica Neue, sans-serif; margin: 0;">Day ${currentDay} of 49</p>
            <h1 style="font-size: 24px; font-weight: 400; font-style: italic; margin: 8px 0 4px 0; color: #2a2520;">${sefirah.combined}</h1>
            ${englishMeaning ? `<p style="font-size: 14px; color: #998b7d; margin: 4px 0 0 0;">${englishMeaning}</p>` : ''}
            ${dayCosmicNote ? `<p style="font-size: 12px; color: #b8ad9f; font-family: Helvetica Neue, sans-serif; margin: 8px 0 0 0;">${dayCosmicNote}</p>` : ''}
          </div>
          
          <div style="border-left: 2px solid #D4A574; padding: 20px 24px; margin-bottom: 32px; background-color: rgba(212,165,116,0.05); border-radius: 0 4px 4px 0;">
            <p style="font-size: 17px; line-height: 1.8; margin: 0; color: #4a3f35; font-style: italic;">
              ${reflection.replace(/\n\n/g, '</p><p style="font-size: 17px; line-height: 1.8; margin: 16px 0 0 0; color: #4a3f35; font-style: italic;">').replace(/\n/g, '<br>')}
            </p>
          </div>

          <div style="text-align: center; margin-bottom: 32px;">
            <a href="https://counttheomer.com/journal" 
               style="display: inline-block; padding: 14px 40px; background-color: #D4A574; color: #1a1a1a; text-decoration: none; border-radius: 4px; font-family: Helvetica Neue, sans-serif; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; font-weight: 500;">
              Write Tonight's Entry
            </a>
          </div>

          ${profile.referral_code ? `
          <div style="text-align: center; margin-bottom: 24px; padding: 16px 20px; background-color: rgba(212,165,116,0.05); border-radius: 6px;">
            <p style="font-size: 13px; color: #998b7d; font-family: Helvetica Neue, sans-serif; margin: 0 0 6px 0;">
              ${['The Omer hits different with people you love. Share your link:', 'Know someone who needs this? Send them your link:', 'Counting alone is fine. Counting together is better.', 'Forward this to someone who could use 49 days of reflection:'][currentDay % 4]}
            </p>
            <a href="https://counttheomer.com/?ref=${profile.referral_code}" style="font-size: 14px; color: #D4A574; font-family: Helvetica Neue, sans-serif; text-decoration: none; font-weight: 500;">
              counttheomer.com/?ref=${profile.referral_code}
            </a>
            ${(profile.referral_count || 0) > 0 ? `<p style="font-size: 12px; color: #b8ad9f; font-family: Helvetica Neue, sans-serif; margin: 6px 0 0 0;">${profile.referral_count} friend${profile.referral_count > 1 ? 's have' : ' has'} joined through you</p>` : ''}
          </div>
          ` : ''}

          <div style="text-align: center; padding-top: 24px; border-top: 1px solid rgba(0,0,0,0.06);">
            <p style="font-size: 13px; color: #998b7d; font-family: Georgia, serif; font-style: italic; margin: 0 0 16px 0;">
              A 49-day spiritual journal from Passover to Shavuot, guided by the sefirot, moon phases, and daily mantras.
            </p>
            <p style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #b8ad9f; font-family: Helvetica Neue, sans-serif;">
              Passover → Shavuot · From freedom to revelation
            </p>
            <p style="font-size: 12px; color: #998b7d; font-family: Helvetica Neue, sans-serif; margin-top: 8px;">
              Made with ♡ by a tech founder in SF · 
              <a href="https://www.linkedin.com/in/emmie" style="color: #D4A574; text-decoration: none;">Say hi</a>
              · <a href="https://counttheomer.com/privacy" style="color: #b8ad9f; text-decoration: none;">Privacy</a>
            </p>
            <p style="font-size: 11px; color: #b8ad9f; font-family: Helvetica Neue, sans-serif; margin-top: 6px;">
              In community with <a href="https://www.valueculture.org" style="color: #998b7d; text-decoration: none;">Value Culture</a>, California Non-Profit
            </p>
          </div>
        </div>
      `;

      await resend.emails.send({
        from: 'Omer Journal <omer@counttheomer.com>',
        replyTo: 'emmie.chang+omer@gmail.com',
        to: profile.email,
        subject: `Day ${currentDay} · ${sefirah.combined}${englishMeaning ? ' · ' + englishMeaning : ''} 🌙`,
        html: emailHtml,
      });

      // Save which format was used (for next time, avoid repeats)
      if (format !== 'none') {
        await supabase
          .from('profiles')
          .update({ last_email_format: format })
          .eq('id', profile.id);
      }

      sent++;
    } catch (err) {
      console.error(`Error for user ${profile?.id || 'unknown'}:`, err);
      errors++;
    }
  }

  return Response.json({ 
    message: `Sent ${sent}, skipped ${skipped}, errors ${errors}`, 
    day: currentDay,
    sent,
    skipped,
    errors,
    totalUsers: allProfiles.length,
  });
}
