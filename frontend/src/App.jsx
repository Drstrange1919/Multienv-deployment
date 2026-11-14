import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BY_ENV = {
  development: '/api/dev',
  production: '/api/prod',
};

async function getJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function StatusPill({ status }) {
  const healthy = status === 'healthy' || status === 'connected';
  return <span className={`status-pill ${healthy ? 'healthy' : 'unhealthy'}`}>
    <span className="status-dot" />{status || 'checking'}
  </span>;
}

function Header({ current }) {
  return (
    <header className="topbar">
      <a className="brand" href="/">
        <span className="brand-mark">MT</span>
        <span>MultiEnv <small>Ticket Desk</small></span>
      </a>
      <nav aria-label="Main navigation">
        <a className={current === 'dashboard' ? 'active' : ''} href="/">Dashboard</a>
        <a className={current === 'development' ? 'active' : ''} href="/dev">Development</a>
        <a className={current === 'production' ? 'active' : ''} href="/prod">Production</a>
      </nav>
    </header>
  );
}

function Dashboard() {
  const [health, setHealth] = useState({ development: 'checking', production: 'checking' });
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    const results = await Promise.allSettled([
      getJson(`${API_BY_ENV.development}/health`),
      getJson(`${API_BY_ENV.production}/health`),
    ]);
    setHealth({
      development: results[0].status === 'fulfilled' ? results[0].value.status : 'unavailable',
      production: results[1].status === 'fulfilled' ? results[1].value.status : 'unavailable',
    });
    if (results.some((result) => result.status === 'rejected')) {
      setError('One or more backend health checks failed. Check the Docker container logs.');
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">LOCAL DOCKER DEPLOYMENT</p>
          <h1>One ticket desk.<br /><span>Two environments.</span></h1>
          <p className="hero-copy">A single React frontend communicating with independent development and production Flask APIs.</p>
        </div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit-core">DOCKER</div><i /><i /><i /></div>
      </section>

      <section className="section-heading">
        <div><p className="eyebrow">ENVIRONMENT OVERVIEW</p><h2>Backend services</h2></div>
        <button className="button button-quiet" onClick={refresh}>Refresh status</button>
      </section>
      {error && <div className="alert alert-warning">{error}</div>}
      <div className="environment-grid">
        <EnvironmentCard
          name="Development"
          environment="development"
          port="3001"
          status={health.development}
          description="Development API running with the Flask development server."
          href="/dev"
        />
        <EnvironmentCard
          name="Production"
          environment="production"
          port="3002"
          status={health.production}
          description="Production API served by Gunicorn workers."
          href="/prod"
        />
      </div>
      <section className="info-strip">
        <div><span className="info-icon">01</span><div><strong>Frontend</strong><p>React + Nginx · Port 3000</p></div></div>
        <div><span className="info-icon">02</span><div><strong>Private service discovery</strong><p>Docker Compose bridge network</p></div></div>
        <div><span className="info-icon">03</span><div><strong>API routing</strong><p>Nginx reverse proxy</p></div></div>
      </section>
    </>
  );
}

function EnvironmentCard({ name, environment, port, status, description, href }) {
  return (
    <article className={`environment-card ${environment}`}>
      <div className="card-topline"><span className="env-label">{environment === 'development' ? 'DEV' : 'PROD'} ENVIRONMENT</span><StatusPill status={status} /></div>
      <h3>{name}</h3>
      <p>{description}</p>
      <div className="card-meta"><span>API port</span><strong>{port}</strong></div>
      <a className="button button-primary" href={href}>Open {name} <span aria-hidden="true">→</span></a>
    </article>
  );
}

function TicketEnvironment({ environment }) {
  const apiBase = API_BY_ENV[environment];
  const isProd = environment === 'production';
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [apiStatus, setApiStatus] = useState('checking');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium' });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getJson(`${apiBase}/tickets`);
      setTickets(data.items || []);
      setApiStatus('connected');
    } catch (err) {
      setApiStatus('unavailable');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const counts = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'Open').length,
    progress: tickets.filter((ticket) => ticket.status === 'In Progress').length,
    resolved: tickets.filter((ticket) => ticket.status === 'Resolved').length,
  }), [tickets]);

  async function submitTicket(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await getJson(`${apiBase}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm({ title: '', description: '', priority: 'Medium' });
      setMessage('Ticket created successfully in the ' + environment + ' environment.');
      await loadTickets();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className={`environment-hero ${isProd ? 'prod' : 'dev'}`}>
        <div>
          <p className="eyebrow">{isProd ? 'PRODUCTION WORKSPACE' : 'DEVELOPMENT WORKSPACE'}</p>
          <h1>{isProd ? 'Production tickets' : 'Development tickets'}</h1>
          <p>{isProd ? 'Production API · Gunicorn · Port 3002' : 'Development API · Flask · Port 3001'}</p>
        </div>
        <StatusPill status={apiStatus} />
      </section>

      <section className="stats-grid">
        <Stat label="Total tickets" value={counts.total} />
        <Stat label="Open" value={counts.open} />
        <Stat label="In progress" value={counts.progress} />
        <Stat label="Resolved" value={counts.resolved} />
      </section>

      <div className="workspace-grid">
        <section className="panel tickets-panel">
          <div className="panel-heading"><div><p className="eyebrow">TICKET REGISTER</p><h2>All tickets</h2></div><button className="button button-quiet" onClick={loadTickets}>Reload</button></div>
          {loading ? <p className="empty-state">Loading tickets from the backend...</p> : tickets.length === 0 ? <p className="empty-state">No tickets found.</p> : (
            <div className="ticket-list">
              {tickets.map((ticket) => (
                <article className="ticket-row" key={ticket.id}>
                  <div className="ticket-id">#{ticket.id}</div>
                  <div className="ticket-main"><h3>{ticket.title}</h3><p>{ticket.description}</p><div className="ticket-tags"><span className={`priority ${ticket.priority.toLowerCase()}`}>{ticket.priority} priority</span><span className={`ticket-status ${ticket.status.toLowerCase().replace(' ', '-')}`}>{ticket.status}</span></div></div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel form-panel">
          <p className="eyebrow">CREATE A TICKET</p>
          <h2>New request</h2>
          <p className="form-intro">This request is sent only to the {environment} backend.</p>
          <form onSubmit={submitTicket}>
            <label>Ticket title<input required maxLength="120" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Enter a short title" /></label>
            <label>Description<textarea rows="4" maxLength="500" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the request" /></label>
            <label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label>
            <button className="button button-primary full-width" type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create ticket'}</button>
          </form>
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-warning">{error}</div>}
        </section>
      </div>
      <p className="demo-note">Demo note: ticket data is stored in container memory only. It resets when the container is recreated.</p>
    </>
  );
}

function Stat({ label, value }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>;
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const environment = path === '/prod' || path.startsWith('/prod/') ? 'production' : path === '/dev' || path.startsWith('/dev/') ? 'development' : null;
  const current = environment || 'dashboard';

  return (
    <div className="app-shell">
      <Header current={current} />
      <main className="content">
        {environment ? <TicketEnvironment environment={environment} /> : <Dashboard />}
      </main>
      <footer><span>MultiEnv Ticket Desk</span><span>Local Docker learning project</span></footer>
    </div>
  );
}
