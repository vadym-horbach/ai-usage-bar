import system from 'system';
import {antigravityAdapter} from '../../lib/vendors/antigravity/adapter.js';
import {panelValue} from '../../lib/panel-model.js';
import {describe, it, assertEqual, assertDeepEqual, summary} from '../_assert.js';
const adapter = {
    placeholders: s => new Map([['session_pct', s.session], ['weekly_pct', s.weekly], ['session_reset', '2h'], ['weekly_reset', '3d']]),
};
const result = (session, weekly, stale = false) => ({ok: true, snapshot: {session, weekly}, stale});
const value = r => panelValue(adapter, r, '{remaining_pct}% · {remaining_reset}', new Date());
describe('combined panel value', () => {
    it('uses the tightest primary quota and its reset', () => assertDeepEqual(value(result('20', '70')), {text: '30% · 3d', severity: 'mid'}));
    it('uses the session when it is tighter', () => assertEqual(value(result('90', '70')).text, '10% · 2h'));
    it('handles absent weekly quota', () => assertEqual(value(result('40', '')).text, '60% · 2h'));
    it('handles absent session quota', () => assertEqual(value(result('', '100')).text, '0% · 3d'));
    it('shows unknown rather than 100% when no quota exists', () => assertEqual(value(result('', '')).text, '-% · '));
    it('does not treat invalid quota as real', () => assertEqual(value(result('garbage', '110')).text, '-% · '));
    it('marks stale quota', () => assertEqual(value(result('20', '0', true)).text, '80% · 2h ⏸'));
    it('shows loading independently', () => assertDeepEqual(value(undefined), {text: '…', severity: null}));
    it('shows errors independently', () => assertDeepEqual(value({ok: false, kind: 'error'}), {text: '⚠', severity: 'critical'}));
    it('weekly remaining ignores display mode', () => assertEqual(panelValue(adapter, result('20', '70'), '{weekly_remaining_pct}%', new Date(), null, {percentageDisplay: 'used'}).text, '30%'));
    it('preserves old placeholders alongside remaining', () => {
        const original = {placeholders: () => new Map([['icon', 'logo'], ['vendor_short', 'cld'], ['plan', 'Pro'], ['session_pct', '20'], ['weekly_pct', '70'], ['session_reset', '2h'], ['weekly_reset', '3d'], ['session_elapsed', '40'], ['weekly_elapsed', '50'], ['session_pace', '↑'], ['weekly_pace', '↓']])};
        assertEqual(panelValue(original, result('20', '70'), '{icon} {vendor_short} {plan} {session_pct}% {weekly_pct}% {session_reset} {weekly_reset} {session_elapsed} {weekly_elapsed} {session_pace} {weekly_pace}', new Date()).text, 'logo cld Pro 20% 70% 2h 3d 40 50 ↑ ↓');
    });
    it('supports separate session and weekly remaining percentages', () => assertEqual(panelValue(adapter, result('20', '70'), '{session_remaining_pct}% / {weekly_remaining_pct}%', new Date()).text, '80% / 30%'));
});
describe('independent Antigravity panel quotas', () => {
    const r = {ok: true, stale: false, snapshot: {windows: [
        {id: 'gemini-5h', window: '5h', utilizationPct: 10, resetsAt: null},
        {id: '3p-5h', window: '5h', utilizationPct: 70, resetsAt: null},
        {id: '3p-weekly', window: 'weekly', utilizationPct: 20, resetsAt: null},
    ]}};
    const value = group => panelValue(antigravityAdapter, r, '{remaining_pct}%', new Date(), null, {vendors: {antigravity: {panelGroup: group, labelStyle: 'full'}}});
    it('shows both groups without merging their allowances', () => assertEqual(value('all').text, 'Gemini 90% · Claude/GPT 30%'));
    it('Gemini selection ignores exhausted third-party allowance', () => assertEqual(value('gemini').text, 'Gemini 90%'));
    it('Claude/GPT selection uses its own tighter window', () => assertEqual(value('3p').text, 'Claude/GPT 30%'));
    it('preserves both groups when stale', () => assertEqual(panelValue(antigravityAdapter, {...r, stale: true}, '{remaining_pct}%', new Date(), null, {vendors: {antigravity: {labelStyle: 'full'}}}).text, 'Gemini 90% ⏸ · Claude/GPT 30% ⏸'));
    it('absent selected group shows unknown instead of unrelated quota', () => assertEqual(panelValue(antigravityAdapter, {...r, snapshot: {windows: []}}, '{remaining_pct}%', new Date(), null, {vendors: {antigravity: {panelGroup: 'gemini'}}}).text, 'G -%'));
});
system.exit(summary());
