import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  const { userId, email, referredBy } = await request.json();

  if (!userId || !email) {
    return Response.json({ error: 'Missing userId or email' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Generate referral code from email prefix + random chars
  const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toLowerCase();
  const randomSuffix = Math.random().toString(36).slice(2, 5);
  const referralCode = `${emailPrefix}${randomSuffix}`;

  try {
    // Handle referral tracking
    let referredById = null;
    if (referredBy) {
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id, referral_count')
        .eq('referral_code', referredBy)
        .single();

      if (referrer) {
        referredById = referrer.id;
        // Increment referrer's count
        await supabase
          .from('profiles')
          .update({ referral_count: (referrer.referral_count || 0) + 1 })
          .eq('id', referrer.id);
      }
    }

    // Call Apollo People Match API
    let profileData = {
      referral_code: referralCode,
      enriched_at: new Date().toISOString(),
    };

    if (referredById) {
      profileData.referred_by = referredById;
    }

    if (process.env.APOLLO_API_KEY) {
      try {
        const apolloResponse = await fetch('https://api.apollo.io/v1/people/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({
            api_key: process.env.APOLLO_API_KEY,
            email: email,
          }),
        });

        const apolloData = await apolloResponse.json();
        const person = apolloData.person;

        if (person) {
          profileData.title = person.title || null;
          profileData.company = person.organization?.name || null;
          profileData.industry = person.organization?.industry || null;
          profileData.company_size = person.organization?.estimated_num_employees
            ? `${person.organization.estimated_num_employees} employees`
            : null;
          profileData.linkedin_url = person.linkedin_url || null;
          profileData.display_name = person.first_name
            ? `${person.first_name}${person.last_name ? ' ' + person.last_name : ''}`
            : null;
        }
      } catch (apolloErr) {
        console.error('Apollo error (non-fatal):', apolloErr);
      }
    }

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId);

    if (error) {
      console.error('Profile update error:', error);
      return Response.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return Response.json({
      message: 'Profile enriched',
      enriched: true,
      referralCode,
      title: profileData.title,
      company: profileData.company,
    });
  } catch (err) {
    console.error('Enrichment error:', err);
    return Response.json({ error: 'Enrichment failed' }, { status: 500 });
  }
}
