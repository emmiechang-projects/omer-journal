import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return Response.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Store userId in a cookie so callback can associate the token
  const cookieStore = await cookies();
  cookieStore.set('whoop_user_id', userId, { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  const scopes = 'read:recovery read:sleep read:workout read:cycles';
  const redirectUri = 'https://counttheomer.com/api/auth/whoop/callback';

  const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth` +
    `?client_id=${process.env.WHOOP_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${userId}`;

  return Response.redirect(authUrl);
}
