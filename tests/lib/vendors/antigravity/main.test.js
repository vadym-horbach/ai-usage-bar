import GLib from 'gi://GLib';
import system from 'system';
import {fetchSnapshot} from '../../../../lib/vendors/antigravity/main.js';
import {parseUsage, snapshotToCacheJson} from '../../../../lib/vendors/antigravity/parser.js';
import {describe, it, assertEqual, summary} from '../../../_assert.js';
const raw = (fraction = 0.72) => JSON.stringify({status: 'SUCCESS', command: {name: 'usage', data: {groups: [
    {name: 'Gemini Models', buckets: [{id: 'gemini-5h', name: 'Five Hour Limit Remaining', window: '5h', remaining_fraction: fraction, reset_time: '2026-10-11T12:00:00Z'}]},
    {name: 'Claude and GPT models', buckets: [{id: '3p-weekly', name: 'Weekly Limit Remaining', window: 'weekly', remaining_fraction: 0.4, reset_time: '2026-10-18T12:00:00Z'}]},
]}}});

function sync(promise) {
    const loop = GLib.MainLoop.new(null, false);
    let value, error;
    promise.then(v => { value = v; loop.quit(); }, e => { error = e; loop.quit(); });
    loop.run();
    if (error) throw error;
    return value;
}
let serial = 0;
function cache(seed = null, age = 0) {
    return {
        dir: `test-antigravity-${serial++}`, payload: seed, age, error: null,
        async freshPayload(ttl) { return this.age < ttl ? this.payload : null; },
        async maybePayload() { return this.payload; },
        async payloadAgeMs() { return this.age; },
        writePayload(s) { this.payload = s; this.error = null; },
        markStale() {},
        writeLastError(code, body) { this.error = {code, body}; },
        async readLastError() { return this.error; },
    };
}
describe('Antigravity fetching', () => {
    it('uses injected CLI and projects cache', () => {
        const c = cache(); let calls = 0;
        const res = sync(fetchSnapshot({cache: c, executable: '/test/agy', run: async path => { calls++; assertEqual(path, '/test/agy'); return raw(); }}));
        assertEqual(res.ok, true); assertEqual(res.stale, false); assertEqual(calls, 1);
        assertEqual(c.payload.includes('conversation_id'), false);
    });
    it('fresh cache prevents another CLI run', () => {
        let calls = 0;
        const res = sync(fetchSnapshot({cache: cache(snapshotToCacheJson(parseUsage(raw()))), run: async () => { calls++; return raw(); }}));
        assertEqual(res.ok, true); assertEqual(calls, 0);
    });
    it('replaces corrupt fresh cache', () => {
        const res = sync(fetchSnapshot({cache: cache('broken'), run: async () => raw()}));
        assertEqual(res.ok, true);
    });
    it('retains stale figures on CLI failure', () => {
        const res = sync(fetchSnapshot({cache: cache(snapshotToCacheJson(parseUsage(raw())), 600_000), run: async () => { throw new Error('token-secret'); }}));
        assertEqual(res.ok, true); assertEqual(res.stale, true);
        assertEqual(JSON.stringify(res).includes('token-secret'), false);
    });
    it('cancelled fetch does not mark cache stale', () => {
        const c = cache();
        const res = sync(fetchSnapshot({cache: c, signal: {is_cancelled: () => true}, run: async () => { throw new Error('cancelled'); }}));
        assertEqual(res.ok, false); assertEqual(c.error, null);
    });
    it('reports failure when no cache exists', () => {
        const res = sync(fetchSnapshot({cache: cache(), run: async () => { throw new Error('private'); }}));
        assertEqual(res.ok, false); assertEqual(res.message.includes('private'), false);
    });
    it('rejects quota cache older than seven days', () => {
        const res = sync(fetchSnapshot({cache: cache(snapshotToCacheJson(parseUsage(raw())), 8 * 86400_000), run: async () => { throw new Error('offline'); }}));
        assertEqual(res.ok, false);
    });
    it('invalid CLI JSON does not replace usable cache', () => {
        const res = sync(fetchSnapshot({cache: cache(snapshotToCacheJson(parseUsage(raw())), 600_000), run: async () => '{}'}));
        assertEqual(res.ok, true); assertEqual(res.stale, true);
    });
});
system.exit(summary());
