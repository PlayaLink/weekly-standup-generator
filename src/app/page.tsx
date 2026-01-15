export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '48px',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
        <h1 style={{ margin: '0 0 8px 0', color: '#1a1a2e', fontSize: '28px' }}>
          Weekly Standup
        </h1>
        <p style={{ color: '#666', margin: '0 0 24px 0', lineHeight: 1.6 }}>
          Generate weekly standup reports from your Jira tickets.
        </p>
        <div
          style={{
            background: '#f5f5f5',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#444',
          }}
        >
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Getting Started</strong>
          </p>
          <p style={{ margin: 0 }}>
            In Slack, type{' '}
            <code
              style={{
                background: '#e0e0e0',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              /standup-setup
            </code>{' '}
            to connect your Jira account.
          </p>
        </div>
      </div>
    </div>
  );
}
