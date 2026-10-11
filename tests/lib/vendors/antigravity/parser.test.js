import system from 'system';
import {parseUsage, peakUsage, severity, placeholders, snapshotToCacheJson, parseCacheJson, notifyRows, resetCredits, fakeSnapshot, panelSnapshots} from '../../../../lib/vendors/antigravity/parser.js';
import {describe, it, assertEqual, assertDeepEqual, assertThrows, summary} from '../../../_assert.js';
const raw = (fraction = 0.72) => JSON.stringify({status: 'SUCCESS', command: {name: 'usage', data: {groups: [
    {name: 'Gemini Models', buckets: [{id: 'gemini-5h', name: 'Five Hour Limit Remaining', window: '5h', remaining_fraction: fraction, reset_time: '2026-10-11T12:00:00Z'}]},
    {name: 'Claude and GPT models', buckets: [{id: '3p-weekly', name: 'Weekly Limit Remaining', window: 'weekly', remaining_fraction: 0.4, reset_time: '2026-10-18T12:00:00Z'}]},
]}}});

describe('Antigravity usage', () => {
    it('converts remaining fractions to used percentages', () => assertEqual(parseUsage(raw()).windows[0].utilizationPct, 28));
    it('preserves every model group and window', () => assertEqual(parseUsage(raw()).windows[1].group, 'Claude and GPT models'));
    it('converts reset to Date', () => assertEqual(parseUsage(raw()).windows[0].resetsAt.toISOString(), '2026-10-11T12:00:00.000Z'));
    it('finds the tightest quota', () => assertEqual(peakUsage(parseUsage(raw())).percent, 60));
    it('maps severity', () => assertEqual(severity(parseUsage(raw(0))), 'critical'));
    it('exposes session and weekly windows', () => {
        const v = placeholders(parseUsage(raw()), new Date('2026-10-11T10:00:00Z'));
        assertEqual(v.get('session_pct'), '28');
        assertEqual(v.get('weekly_pct'), '60');
    });
    it('round-trips projected cache with dates', () => assertDeepEqual(parseCacheJson(snapshotToCacheJson(parseUsage(raw()))), parseUsage(raw())));
    it('cache excludes the raw envelope and potential credentials', () => {
        const data = JSON.parse(raw()); data.token = 'do-not-cache';
        assertEqual(snapshotToCacheJson(parseUsage(JSON.stringify(data))).includes('do-not-cache'), false);
    });
    it('rejects malformed JSON', () => assertThrows(() => parseUsage('broken')));
    it('rejects agent responses that are not /usage', () => assertThrows(() => parseUsage('{"status":"SUCCESS","response":"hello"}')));
    it('rejects failed reports', () => assertThrows(() => parseUsage(raw().replace('SUCCESS', 'FAILED'))));
    it('rejects empty reports', () => assertThrows(() => parseUsage('{"status":"SUCCESS","command":{"name":"usage","data":{"groups":[]}}}')));
    for (const fraction of [-1, 2, null, '0.5'])
        it(`rejects invalid fraction ${fraction}`, () => assertThrows(() => parseUsage(raw(fraction))));
    it('rejects invalid reset', () => assertThrows(() => parseUsage(raw().replace('2026-10-11T12:00:00Z', 'bad-date'))));
    it('rejects corrupt cache', () => assertThrows(() => parseCacheJson('{"cacheVersion":1,"snapshot":{"windows":[]}}')));
    it('zero remaining means fully used', () => assertEqual(parseUsage(raw(0)).windows[0].utilizationPct, 100));
    it('full remaining means unused', () => assertEqual(parseUsage(raw(1)).windows[0].utilizationPct, 0));
    it('notification rows retain independent bucket ids', () => assertDeepEqual(notifyRows(parseUsage(raw())).map(w => w.key), ['gemini-5h', '3p-weekly']));
    it('reports no fabricated reset credits', () => assertDeepEqual(resetCredits(), []));
    it('fake data supports runtime rendering checks', () => assertEqual(peakUsage(fakeSnapshot(42)).percent, 42));
});
describe('Antigravity group selection', () => {
    const select = group => panelSnapshots(parseUsage(raw()), {vendors: {antigravity: {panelGroup: group, labelStyle: 'full'}}});
    it('shows both independent groups by default', () => assertDeepEqual(select('all').map(g => g.label), ['Gemini', 'Claude/GPT']));
    it('selects only Gemini buckets', () => assertDeepEqual(select('gemini')[0].snapshot.windows.map(w => w.id), ['gemini-5h']));
    it('selects only Claude/GPT buckets', () => assertDeepEqual(select('3p')[0].snapshot.windows.map(w => w.id), ['3p-weekly']));
    it('does not substitute the other group when the selected quota is absent', () => assertEqual(panelSnapshots({windows: []}, {vendors: {antigravity: {panelGroup: '3p'}}})[0].snapshot.windows.length, 0));
});
system.exit(summary());
