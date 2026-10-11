import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import system from 'system';
import {runUsage} from '../../../../lib/vendors/antigravity/command.js';
import {describe, it, assertEqual, summary} from '../../../_assert.js';
function sync(promise) {
    const loop = GLib.MainLoop.new(null, false);
    let value, error;
    promise.then(v => { value = v; loop.quit(); }, e => { error = e; loop.quit(); });
    loop.run();
    if (error)
        throw error;
    return value;
}
function script(body, fn) {
    const dir = GLib.dir_make_tmp('usagebar-command-XXXXXX');
    const path = GLib.build_filenamev([dir, 'agy']);
    const f = Gio.File.new_for_path(path);
    GLib.file_set_contents(path, `#!/bin/sh\n${body}\n`);
    f.set_attribute_uint32('unix::mode', 0o700, Gio.FileQueryInfoFlags.NONE, null);
    try { fn(path); } finally { f.delete(null); Gio.File.new_for_path(dir).delete(null); }
}
describe('Antigravity subprocess', () => {
    it('passes only the read-only quota command and JSON flags', () => {
        script('printf "%s\\n" "$@"', path => {
            assertEqual(sync(runUsage(path)), '-p\n/usage\n--output-format\njson\n--print-timeout\n20s\n');
        });
    });
    it('does not expose process stderr on failure', () => {
        script('echo credential-secret >&2; exit 1', path => {
            const result = sync(runUsage(path).then(() => '', e => e.message));
            assertEqual(result.includes('credential-secret'), false);
            assertEqual(result.includes('check failed'), true);
        });
    });
    it('reports missing executable', () => {
        const message = sync(runUsage('/nonexistent/agy').then(() => '', e => e.message));
        assertEqual(message.includes('could not start'), true);
    });
    it('honors a pre-cancelled request', () => {
        const signal = new Gio.Cancellable(); signal.cancel();
        const message = sync(runUsage('/nonexistent/agy', signal).then(() => '', e => e.message));
        assertEqual(message.includes('cancelled'), true);
    });
    it('terminates a running process on cancellation', () => {
        script('exec sleep 60', path => {
            const signal = new Gio.Cancellable();
            GLib.timeout_add_once(GLib.PRIORITY_DEFAULT, 30, () => signal.cancel());
            const message = sync(runUsage(path, signal).then(() => '', e => e.message));
            assertEqual(message.includes('cancelled'), true);
        });
    });
});
system.exit(summary());
