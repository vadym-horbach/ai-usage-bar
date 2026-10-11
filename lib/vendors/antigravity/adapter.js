import {fetchSnapshot} from './main.js';
import {ICON, VENDOR_SHORT, severity, peakUsage, placeholders, notifyRows, resetCredits, fakeSnapshot, panelSnapshots} from './parser.js';
import {buildSection} from './section.js';

export const antigravityAdapter = {
    id: 'antigravity',
    cacheId: 'antigravity',
    icon: ICON,
    vendorShort: VENDOR_SHORT,
    fetchSnapshot: ctx => fetchSnapshot({...ctx, executable: ctx.config.vendors.antigravity.executable}),
    severity,
    peakUsage,
    placeholders,
    notifyRows,
    resetCredits,
    buildSection,
    fakeSnapshot,
    panelSnapshots,
};
