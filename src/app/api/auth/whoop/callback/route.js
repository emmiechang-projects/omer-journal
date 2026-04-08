import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId
  const error = searchParams.get('error');

  if (error) {
    return Response.redirect('https://counttheomer.com/profile?whoop=error');
  }

  if (!code || !state) {
    return Response.redirect('https://counttheomer.com/profile?whoop=missing');
  }

  const userId = state;
  const redirectUri = 'https://counttheomer.com/api/auth/whoop/callback';

  try {
    const basicAuth = Buffer.from(`${process.env.WHOOP_CLIENT_ID}:${process.env.WHOOP_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Whoop token response status:', tokenResponse.status);

    if (!tokenData.access_token) {
      console.error('Whoop token error:', JSON.stringify(tokenData));
      return Response.redirect('https://counttheomer.com/profile?whoop=token_error');
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

    await supabase
      .from('profiles')
      .update({
        whoop_access_token: tokenData.access_token,
        whoop_refresh_token: tokenData.refresh_token,
        whoop_token_expires_at: expiresAt,
        whoop_connected: true,
      })
      .eq('id', userId);

    return Response.redirect('https://counttheomer.com/profile?whoop=connected');
  } catch (err) {
    console.error('Whoop callback error:', err);
    return Response.redirect('https://counttheomer.com/profile?whoop=error');
  }
}
