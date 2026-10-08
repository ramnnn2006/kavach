// End-to-end permission smoke test against the real Supabase project.
// Reads demo passwords from ../docs/demo-accounts.md (git-ignored). Creates incidents tagged
// "[smoke-test]" — delete them afterwards (see README). Usage: node scripts/smoke-test.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

const accounts = Object.fromEntries(
  readFileSync(new URL('../../docs/demo-accounts.md', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('@alpha.demo'))
    .map(l => l.split('|').map(s => s.trim()))
    .map(c => [c[3].split('@')[0], { email: c[3], password: c[4].replace(/`/g, '') }]),
);

let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

async function as(name) {
  const c = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword(accounts[name]);
  if (error) throw new Error(`${name} sign-in failed: ${error.message}`);
  return c;
}

const anon = createClient(URL_, KEY, { auth: { persistSession: false } });
const { data: anonRows, error: anonErr } = await anon.from('incidents').select('id').limit(1);
ok(anonErr || (anonRows || []).length === 0, 'anonymous users read nothing');

const priya = await as('priya');
const arjun = await as('arjun');
const suresh = await as('suresh');   // maintenance: lift, power, water
const ramesh = await as('ramesh');   // security: fire, medical, security
const lakshmi = await as('lakshmi'); // admin
for (const [n, c] of Object.entries({ priya, arjun, suresh, ramesh, lakshmi })) {
  const { data } = await c.from('profiles').select('role').eq('id', (await c.auth.getUser()).data.user.id).single();
  ok(!!data, `${n} signs in and reads own profile (${data?.role})`);
}

// Resident cannot escalate own role
const { error: roleErr } = await priya.from('profiles').update({ role: 'admin' }).eq('id', (await priya.auth.getUser()).data.user.id);
ok(!!roleErr, 'resident cannot change own role');

// Resident creates a lift incident; server forces status/score
const { data: lift, error: liftErr } = await priya.from('incidents')
  .insert({ type: 'lift', description: '[smoke-test] lift stuck', people_affected: 2, client_id: crypto.randomUUID() })
  .select('id, status, urgency_score, zone_name, flat_label, reporter_name').single();
ok(!liftErr && lift?.status === 'pending' && lift.urgency_score > 0, `resident creates lift report (zone ${lift?.zone_name}, flat ${lift?.flat_label}, urgency ${lift?.urgency_score}) ${liftErr?.message || ''}`);

const sees = async (c, id) => ((await c.from('incidents').select('id').eq('id', id)).data || []).length === 1;
ok(await sees(suresh, lift.id), 'maintenance responder sees lift report');
ok(!(await sees(ramesh, lift.id)), 'security responder does NOT see lift report');
ok(await sees(lakshmi, lift.id), 'admin sees lift report');
ok(!(await sees(arjun, lift.id)), 'another resident does NOT see it');

// Wrong-specialty claim is rejected
const { error: wrongClaim } = await ramesh.rpc('claim_incident', { p_incident_id: lift.id });
ok(wrongClaim?.message === 'forbidden' || wrongClaim?.message === 'not_found', `security responder cannot claim lift report (${wrongClaim?.message})`);

// Concurrent claim: exactly one wins
const [a, b] = await Promise.all([
  suresh.rpc('claim_incident', { p_incident_id: lift.id }),
  lakshmi.rpc('claim_incident', { p_incident_id: lift.id }),
]);
const winners = [a, b].filter(r => !r.error).length;
const loser = [a, b].find(r => r.error);
ok(winners === 1 && loser?.error?.message === 'already_claimed', `concurrent claim → exactly one winner, other gets already_claimed`);

// Forward-only status
const claimer = !a.error ? suresh : lakshmi;
const { error: back } = await claimer.rpc('advance_incident', { p_incident_id: lift.id, p_next: 'acknowledged' });
ok(!!back, 'status cannot move backwards');
const { error: fwd } = await claimer.rpc('advance_incident', { p_incident_id: lift.id, p_next: 'en_route' });
ok(!fwd, 'assignee moves to en_route');

// Direct UPDATE bypassing RPC is blocked
const { data: upd } = await priya.from('incidents').update({ status: 'resolved' }).eq('id', lift.id).select('id');
ok(!upd || upd.length === 0, 'resident cannot update incident directly');

// Audit trail visible to reporter
const { data: events } = await priya.from('incident_events').select('action').eq('incident_id', lift.id).order('created_at');
ok((events || []).map(e => e.action).join(',').startsWith('created,claimed'), `audit log: ${(events || []).map(e => e.action).join(' → ')}`);

// Medical report visible to first responder resident (Priya is a doctor) but not to Arjun
const { data: med } = await arjun.from('incidents')
  .insert({ type: 'medical', description: '[smoke-test] fall', client_id: crypto.randomUUID() })
  .select('id, vulnerable, urgency_score').single();
ok(med?.vulnerable === true, `vulnerable reporter flagged (urgency ${med?.urgency_score})`);
ok(await sees(priya, med.id), 'community first responder sees medical report');
ok(await sees(ramesh, med.id), 'security responder sees medical report');
ok(!(await sees(suresh, med.id)), 'maintenance responder does NOT see medical report');
const { error: ackErr } = await priya.rpc('first_responder_ack', { p_incident_id: med.id });
ok(!ackErr, `first responder can say "I'm coming" ${ackErr?.message || ''}`);

// Reporter can cancel own pending report
const { error: cancelErr } = await arjun.rpc('cancel_incident', { p_incident_id: med.id, p_reason: '[smoke-test] false alarm' });
ok(!cancelErr, 'reporter cancels own pending report');

// Admin-only RPCs
const { error: powerErr } = await suresh.rpc('set_power_source', { p_source: 'dg' });
ok(powerErr?.message === 'forbidden', 'responder cannot switch power source');
const { data: rep, error: repErr } = await lakshmi.rpc('report_summary', { p_from: '2026-01-01', p_to: '2027-01-01' });
ok(!repErr && Array.isArray(rep), `admin report_summary works (${rep?.length} types)`);

// Responder asset permissions
const { data: liftAsset } = await suresh.from('assets').select('id').eq('kind', 'lift').limit(1).single();
const { data: firePump } = await suresh.from('assets').select('id').eq('kind', 'fire_pump').limit(1).single();
ok(!(await suresh.rpc('set_asset_status', { p_asset_id: liftAsset.id, p_state: 'ok' })).error, 'maintenance responder updates lift status');
ok((await suresh.rpc('set_asset_status', { p_asset_id: firePump.id, p_state: 'ok' })).error?.message === 'forbidden', 'maintenance responder cannot update fire pump');

console.log(`\n${failures === 0 ? 'ALL PASSED' : `${failures} FAILED`}`);
process.exit(failures ? 1 : 0);
