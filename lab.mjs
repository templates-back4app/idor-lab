// Two companies, two people, six orders, and one question asked three times:
// what can Ana reach that is not hers?
//
// Stage 1 is the backend as it arrives. Stage 2 is the fix almost everyone
// applies — "require a login". Stage 3 is the one that actually works. The
// questions never change between stages, which is the only way to know the
// probes mean anything.
import { anon, owner, waitUp } from './client.mjs';

const PEOPLE = [
  { username: 'ana',   password: 'correct-horse-1', email: 'ana@acme.example',   company: 'Acme' },
  { username: 'bruno', password: 'correct-horse-2', email: 'bruno@globex.example', company: 'Globex' },
];

export async function build() {
  await waitUp();
  const ids = {};
  for (const p of PEOPLE) {
    const r = await anon.post('/users', p);
    ids[p.username] = { id: r.json.objectId, session: r.json.sessionToken, company: p.company };
  }
  // Orders written the way a generated app writes them: an owner field, and no
  // access list. The owner field is data the app reads; it is not a rule.
  const orders = {};
  for (const [who, { id, company }] of Object.entries(ids)) {
    orders[who] = [];
    for (const [item, cents] of [['laptop', 429900], ['desk chair', 89900], ['monitor', 159900]]) {
      const r = await owner.post('/classes/Order', {
        item, cents, company,
        owner: { __type: 'Pointer', className: '_User', objectId: id },
      });
      orders[who].push(r.json.objectId);
    }
  }
  return { ids, orders };
}

export async function signIn(username, password) {
  const r = await anon.get(`/login?username=${username}&password=${encodeURIComponent(password)}`);
  return r.json.sessionToken;
}

// Everything Ana can reach that belongs to Bruno.
//
// The list is counted before anything else exists, and every other question is
// asked of a decoy row written fresh for that question and owned by Bruno — so
// one probe can never spoil the next by deleting what it was testing.
export async function whatAnaReaches({ session, brunoId, ownerOnly = false }) {
  const list = await anon.get('/classes/Order?limit=1000', { session });
  const rows = list.ok ? (list.json.results ?? []) : [];
  const his  = rows.filter((r) => r.company === 'Globex').length;

  const body = { item: 'decoy', cents: 1000, company: 'Globex',
    owner: { __type: 'Pointer', className: '_User', objectId: brunoId } };
  if (ownerOnly) body.ACL = { [brunoId]: { read: true, write: true } };
  const decoy = (await owner.post('/classes/Order', body)).json.objectId;

  const byId = await anon.get(`/classes/Order/${decoy}`, { session });
  const edit = await anon.put(`/classes/Order/${decoy}`, { cents: 1 }, { session });
  const del  = await anon.del(`/classes/Order/${decoy}`, { session });
  if (!del.ok) await owner.del(`/classes/Order/${decoy}`);   // tidy up either way

  return { listed: list.ok ? rows.length : null, his, byId: byId.ok, edit: edit.ok, del: del.ok };
}

export const yn = (b) => (b ? 'yes' : 'no');

export function row(stage, r) {
  console.log(`    ${stage}`);
  console.log(`      orders Ana's list returns:       ${r.listed === null ? 'refused' : `${r.listed}`}`);
  console.log(`      of those, Bruno's:               ${r.his}`);
  console.log(`      opens Bruno's order by its id:   ${yn(r.byId)}`);
  console.log(`      changes the price on it:         ${yn(r.edit)}`);
  console.log(`      deletes it:                      ${yn(r.del)}`);
  console.log('');
}
