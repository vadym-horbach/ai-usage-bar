import {severityFor} from '../../severity.js';
import {format as countdown} from '../../countdown.js';
import {sanitizeUntrusted} from '../../format.js';
import {encodeSnapshot, decodeSnapshot} from '../snapshot-cache.js';

export class SchemaError extends Error {}
export const ICON = 'AGY';
export const VENDOR_SHORT = 'agy';

export function parseUsage(text) {
    const data = JSON.parse(text instanceof Uint8Array ? new TextDecoder().decode(text) : text);
    if (data.status !== 'SUCCESS' || data.command?.name !== 'usage' || !Array.isArray(data.command?.data?.groups))
        throw new SchemaError('Antigravity: no valid /usage report. Update agy and sign in.');
    const windows = [];
    for (const group of data.command.data.groups) {
        if (!Array.isArray(group.buckets))
            throw new SchemaError('Antigravity: invalid quota group.');
        for (const bucket of group.buckets) {
            const fraction = bucket.remaining_fraction;
            if (typeof fraction !== 'number' || !Number.isFinite(fraction) || fraction < 0 || fraction > 1)
                throw new SchemaError('Antigravity: invalid remaining quota.');
            const reset = bucket.reset_time ? new Date(bucket.reset_time) : null;
            if (reset && !Number.isFinite(reset.getTime()))
                throw new SchemaError('Antigravity: invalid reset time.');
            windows.push({
                id: sanitizeUntrusted(String(bucket.id), 64),
                group: sanitizeUntrusted(String(group.name), 64),
                name: sanitizeUntrusted(String(bucket.name), 64),
                window: bucket.window,
                utilizationPct: Math.round((1 - fraction) * 100),
                resetsAt: reset,
                windowMs: bucket.window === '5h' ? 5 * 3600_000 : bucket.window === 'weekly' ? 7 * 86400_000 : null,
            });
        }
    }
    if (!windows.length)
        throw new SchemaError('Antigravity: no quota windows reported.');
    return {windows};
}

export function peakUsage(snapshot) {
    const w = snapshot.windows.reduce((a, b) => a.utilizationPct >= b.utilizationPct ? a : b);
    return {percent: w.utilizationPct, resetsAt: w.resetsAt};
}

export function severity(snapshot) {
    return severityFor(peakUsage(snapshot).percent);
}

export function placeholders(snapshot, now) {
    const values = new Map([['icon', ICON], ['vendor_short', VENDOR_SHORT], ['plan', 'Antigravity']]);
    for (const [key, window] of [['session', '5h'], ['weekly', 'weekly']]) {
        const list = snapshot.windows.filter(w => w.window === window);
        const w = list.length ? list.reduce((a, b) => a.utilizationPct >= b.utilizationPct ? a : b) : null;
        values.set(`${key}_pct`, w ? String(w.utilizationPct) : '');
        values.set(`${key}_reset`, w ? countdown(w.resetsAt, now) : '');
    }
    return values;
}

export function notifyRows(snapshot) {
    return snapshot.windows.map(w => ({key: w.id, label: `${w.group}: ${w.name}`, percent: w.utilizationPct, resetsAt: w.resetsAt}));
}

export function resetCredits() { return []; }
export function snapshotToCacheJson(snapshot) { return encodeSnapshot(snapshot, 1); }
export function parseCacheJson(text) {
    const snapshot = decodeSnapshot(text, 1, SchemaError);
    if (!Array.isArray(snapshot.windows) || !snapshot.windows.length || snapshot.windows.some(w =>
        !Number.isFinite(w.utilizationPct) || w.utilizationPct < 0 || w.utilizationPct > 100 ||
        (w.resetsAt !== null && (!(w.resetsAt instanceof Date) || !Number.isFinite(w.resetsAt.getTime())))))
        throw new SchemaError('Antigravity: invalid cached quota.');
    return snapshot;
}
export function fakeSnapshot(pct, now = new Date()) {
    return {windows: [
        {id: 'gemini-5h', group: 'Gemini Models', name: 'Five Hour Limit Remaining', window: '5h', utilizationPct: pct, resetsAt: new Date(now.getTime() + 3600_000), windowMs: 5 * 3600_000},
        {id: '3p-weekly', group: 'Claude and GPT models', name: 'Weekly Limit Remaining', window: 'weekly', utilizationPct: pct, resetsAt: new Date(now.getTime() + 86400_000), windowMs: 7 * 86400_000},
    ]};
}

export function panelSnapshots(snapshot, config = null) {
    const selected = config?.vendors?.antigravity?.panelGroup ?? 'all';
    const labelStyle = config?.vendors?.antigravity?.labelStyle ?? 'short';
    const groups = [
        {id: 'gemini', label: 'Gemini', short: 'G', prefix: 'gemini-'},
        {id: '3p', label: 'Claude/GPT', short: 'C/G', prefix: '3p-'},
    ];
    return groups.filter(g => selected === 'all' || selected === g.id)
        .map(g => ({label: labelStyle === 'hidden' ? '' : labelStyle === 'full' ? g.label : g.short, snapshot: {windows: snapshot.windows.filter(w => w.id.startsWith(g.prefix))}}));
}
