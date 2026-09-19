import { ask, clientContext, CATALOG } from '../../../lib/ai';
import { listClients } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  try {
    const { messages = [] } = await req.json();
    const clients = await listClients();

    const system = `Ты — AI-ассистент отдела продаж B2B внутри CRM-системы.
Работаешь как автономный помощник менеджера: анализируешь базу, находишь возможности
для допродаж, напоминаешь о ключевых датах и готовишь тексты коммуникаций.

Сегодня: ${new Date().toISOString().slice(0, 10)}

НАШ КАТАЛОГ ПРОДУКТОВ:
${CATALOG}

БАЗА КЛИЕНТОВ CRM:
${clientContext(clients)}

Правила:
- Отвечай по-русски, коротко и конкретно, без воды и без общих рассуждений.
- Всегда давай ответ по имеющимся данным. Допродажа = продукт из каталога,
  которого нет в колонке «куплено» у клиента.
- Формат ответа — список: клиент → что предложить/сделать → почему именно сейчас
  (опирайся на заметки, отрасль, статус и ближайшие даты).
- Не проси уточнений, если по базе уже можно дать полезный ответ.
- Не выдумывай цены и цифры, которых нет в данных.
- Готовые тексты сообщений выдавай так, чтобы их можно было скопировать и отправить.`;

    const reply = await ask([{ role: 'system', content: system }, ...messages.slice(-12)]);
    return Response.json({ reply });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
