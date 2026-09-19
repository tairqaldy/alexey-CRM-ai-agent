import { listInteractions, addInteraction } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const clientId = new URL(req.url).searchParams.get('clientId');
    return Response.json(await listInteractions(clientId));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { clientId, kind, body } = await req.json();
    return Response.json(await addInteraction(clientId, kind, body));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
