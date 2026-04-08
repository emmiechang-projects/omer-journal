// Visit /api/test-email?email=your@email.com to test
// Remove this file before going to production

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get('email');
  
  if (!testEmail) {
    return Response.json({ error: 'Add ?email=your@email.com to test' });
  }

  // Trigger the daily email endpoint
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
    
  const res = await fetch(`${baseUrl}/api/daily-email`);
  const data = await res.json();
  
  return Response.json({ message: 'Test triggered', result: data });
}
