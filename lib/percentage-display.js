import {vformat} from './format.js';

export function percentageText(used, mode = 'remaining', compact = false, _ = s => s) {
    if (!Number.isFinite(used) || used < 0 || used > 100)
        return compact ? '-%' : _('Quota unavailable');
    const u = Math.round(used);
    const remaining = 100 - u;
    if (mode === 'both')
        return compact ? `${u}%/${remaining}%` : vformat(_('%d%% used / %d%% left'), u, remaining);
    if (mode === 'used')
        return compact ? `${u}%` : vformat(_('%d%% used'), u);
    return compact ? `${remaining}%` : vformat(_('%d%% left'), remaining);
}

export function displaySection(model, mode = 'remaining', _ = s => s) {
    return {...model, rows: model.rows.map(row => {
        if (row.kind !== 'window')
            return row;
        const remaining = mode === 'remaining';
        return {...row,
            percentageText: percentageText(row.pct, mode, false, _),
            barPct: remaining ? 100 - row.pct : row.pct,
            barMarker: typeof row.elapsedPct === 'number' ? remaining ? 100 - row.elapsedPct : row.elapsedPct : null,
            barOverColor: remaining ? null : row.paceColor ?? null,
        };
    })};
}
