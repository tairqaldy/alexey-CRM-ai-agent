import { listClients, createClient } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json(await listClients());
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.company?.trim()) {
      return Response.json({ error: 'Название компании обязательно' }, { status: 400 });
    }
    return Response.json(await createClient(body));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
