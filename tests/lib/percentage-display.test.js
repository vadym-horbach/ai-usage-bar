import system from 'system';
import {percentageText, displaySection} from '../../lib/percentage-display.js';
import {panelValue} from '../../lib/panel-model.js';
import {antigravityAdapter} from '../../lib/vendors/antigravity/adapter.js';
import {describe, it, assertEqual, assertDeepEqual, summary} from '../_assert.js';

describe('quota percentage display', () => {
    it('used mode', () => assertEqual(percentageText(42, 'used'), '42% used'));
    it('remaining mode', () => assertEqual(percentageText(42, 'remaining'), '58% left'));
    it('both mode states the order', () => assertEqual(percentageText(42, 'both'), '42% used / 58% left'));
    it('both is compact in the panel', () => assertEqual(percentageText(42, 'both', true), '42%/58%'));
    it('remaining handles exhausted quota', () => assertEqual(percentageText(100, 'remaining'), '0% left'));
    it('remaining handles full quota', () => assertEqual(percentageText(0, 'remaining'), '100% left'));
    it('unknown quota is not fabricated', () => assertEqual(percentageText(null, 'remaining', true), '-%'));
    it('rounding preserves total of 100', () => assertEqual(percentageText(42.6, 'both'), '43% used / 57% left'));
    it('translation is injected', () => assertEqual(percentageText(42, 'used', false, s => `[${s}]`), '[42% used]'));
});
const model = {title: 'Quota', rows: [
    {kind: 'window', pct: 92, color: 'red', elapsedPct: 40, paceColor: 'orange'},
    {kind: 'group-heading', label: 'Full model name'},
    {kind: 'grouped', pct: 42, valueText: '3 requests'},
]};
describe('popup quota projection', () => {
    it('remaining bar matches remaining text', () => {
        const row = displaySection(model, 'remaining').rows[0];
        assertEqual(row.barPct, 8); assertEqual(row.percentageText, '8% left');
    });
    it('colors remain based on exhaustion', () => assertEqual(displaySection(model, 'remaining').rows[0].color, 'red'));
    it('remaining marker uses the remaining budget', () => assertEqual(displaySection(model, 'remaining').rows[0].barMarker, 60));
    it('does not paint an inverted over-pace segment', () => assertEqual(displaySection(model, 'remaining').rows[0].barOverColor, null));
    it('used preserves bar and marker', () => {
        const row = displaySection(model, 'used').rows[0];
        assertEqual(row.barPct, 92); assertEqual(row.barMarker, 40); assertEqual(row.barOverColor, 'orange');
    });
    it('both uses the usage bar and explicit dual text', () => {
        const row = displaySection(model, 'both').rows[0];
        assertEqual(row.barPct, 92); assertEqual(row.percentageText, '92% used / 8% left');
    });
    it('does not mutate raw usage or notifications', () => {
        displaySection(model, 'remaining'); assertEqual(model.rows[0].pct, 92);
        assertEqual('barPct' in model.rows[0], false);
    });
    it('retains full popup names and request breakdowns', () => assertDeepEqual(displaySection(model).rows.slice(1), model.rows.slice(1)));
});
const result = {ok: true, snapshot: {windows: [
    {id: 'gemini-5h', window: '5h', utilizationPct: 42, resetsAt: null},
    {id: '3p-weekly', window: 'weekly', utilizationPct: 70, resetsAt: null},
]}};
const value = (mode, style, format = '{display_pct}') => panelValue(antigravityAdapter, result, format, new Date(), null,
    {percentageDisplay: mode, vendors: {antigravity: {panelGroup: 'all', labelStyle: style}}});
describe('AGY label styles and consistent modes', () => {
    it('short and remaining are the defaults', () => assertEqual(panelValue(antigravityAdapter, result, '{display_pct}', new Date()).text, 'G 58% · C/G 30%'));
    it('full names', () => assertEqual(value('remaining', 'full').text, 'Gemini 58% · Claude/GPT 30%'));
    it('hidden names', () => assertEqual(value('remaining', 'hidden').text, '58% · 30%'));
    it('used mode applies inside both groups', () => assertEqual(value('used', 'short').text, 'G 42% · C/G 70%'));
    it('both mode applies inside both groups', () => assertEqual(value('both', 'short').text, 'G 42%/58% · C/G 70%/30%'));
    it('legacy default follows the new mode', () => assertEqual(value('used', 'short', '{remaining_pct}%').text, 'G 42% · C/G 70%'));
    it('explicit custom tokens retain meaning', () => assertEqual(value('used', 'short', 'left {remaining_pct}%').text, 'G left 58% · C/G left 30%'));
    it('exhaustion severity does not flip with display mode', () => assertEqual(value('used', 'short').severity, value('remaining', 'short').severity));
});
system.exit(summary());
