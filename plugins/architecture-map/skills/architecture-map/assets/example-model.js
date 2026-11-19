// Minimal working model — copy this as the starting point and replace the content.
const MODEL = {
title: 'Acme Orders — Architecture Map',
roots: { gh: '/path/to/checkouts' },          // alias → local folder that contains the repos
repoMeta: {
  'gh/orders-api': { url: 'https://github.com/acme/orders-api', branch: 'main', sub: '',
    types: { '': 'd', 'src/routes.ts': 'f', 'src/events': 'd' } }
},

edgeTypes: {
  http:      { label: 'HTTP / REST',     color: '#60a5fa', desc: 'synchronous request/response' },
  mfe:       { label: 'UI embed',        color: '#c084fc', desc: 'micro-frontend, iframe, custom element' },
  kafka:     { label: 'Events',          color: '#fb923c', desc: 'asynchronous messages (animated)' },
  data:      { label: 'Data access',     color: '#34d399', desc: 'reads/writes to a DB, index or bucket' },
  llm:       { label: 'LLM / ML',        color: '#f472b6', desc: 'model calls' },
  dev:       { label: 'Local dev',       color: '#a8a29e', desc: 'only relevant locally' },
  build:     { label: 'Build / publish', color: '#818cf8', desc: 'CI pipelines and artifact publishing' },
  deploy:    { label: 'Deploy',          color: '#22d3ee', desc: 'how an artifact reaches an environment' },
  telemetry: { label: 'Telemetry',       color: '#fbbf24', desc: 'traces, metrics, logs, errors' },
  alert:     { label: 'Alerting',        color: '#f87171', desc: 'notifications and autoscaling signals' }
},
kinds: {
  user:     { icon: '👤', label: 'User / client',             fill: '#1c2433' },
  ui:       { icon: '🖥️', label: 'Frontend / UI',             fill: '#221a33' },
  service:  { icon: '⚙️', label: 'Backend service',           fill: '#17233a' },
  worker:   { icon: '🔁', label: 'Worker / stream processor', fill: '#132a24' },
  store:    { icon: '🗄️', label: 'Data store',                fill: '#1b2a17' },
  bus:      { icon: '📨', label: 'Event bus',                 fill: '#2d1d10' },
  topic:    { icon: '🧵', label: 'Topic / queue',             fill: '#2d1d10' },
  external: { icon: '☁️', label: 'External system',           fill: '#1f2430' },
  legacy:   { icon: '🕸️', label: 'Legacy / dormant',          fill: '#1f1f24' },
  tool:     { icon: '🧰', label: 'Dev tooling',               fill: '#24221d' },
  module:   { icon: '📦', label: 'Module / package',          fill: '#182236' },
  ci:       { icon: '🏗️', label: 'CI / CD system',            fill: '#1d1f3a' },
  obs:      { icon: '📈', label: 'Observability tool',        fill: '#2a2410' }
},
lenses: {
  runtime:  { label: 'Runtime',       types: ['http', 'mfe', 'kafka', 'data', 'llm', 'dev'], desc: 'How requests and data flow' },
  delivery: { label: 'CI/CD',         types: ['build', 'deploy'],     desc: 'From git push to production' },
  observe:  { label: 'Observability', types: ['telemetry', 'alert'],  desc: 'Where telemetry and alerts go' },
  all:      { label: 'All',           types: ['http', 'mfe', 'kafka', 'data', 'llm', 'dev', 'build', 'deploy', 'telemetry', 'alert'], desc: 'Everything' }
},
groups: [
  { id: 'clients', label: 'Clients',  color: '#94a3b8', short: 'browsers · mobile', desc: 'Who calls the system.' },
  { id: 'core',    label: 'Orders',   color: '#60a5fa', short: 'API + workers',      desc: 'Order lifecycle.' },
  { id: 'data',    label: 'Data',     color: '#34d399', short: 'stores · topics',    desc: 'Persistence and events.' },
  { id: 'cicd',    label: 'CI / CD',  color: '#818cf8', short: 'push → deploy',      desc: 'Delivery pipeline.', lenses: ['delivery'] }
],
nodes: [
  { id: 'web', label: 'Web app', kind: 'ui', group: 'clients', x: 0, y: 1, tech: 'React', desc: 'Customer-facing SPA.' },
  { id: 'orders', label: 'orders-api', kind: 'service', group: 'core', x: 1.3, y: 1, repo: 'gh/orders-api',
    tech: 'Node · Express', team: 'Checkout', desc: 'Creates and updates orders; emits `order.created`.',
    details: { 'Key endpoints': ['`POST /orders`', '`GET /orders/:id`'] },
    cicd: { line: 'GitHub Actions → ECR → ArgoCD', details: { Pipeline: '`.github/workflows/ci.yml`' } },
    obs:  { line: 'Datadog APM · Sentry', details: { Init: '`src/tracing.ts`' } },
    children: {
      nodes: [
        { id: 'routes', label: 'Routes', x: 0, y: 0, path: 'src/routes.ts', desc: 'HTTP handlers.' },
        { id: 'events', label: 'Event publisher', x: 1, y: 0, path: 'src/events', desc: 'Publishes order events.' }
      ],
      edges: [
        { from: '@web', to: 'routes', type: 'http', label: 'REST' },
        { from: 'routes', to: 'events', type: 'http', label: 'in-process call' },
        { from: 'events', to: '@topic', type: 'kafka', label: 'order.created' },
        { from: 'routes', to: '@db', type: 'data', label: 'SQL' }
      ]
    } },
  { id: 'db', label: 'orders DB', kind: 'store', group: 'data', x: 2.6, y: 0.5, tech: 'Postgres', desc: 'Orders tables.' },
  { id: 'topic', label: 'order.created', kind: 'topic', group: 'data', x: 2.6, y: 1.6, tech: 'Kafka', desc: 'Order events.' },
  { id: 'gha', label: 'GitHub Actions', kind: 'ci', group: 'cicd', x: 1.3, y: 3, lenses: ['delivery'], tech: 'CI', desc: 'Builds and tests.' }
],
edges: [
  { from: 'web', to: 'orders', type: 'http', label: 'POST /orders' },
  { from: 'orders', to: 'db', type: 'data', label: 'read/write' },
  { from: 'orders', to: 'topic', type: 'kafka', label: 'order.created' },
  { from: 'gha', to: 'orders', type: 'deploy', label: 'argocd sync', inferred: true }
],
flows: [
  { id: 'place-order', label: 'Place an order', desc: 'Checkout end to end.',
    steps: [
      { from: 'web', to: 'orders', text: 'Browser posts the cart', ref: 'src/routes.ts' },
      { from: 'orders', to: 'db', text: 'Order row inserted' },
      { from: 'orders', to: 'topic', text: '`order.created` published', ref: 'src/events/publish.ts' }
    ] }
],
overview: {
  title: 'Welcome 👋',
  intro: ['This map shows how **Acme Orders** fits together.', 'Start with the **Place an order** flow.'],
  glossary: [['DLQ', 'Dead-letter queue.']],
  caveats: ['Dotted edges are inferred, not confirmed in code.'],
  generated: 'Generated 2026-11-19 from local checkouts.'
}
};
