import {substitute} from './format.js';
import {severityFor} from './severity.js';
import {percentageText} from './percentage-display.js';

export function panelValue(adapter, result, format, now, ngettext, config = null) {
    if (!result || result.kind === 'loading')
        return {text: '…', severity: null};
    if (!result.ok)
        return {text: '⚠', severity: 'critical'};
    if (adapter.panelSnapshots) {
        const entries = adapter.panelSnapshots(result.snapshot, config);
        const values = entries.map(entry => {
            const value = panelValue({...adapter, panelSnapshots: null}, {...result, snapshot: entry.snapshot}, format, now, ngettext, config);
            return {...value, text: entry.label ? `${entry.label} ${value.text}` : value.text};
        });
        return {text: values.map(v => v.text).join(' · '), severity: values.find(v => v.severity === 'critical')?.severity ?? values.find(v => v.severity === 'high')?.severity ?? values.find(v => v.severity === 'mid')?.severity ?? values.find(v => v.severity === 'low')?.severity ?? null};
    }
    const values = new Map(adapter.placeholders(result.snapshot, now, ngettext));
    let peak = null;
    let reset = '';
    for (const key of ['session', 'weekly']) {
        const raw = values.get(`${key}_pct`);
        const pct = raw !== undefined && raw !== '' ? Number(raw) : NaN;
        const valid = Number.isFinite(pct) && pct >= 0 && pct <= 100;
        values.set(`${key}_remaining_pct`, valid ? String(Math.round(100 - pct)) : '-');
        if (valid && (peak === null || pct > peak)) {
            peak = pct;
            reset = values.get(`${key}_reset`) || '';
        }
    }
    values.set('remaining_pct', peak === null ? '-' : String(Math.round(100 - peak)));
    values.set('remaining_reset', reset);
    values.set('display_pct', percentageText(peak, config?.percentageDisplay ?? 'remaining', true));
    return {text: substitute(format, values) + (result.stale ? ' ⏸' : ''), severity: peak === null ? null : severityFor(peak)};
}
