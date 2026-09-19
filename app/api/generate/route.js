import { ask, clientContext } from '../../../lib/ai';
import { addInteraction } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PROMPTS = {
  proposal: (c, brief) => `Составь коммерческое предложение для B2B-клиента.

КЛИЕНТ:
${clientContext([c])}

ЗАДАЧА ОТ МЕНЕДЖЕРА: ${brief || 'предложить продукты, которые клиент ещё не покупал'}

Структура: заголовок, короткое вступление с привязкой к бизнесу клиента, 2-4 позиции
с ценностью для клиента (не характеристики, а выгода), следующий шаг с конкретным призывом.
Объём — до 300 слов. Деловой тон, без канцелярита и без выдуманных цифр и цен.`,

  message: (c, brief) => `Напиши короткое сообщение клиенту для WhatsApp.

КЛИЕНТ:
${clientContext([c])}

ПОВОД: ${brief || 'поддержать контакт и напомнить о себе'}

Требования: 2-4 предложения, обращение по имени, живой деловой тон без шаблонов,
один понятный следующий шаг в конце. Только текст сообщения, без пояснений.`,

  greeting: (c, brief) => `Напиши тёплое поздравление клиенту от лица менеджера по продажам.

КЛИЕНТ:
${clientContext([c])}

ПОВОД: ${brief || 'день рождения'}

Требования: 2-3 предложения, персонально, без шаблонных фраз вроде «желаем процветания».
Упомяни что-то конкретное про их бизнес. Без продажи в лоб. Только текст.`,
};

export async function POST(req) {
  try {
    const { kind, client, brief } = await req.json();
    const build = PROMPTS[kind];
    if (!build) return Response.json({ error: 'Неизвестный тип генерации' }, { status: 400 });
    if (!client) return Response.json({ error: 'Клиент не выбран' }, { status: 400 });

    const text = await ask([{ role: 'user', content: build(client, brief) }], {
      temperature: kind === 'proposal' ? 0.5 : 0.75,
    });

    // Log it to the client's history so the CRM keeps the full interaction trail.
    try { await addInteraction(client.id, kind, text); } catch {}

    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
