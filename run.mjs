// Three stages, same five questions.
import { anon, owner } from './client.mjs';
import { build, signIn, whatAnaReaches, row } from './lab.mjs';

const { ids, orders } = await build();
const ctx = { brunoId: ids.bruno.id };

const setCLP = (clp) => owner.put('/schemas/Order', { className: 'Order', classLevelPermissions: clp });

console.log('');
console.log('  ARE THE IDS GUESSABLE?');
console.log('');
console.log(`    Bruno's three order ids:  ${orders.bruno.join('  ')}`);
console.log('    Random, not sequential — so nobody has to guess one.');
console.log('');

// ── stage 1: as it arrives ──────────────────────────────────────────────────
console.log('  [1/3] THE BACKEND AS IT ARRIVES');
console.log('');
row('A stranger with no account at all', await whatAnaReaches({ session: undefined, ...ctx }));
row('Ana, signed in', await whatAnaReaches({ session: await signIn('ana', 'correct-horse-1'), ...ctx }));

// ── stage 2: the fix almost everyone applies ────────────────────────────────
console.log('  [2/3] AFTER "REQUIRE A LOGIN" — the fix almost everyone applies');
console.log('');
await setCLP({
  find: { requiresAuthentication: true }, get: { requiresAuthentication: true },
  count: { requiresAuthentication: true }, create: { requiresAuthentication: true },
  update: { requiresAuthentication: true }, delete: { requiresAuthentication: true }, addField: {},
});
row('A stranger with no account at all', await whatAnaReaches({ session: undefined, ...ctx }));
row('Ana, signed in', await whatAnaReaches({ session: await signIn('ana', 'correct-horse-1'), ...ctx }));

// ── stage 3: the one that works ─────────────────────────────────────────────
console.log('  [3/3] AFTER GIVING EVERY ROW AN OWNER THE SERVER ENFORCES');
console.log('');
const all = (await owner.get('/classes/Order?limit=1000')).json.results;
for (const o of all) {
  const uid = o.owner?.objectId;
  if (!uid) continue;
  await owner.put(`/classes/Order/${o.objectId}`, { ACL: { [uid]: { read: true, write: true } } });
}
row('A stranger with no account at all', await whatAnaReaches({ session: undefined, ...ctx, ownerOnly: true }));
const anaSession = await signIn('ana', 'correct-horse-1');
row('Ana, signed in', await whatAnaReaches({ session: anaSession, ...ctx, ownerOnly: true }));

// ── and the app still has to work ───────────────────────────────────────────
console.log('  AND THE APP STILL HAS TO WORK');
console.log('');
const hers = await anon.get('/classes/Order?limit=1000', { session: anaSession });
console.log(`    Ana reads her own orders:        ${hers.ok ? `${hers.json.results.length} row(s)` : 'refused'}`);
const total = await anon.get('/classes/Order?limit=0&count=1', { session: anaSession });
console.log(`    Ana asks for the company total:  ${total.json.count} — only her own rows are counted`);
const everyone = (await owner.get('/classes/Order?limit=0&count=1')).json.count;
console.log(`    The real number of orders:       ${everyone} — an admin total now needs a server function`);
console.log('');
