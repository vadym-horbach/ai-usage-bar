import {calc} from '../../pacing.js';
import {format as countdown, formatWithClock} from '../../countdown.js';
import {groupHeading, paceFields, footerRow, httpErrorRow} from '../section-common.js';

export function buildSection(snapshot, meta, now, theme, _ = s => s) {
    const rows = [];
    let group = null;
    for (const w of snapshot.windows) {
        if (group !== w.group) {
            group = w.group;
            rows.push(groupHeading(group));
        }
        rows.push({
            kind: 'window',
            icon: w.window === 'weekly' ? 'x-office-calendar-symbolic' : 'alarm-symbolic',
            title: w.window === '5h' ? _('Session (5h)') : w.window === 'weekly' ? _('Weekly') : w.name,
            pct: w.utilizationPct,
            reset: countdown(w.resetsAt, now, _),
            subtitle: formatWithClock(w.resetsAt, now, _),
            ...paceFields(w.utilizationPct, w.windowMs ? calc({usagePct: w.utilizationPct, reset: w.resetsAt, now, windowMs: w.windowMs}) : null, theme, _),
        });
    }
    const err = httpErrorRow(meta, theme, _);
    if (err)
        rows.push(err);
    rows.push(footerRow(meta, _));
    return {title: 'Antigravity', plan: 'Antigravity', rows};
}
