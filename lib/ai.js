const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function ask(messages, { temperature = 0.6, max_tokens = 1100 } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY не задан в переменных окружения');

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`OpenAI ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// Compact CRM snapshot handed to the agent as context.
export function clientContext(clients) {
  if (!clients.length) return 'База клиентов пуста.';
  return clients
    .map((c) => {
      const f = [
        `#${c.id} ${c.company}`,
        c.contact_name && `контакт: ${c.contact_name}${c.position ? `, ${c.position}` : ''}`,
        c.status && `статус: ${c.status}`,
        c.industry && `отрасль: ${c.industry}`,
        c.phone && `тел: ${c.phone}`,
        c.email && `email: ${c.email}`,
        c.company_birthday && `др компании: ${String(c.company_birthday).slice(0, 10)}`,
        c.contact_birthday && `др контакта: ${String(c.contact_birthday).slice(0, 10)}`,
        c.products && `куплено: ${c.products}`,
        c.notes && `заметки: ${c.notes}`,
      ].filter(Boolean);
      return f.join(' | ');
    })
    .join('\n');
}
