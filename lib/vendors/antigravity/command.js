import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export function runUsage(executable, signal) {
    const local = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'bin', 'agy']);
    const path = executable || GLib.find_program_in_path('agy') || local;
    return new Promise((resolve, reject) => {
        if (signal?.is_cancelled()) {
            reject(new Error('Antigravity: quota check cancelled.'));
            return;
        }
        let process;
        try {
            const launcher = new Gio.SubprocessLauncher({flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE});
            launcher.set_cwd(GLib.get_home_dir());
            process = launcher.spawnv([path, '-p', '/usage', '--output-format', 'json', '--print-timeout', '20s']);
        } catch (_) {
            reject(new Error('Antigravity: agy could not start. Set its executable path in preferences.'));
            return;
        }
        const cancelId = signal?.connect(() => process.force_exit());
        let timedOut = false;
        const timeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 25, () => {
            timedOut = true;
            process.force_exit();
            return GLib.SOURCE_REMOVE;
        });
        process.communicate_utf8_async(null, null, (proc, result) => {
            if (!timedOut)
                GLib.Source.remove(timeoutId);
            if (cancelId)
                signal.disconnect(cancelId);
            try {
                const [, stdout] = proc.communicate_utf8_finish(result);
                if (signal?.is_cancelled())
                    throw new Error('Antigravity: quota check cancelled.');
                if (timedOut)
                    throw new Error('Antigravity: quota check timed out.');
                if (!proc.get_successful())
                    throw new Error('Antigravity: quota check failed. Run agy to check your login.');
                resolve(stdout);
            } catch (e) {
                reject(e);
            }
        });
    });
}
