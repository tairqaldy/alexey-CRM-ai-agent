import { ask, clientContext, CATALOG } from '../../../lib/ai';
import { addInteraction } from '../../../lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RULES = `Пиши на русском. Используй ТОЛЬКО реальные имя, компанию и отрасль из карточки клиента.
Никаких плейсхолдеров вида [Имя], [отрасль], [продукт] — подставляй настоящие значения.
Не выдумывай цены, сроки и цифры, которых нет в карточке.`;

const PROMPTS = {
  proposal: (c, brief) => `Составь коммерческое предложение для B2B-клиента.

КАРТОЧКА КЛИЕНТА:
${clientContext([c])}

НАШ КАТАЛОГ:
${CATALOG}

ЗАДАЧА ОТ МЕНЕДЖЕРА: ${brief || 'предложить продукты из каталога, которых ещё нет в колонке «куплено»'}

${RULES}

Структура: заголовок, вступление с привязкой к бизнесу клиента, 2-3 позиции из каталога
(для каждой — выгода для клиента, а не характеристика), следующий шаг с конкретным призывом.
До 280 слов, деловой тон без канцелярита.`,

  message: (c, brief) => `Напиши короткое сообщение клиенту для WhatsApp.

КАРТОЧКА КЛИЕНТА:
${clientContext([c])}

ПОВОД: ${brief || 'поддержать контакт и напомнить о себе'}

${RULES}

2-4 предложения, обращение по имени из карточки, живой деловой тон,
один понятный следующий шаг в конце. Выведи только текст сообщения.`,

  greeting: (c, brief) => `Напиши тёплое поздравление клиенту от лица менеджера по продажам.

КАРТОЧКА КЛИЕНТА:
${clientContext([c])}

ПОВОД: ${brief || 'день рождения'}

${RULES}

2-3 предложения, обращение по имени из карточки, упомяни что-то конкретное
про их бизнес из заметок. Без шаблонов вроде «желаем процветания», без продажи в лоб.
Выведи только текст поздравления.`,
};

export async function POST(req) {
  try {
    const { kind, client, brief } = await req.json();
    const build = PROMPTS[kind];
    if (!build) return Response.json({ error: 'Неизвестный тип генерации' }, { status: 400 });
    if (!client) return Response.json({ error: 'Клиент не выбран' }, { status: 400 });

    const text = await ask([{ role: 'user', content: build(client, brief) }], {
      temperature: kind === 'proposal' ? 0.5 : 0.7,
    });

    // Log it to the client's history so the CRM keeps the full interaction trail.
    try { await addInteraction(client.id, kind, text); } catch {}

    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
