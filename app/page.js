'use client';

import { useEffect, useRef, useState } from 'react';

const EMPTY = {
  company: '', contact_name: '', position: '', phone: '', email: '',
  status: 'lead', industry: '', company_birthday: '', contact_birthday: '',
  products: '', notes: '',
};

const STATUS = {
  lead: 'Лид',
  negotiation: 'Переговоры',
  client: 'Клиент',
  lost: 'Потерян',
};

const TABS = [
  ['overview', 'Обзор'],
  ['clients', 'Клиенты'],
  ['agent', 'AI-агент'],
  ['comms', 'Коммуникации'],
];

// Days until the next occurrence of a month/day anniversary.
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(now.getFullYear(), d.getMonth(), d.getDate());
  if (next < today) next.setFullYear(now.getFullYear() + 1);
  return Math.round((next - today) / 86400000);
}

function fmt(d) {
  if (!d) return '—';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return day && m ? `${day}.${m}` : '—';
}

export default function Home() {
  const [tab, setTab] = useState('overview');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await fetch('/api/clients');
      const d = await r.json();
      setClients(Array.isArray(d) ? d : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          AI<span>·</span>CRM
          <small>B2B sales assistant</small>
        </div>
        <nav className="nav">
          {TABS.map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <span className="dot" />
          {clients.length} в базе
          <br />Railway Postgres · OpenAI
        </div>
      </aside>

      <main className="main">
        {tab === 'overview' && <Overview clients={clients} loading={loading} go={setTab} />}
        {tab === 'clients' && <Clients clients={clients} reload={load} />}
        {tab === 'agent' && <Agent />}
        {tab === 'comms' && <Comms clients={clients} />}
      </main>
    </div>
  );
}

/* ---------------- Обзор ---------------- */

function Overview({ clients, loading, go }) {
  const won = clients.filter((c) => c.status === 'client').length;
  const active = clients.filter((c) => c.status === 'negotiation').length;

  const dates = clients
    .flatMap((c) => [
      { c, kind: 'День рождения компании', d: c.company_birthday, days: daysUntil(c.company_birthday) },
      { c, kind: `День рождения — ${c.contact_name || 'контакт'}`, d: c.contact_birthday, days: daysUntil(c.contact_birthday) },
    ])
    .filter((x) => x.days !== null && x.days <= 60)
    .sort((a, b) => a.days - b.days)
    .slice(0, 6);

  return (
    <>
      <div className="head">
        <div className="eyebrow">Обзор</div>
        <h1>Центр управления отношениями с клиентами</h1>
        <p>
          Учёт клиентов, история продаж, ключевые даты и AI-агент, который готовит
          поздравления, сообщения и коммерческие предложения.
        </p>
      </div>

      <div className="grid k4" style={{ marginBottom: 40 }}>
        <div className="stat"><b>{loading ? '—' : clients.length}</b><small>Всего в базе</small></div>
        <div className="stat"><b>{loading ? '—' : won}</b><small>Действующих клиентов</small></div>
        <div className="stat"><b>{loading ? '—' : active}</b><small>В переговорах</small></div>
        <div className="stat hi"><b>{loading ? '—' : dates.length}</b><small>Дат в ближайшие 60 дней</small></div>
      </div>

      <div className="eyebrow">Ближайшие ключевые даты</div>
      <div className="card feature">
        {dates.length === 0 ? (
          <p className="muted">
            Пока нет дат в ближайшие 60 дней. Добавьте дни рождения компаний и контактов
            в карточках клиентов — агент напомнит и подготовит поздравление.
          </p>
        ) : (
          <table>
            <tbody>
              {dates.map((x, i) => (
                <tr key={i} style={{ cursor: 'default' }}>
                  <td className="co">{x.c.company}</td>
                  <td>{x.kind}</td>
                  <td>{fmt(x.d)}</td>
                  <td>
                    <span className={'tag' + (x.days <= 7 ? ' ember' : '')}>
                      {x.days === 0 ? 'сегодня' : `через ${x.days} дн.`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bar" style={{ marginTop: 32 }}>
        <button className="btn" onClick={() => go('clients')}>Добавить клиента</button>
        <button className="btn ghost" onClick={() => go('agent')}>Спросить AI-агента</button>
      </div>
    </>
  );
}

/* ---------------- Клиенты ---------------- */

function Clients({ clients, reload }) {
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const url = editing ? `/api/clients/${editing}` : '/api/clients';
      const r = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Ошибка сохранения');
      setForm(EMPTY);
      setEditing(null);
      await reload();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  function edit(c) {
    setEditing(c.id);
    setForm({
      ...EMPTY,
      ...c,
      company_birthday: c.company_birthday ? String(c.company_birthday).slice(0, 10) : '',
      contact_birthday: c.contact_birthday ? String(c.contact_birthday).slice(0, 10) : '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(id) {
    if (!confirm('Удалить клиента из базы?')) return;
    await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    if (editing === id) { setEditing(null); setForm(EMPTY); }
    await reload();
  }

  return (
    <>
      <div className="head">
        <div className="eyebrow">База</div>
        <h1>Клиенты</h1>
        <p>Компании, контакты, статусы сделок, купленные продукты и ключевые даты.</p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 20 }}>{editing ? 'Редактирование карточки' : 'Новый клиент'}</h3>
        <form onSubmit={submit}>
          <div className="row">
            <div className="field">
              <label>Компания *</label>
              <input value={form.company} onChange={set('company')} required placeholder="ТОО Ромашка" />
            </div>
            <div className="field">
              <label>Отрасль</label>
              <input value={form.industry || ''} onChange={set('industry')} placeholder="Логистика" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Контактное лицо</label>
              <input value={form.contact_name || ''} onChange={set('contact_name')} placeholder="Иван Петров" />
            </div>
            <div className="field">
              <label>Должность</label>
              <input value={form.position || ''} onChange={set('position')} placeholder="Коммерческий директор" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Телефон (WhatsApp)</label>
              <input value={form.phone || ''} onChange={set('phone')} placeholder="+7 777 123 45 67" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email || ''} onChange={set('email')} placeholder="ivan@romashka.kz" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Статус</label>
              <select value={form.status} onChange={set('status')}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Купленные продукты</label>
              <input value={form.products || ''} onChange={set('products')} placeholder="CRM-лицензия, внедрение" />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>День рождения компании</label>
              <input type="date" value={form.company_birthday || ''} onChange={set('company_birthday')} />
            </div>
            <div className="field">
              <label>День рождения контакта</label>
              <input type="date" value={form.contact_birthday || ''} onChange={set('contact_birthday')} />
            </div>
          </div>
          <div className="field">
            <label>Заметки</label>
            <textarea
              value={form.notes || ''}
              onChange={set('notes')}
              placeholder="Расширяют склад, интересовались автоматизацией отгрузок"
            />
          </div>
          {err && <p className="muted" style={{ color: 'var(--ember)', marginBottom: 12 }}>{err}</p>}
          <div className="bar">
            <button className="btn" disabled={busy}>
              {busy ? 'Сохраняю…' : editing ? 'Сохранить изменения' : 'Добавить клиента'}
            </button>
            {editing && (
              <button type="button" className="btn ghost" onClick={() => { setEditing(null); setForm(EMPTY); }}>
                Отмена
              </button>
            )}
          </div>
        </form>
      </div>

      {clients.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Компания</th><th>Контакт</th><th>Статус</th>
              <th>Продукты</th><th>Даты</th><th />
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className={editing === c.id ? 'sel' : ''} onClick={() => edit(c)}>
                <td className="co">{c.company}<br /><span className="muted">{c.industry || ''}</span></td>
                <td>{c.contact_name || '—'}<br /><span className="muted">{c.phone || c.email || ''}</span></td>
                <td><span className={'tag' + (c.status === 'client' ? ' client' : '')}>{STATUS[c.status] || c.status}</span></td>
                <td>{c.products || '—'}</td>
                <td>{fmt(c.company_birthday)} / {fmt(c.contact_birthday)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button className="btn ghost sm" onClick={() => remove(c.id)}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ---------------- AI-агент ---------------- */

function Agent() {
  const [log, setLog] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [log, busy]);

  async function send(text) {
    const q = (typeof text === 'string' ? text : input).trim();
    if (!q || busy) return;
    const next = [...log, { role: 'user', content: q }];
    setLog(next);
    setInput('');
    setBusy(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const d = await r.json();
      setLog([...next, { role: 'assistant', content: d.reply || `Ошибка: ${d.error}` }]);
    } catch (e) {
      setLog([...next, { role: 'assistant', content: `Ошибка сети: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  const hints = [
    'Кому из клиентов пора позвонить и почему?',
    'Кого поздравить в ближайший месяц?',
    'Какие допродажи можно сделать по базе?',
  ];

  return (
    <>
      <div className="head">
        <div className="eyebrow">Агент</div>
        <h1>AI-ассистент продаж</h1>
        <p>Видит всю базу клиентов и отвечает по ней: приоритеты, поводы для контакта, тексты сообщений.</p>
      </div>

      <div className="chat">
        <div className="log">
          {log.length === 0 && (
            <div className="card feature">
              <h3 style={{ marginBottom: 14 }}>С чего начать</h3>
              <div className="bar">
                {hints.map((h) => (
                  <button key={h} className="btn ghost sm" onClick={() => send(h)}>{h}</button>
                ))}
              </div>
            </div>
          )}
          {log.map((m, i) => (
            <div key={i} className={'msg ' + (m.role === 'user' ? 'me' : 'ai')}>
              {m.role !== 'user' && <div className="who">AI-агент</div>}
              {m.content}
            </div>
          ))}
          {busy && <div className="spin">агент думает…</div>}
          <div ref={end} />
        </div>
        <div className="composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Спросите про клиентов, сделки или напишите задачу…"
          />
          <button className="btn" onClick={() => send()} disabled={busy}>Отправить</button>
        </div>
      </div>
    </>
  );
}

/* ---------------- Коммуникации ---------------- */

function Comms({ clients }) {
  const [id, setId] = useState('');
  const [kind, setKind] = useState('proposal');
  const [brief, setBrief] = useState('');
  const [out, setOut] = useState('');
  const [busy, setBusy] = useState(false);

  const client = clients.find((c) => String(c.id) === String(id));

  async function generate() {
    if (!client) return;
    setBusy(true);
    setOut('');
    try {
      const r = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, client, brief }),
      });
      const d = await r.json();
      setOut(d.text || `Ошибка: ${d.error}`);
    } catch (e) {
      setOut(`Ошибка сети: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  const wa = client?.phone && out
    ? `https://wa.me/${client.phone.replace(/\D/g, '')}?text=${encodeURIComponent(out)}`
    : null;
  const mail = client?.email && out
    ? `mailto:${client.email}?subject=${encodeURIComponent(
        kind === 'proposal' ? 'Коммерческое предложение' : 'Сообщение'
      )}&body=${encodeURIComponent(out)}`
    : null;

  return (
    <>
      <div className="head">
        <div className="eyebrow">Коммуникации</div>
        <h1>Сообщения и коммерческие предложения</h1>
        <p>Агент пишет текст под конкретного клиента, вы проверяете и отправляете в WhatsApp или на почту.</p>
      </div>

      <div className="card">
        <div className="row">
          <div className="field">
            <label>Клиент</label>
            <select value={id} onChange={(e) => { setId(e.target.value); setOut(''); }}>
              <option value="">— выберите клиента —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Что подготовить</label>
            <select value={kind} onChange={(e) => { setKind(e.target.value); setOut(''); }}>
              <option value="proposal">Коммерческое предложение</option>
              <option value="message">Сообщение в WhatsApp</option>
              <option value="greeting">Поздравление</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Вводная для агента</label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Например: расширяют склад, предложить модуль логистики"
          />
        </div>
        <div className="bar">
          <button className="btn" onClick={generate} disabled={!client || busy}>
            {busy ? 'Генерирую…' : 'Сгенерировать'}
          </button>
          {!client && <span className="muted">Сначала выберите клиента</span>}
        </div>
      </div>

      {out && (
        <>
          <div className="out">{out}</div>
          <div className="bar" style={{ marginTop: 20 }}>
            <button className="btn ghost" onClick={() => navigator.clipboard.writeText(out)}>Скопировать</button>
            {wa && <a className="btn ghost" href={wa} target="_blank" rel="noreferrer">Открыть в WhatsApp</a>}
            {mail && <a className="btn ghost" href={mail}>Отправить на почту</a>}
            <span className="muted">Сохранено в историю клиента</span>
          </div>
        </>
      )}
    </>
  );
}
