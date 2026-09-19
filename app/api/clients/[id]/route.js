import { updateClient, deleteClient } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    return Response.json(await updateClient(id, await req.json()));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;
    await deleteClient(id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
