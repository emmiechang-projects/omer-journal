export default function Privacy() {
  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#0f0f0f', color: '#e8e0d4',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      maxWidth: 600, margin: '0 auto', padding: '64px 24px',
    }}>
      <h1 style={{ fontSize: 28, fontWeight: 400, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: '#666', fontFamily: "'Helvetica Neue', sans-serif", letterSpacing: 2, textTransform: 'uppercase', marginBottom: 40 }}>
        Count the Omer · counttheomer.com
      </p>

      <div style={{ fontSize: 17, lineHeight: 1.8, color: '#9a9080' }}>
        <p style={{ marginBottom: 20 }}>
          This is a personal project built for fun by a tech founder in San Francisco. It is not a business. There is no company behind it. Just a person who wanted a nice way to count the Omer.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 400, color: '#e8e0d4', marginBottom: 12, marginTop: 32 }}>What we collect</h2>
        <p style={{ marginBottom: 20 }}>
          Your email address (to log you in) and your journal entries (so they're saved when you come back). That's it.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 400, color: '#e8e0d4', marginBottom: 12, marginTop: 32 }}>What we do with it</h2>
        <p style={{ marginBottom: 20 }}>
          Nothing. Your email will never be sold, shared, or used for marketing. Your journal entries are private to you. The only emails you'll receive are the daily Omer reflections — and only if you've written entries.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 400, color: '#e8e0d4', marginBottom: 12, marginTop: 32 }}>AI-generated reflections</h2>
        <p style={{ marginBottom: 20 }}>
          If you write journal entries, your entries are sent to an AI (Claude by Anthropic) to generate your personalized daily email reflection. Your entries are not stored by the AI or used to train any models. They're processed once to generate your email and that's it.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 400, color: '#e8e0d4', marginBottom: 12, marginTop: 32 }}>Data storage</h2>
        <p style={{ marginBottom: 20 }}>
          Your data is stored on Supabase (a database provider) with row-level security — meaning only you can access your own entries. No one else can read your journal, including the creator of this site.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 400, color: '#e8e0d4', marginBottom: 12, marginTop: 32 }}>Deleting your data</h2>
        <p style={{ marginBottom: 20 }}>
          Want your data deleted? Email <a href="mailto:emmie.chang+omer@gmail.com" style={{ color: '#D4A574', textDecoration: 'none', borderBottom: '1px solid rgba(212,165,116,0.3)' }}>emmie.chang+omer@gmail.com</a> and it's done.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 400, color: '#e8e0d4', marginBottom: 12, marginTop: 32 }}>Suggestions & feedback</h2>
        <p style={{ marginBottom: 20 }}>
          This is a labor of love and a work in progress. If you have ideas, feedback, or just want to say hi — reach out. I'd love to hear from you.
        </p>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <a href="/" style={{ color: '#D4A574', textDecoration: 'none', fontSize: 14, fontFamily: "'Helvetica Neue', sans-serif" }}>← Back to Count the Omer</a>
        </div>
      </div>
    </div>
  );
}
