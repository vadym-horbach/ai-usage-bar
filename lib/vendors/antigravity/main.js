import {withMutex, staleResult} from '../fetch-common.js';
import {parseUsage, snapshotToCacheJson, parseCacheJson} from './parser.js';
import {runUsage} from './command.js';

export async function fetchSnapshot({cache, executable, signal, run = runUsage}) {
    return withMutex(cache.dir, async () => {
        const fresh = await cache.freshPayload(300_000);
        if (fresh !== null) {
            try {
                return {ok: true, snapshot: parseCacheJson(fresh), stale: false, lastError: null, cacheAgeMs: await cache.payloadAgeMs() ?? 0};
            } catch (_) { /* Fetch again if cache is corrupt. */ }
        }
        try {
            const snapshot = parseUsage(await run(executable, signal));
            cache.writePayload(snapshotToCacheJson(snapshot));
            return {ok: true, snapshot, stale: false, lastError: null, cacheAgeMs: 0};
        } catch (_) {
            if (signal?.is_cancelled())
                return {ok: false, kind: 'error', message: 'Antigravity: quota check cancelled.'};
            const message = 'Antigravity: quota check failed. Verify agy login, version and executable path.';
            cache.markStale();
            cache.writeLastError(0, message);
            return staleResult(cache, parseCacheJson, {ok: false, kind: 'error', message});
        }
    });
}
