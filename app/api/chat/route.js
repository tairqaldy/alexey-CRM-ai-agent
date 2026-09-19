import { ask, clientContext } from '../../../lib/ai';
import { listClients } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { messages = [] } = await req.json();
    const clients = await listClients();

    const system = `Ты — AI-ассистент отдела продаж B2B внутри CRM-системы.
Ты работаешь как автономный помощник менеджера: анализируешь базу клиентов,
находишь возможности для допродаж, напоминаешь о ключевых датах и готовишь тексты
коммуникаций (поздравления, follow-up, коммерческие предложения).

Сегодня: ${new Date().toISOString().slice(0, 10)}

ТЕКУЩАЯ БАЗА КЛИЕНТОВ CRM:
${clientContext(clients)}

Правила:
- Отвечай по-русски, коротко и по делу, без воды.
- Опирайся только на данные из базы выше. Если данных не хватает — прямо скажи, чего не хватает.
- Когда предлагаешь допродажу, укажи клиента, продукт и одну причину, почему именно сейчас.
- Готовые тексты сообщений выдавай так, чтобы их можно было скопировать и отправить как есть.`;

    const reply = await ask([{ role: 'system', content: system }, ...messages.slice(-12)]);
    return Response.json({ reply });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
