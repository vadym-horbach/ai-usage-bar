import system from 'system';
import {buildSection} from '../../../../lib/vendors/antigravity/section.js';
import {fakeSnapshot} from '../../../../lib/vendors/antigravity/parser.js';
import {defaultTheme} from '../../../../lib/theme.js';
import {describe, it, assertEqual, assertDeepEqual, summary} from '../../../_assert.js';
const now = new Date('2026-10-11T10:00:00Z');
const model = buildSection(fakeSnapshot(42, now), {fetchedAt: now, stale: false}, now, defaultTheme());
describe('Antigravity popup cards', () => {
    it('uses the existing window rows', () => assertDeepEqual(model.rows.filter(r => r.kind === 'window').map(r => r.pct), [42, 42]));
    it('groups model quotas', () => assertEqual(model.rows.filter(r => r.kind === 'group-heading').length, 2));
    it('includes reset countdowns', () => assertEqual(model.rows.filter(r => r.kind === 'window').every(r => r.reset.length > 0), true));
    it('includes fetch footer', () => assertEqual(model.rows.at(-1).kind, 'footer'));
    it('shows Antigravity title', () => assertEqual(model.title, 'Antigravity'));
});
system.exit(summary());
