# AI Usage Bar — Claude, Codex and Antigravity

Based on AI Usage Bar v1.5.0, upstream commit `97ae1b5c99d820f22d966de7423ce88b07d01157`.
The popup keeps the upstream card design. All enabled providers appear together
in the panel and refresh together every 300 seconds by default. Scroll selects
the expanded popup provider; it does not hide the other panel values.

The default panel format `{remaining_pct}%` shows the tightest remaining
session/weekly allowance. All original vendor placeholders remain supported.
`{session_pct}%` and `{weekly_pct}%` always show usage; `{session_remaining_pct}%`
and `{weekly_remaining_pct}%` always show quota left.

Preferences → Popup → Percentage display controls popup quota cards only:
Used, Remaining (default), or Both. Remaining bars show quota left; Used and
Both bars show usage. Warning colors always reflect quota exhaustion.
Formats saved with the removed mode-dependent token are converted to the
explicit remaining format on enable.

Antigravity shows Gemini and Claude/GPT as separate allowances by default.
Choose Both groups, Gemini, or Claude/GPT in Preferences → Antigravity → Models
shown in the panel. Group labels can be Full, Short (default: `G` and `C/G`),
or Hidden. Full model group names remain in the popup, which retains all quotas.
Use `{session_remaining_pct}% / {weekly_remaining_pct}%` to show remaining
quota for the session and weekly windows separately.
`{remaining_reset}` is the tightest window's reset countdown.

Antigravity runs the installed `agy -p /usage --output-format json --print-timeout 20s`
command asynchronously, with a 25-second timeout and cancellation on disable.
It uses the CLI's existing login, discovers `agy` on PATH or in `~/.local/bin`,
and supports an explicit executable path in Preferences. The popup lists every
reported quota bucket under its model group. Only projected quotas are cached;
CLI stderr is never displayed or logged.

## Install

Download the [current custom.5 ZIP](https://github.com/vadym-horbach/ai-usage-bar/raw/refs/heads/main/dist/ai-usagebar%40wilfison.shell-extension.zip) or clone this repository, then:

```bash
gnome-extensions install --force dist/ai-usagebar@wilfison.shell-extension.zip
```

Log out and back in on Wayland, then:

```bash
gnome-extensions enable ai-usagebar@wilfison
gnome-extensions prefs ai-usagebar@wilfison
```

Enable Claude, OpenAI and Antigravity. Other providers are disabled by default.
Existing preferences are retained if you already installed upstream; set Bar
format to `{remaining_pct}%` and disable unwanted providers if needed.
The extension uses the upstream UUID and replaces that extension's installed files.
Installing the original v1.5.0 ZIP restores upstream behavior.

## Build and verify

`make test`, `make lint`, `make eslint`, `make validate`, `make pack`.
`make pack` preserves compiled translations from the checksum-verified upstream
v1.5.0 release; custom strings use English where translations are unavailable.
The installed version is `1.5.0-custom.2`.

---

# AI Usage Bar

A GNOME Shell extension that shows your AI plan usage in the top panel for
**Anthropic (Claude)**, **OpenAI (Codex)**, **Z.AI / GLM**, **OpenRouter**,
**DeepSeek**, **Kimi** and **Ollama Cloud**, plus one **custom provider** you
map yourself.

The panel shows a compact label for the active vendor (e.g. `42% · 3h12m`),
colored by severity. Click it for a popup with a section per enabled vendor;
scroll over it to cycle between them.

![The AI Usage Bar popup under the panel label](https://raw.githubusercontent.com/wilfison/ai-usagebar/main/screenshots/popup.png)

## Vendors

| Vendor | What is shown | Credentials |
| --- | --- | --- |
| **Anthropic (Claude)** | Session + weekly usage, model-scoped caps, extra usage, banked resets, plan; optionally your Claude Code sessions' context | `~/.claude/.credentials.json` (OAuth, auto-refreshed) |
| **OpenAI (Codex)** | 5h + weekly usage, code review, credits, banked resets | `~/.codex/auth.json` (OAuth) |
| **Z.AI / GLM** | Plan usage and reset windows | API key: `ZAI_API_KEY` |
| **OpenRouter** | Credit balance and usage | API key: `OPENROUTER_API_KEY` |
| **DeepSeek** | Balance / credits | API key: `DEEPSEEK_API_KEY` |
| **Kimi** | Weekly quota + 5h window, plan | API key: `KIMI_API_KEY` |
| **Ollama Cloud** | Session + weekly (or monthly) usage, top models, cost | API key: `OLLAMA_API_KEY` ([create one](https://ollama.com/settings/keys)) |
| **Custom** | Metrics and texts you map from a JSON endpoint | Optional key in a header you choose |

An API key is taken from the environment variable if it is set, otherwise from
the key typed in preferences. The variable names and the two credential paths
are configurable.

## Install

Requires **GNOME Shell 47–51** (developed and tested on 50; please
[report](https://github.com/wilfison/ai-usagebar/issues) anything that breaks
elsewhere). It is distributed only through GitHub releases, not
extensions.gnome.org.

1. Download `ai-usagebar@wilfison.shell-extension.zip` from the
   [latest release](https://github.com/wilfison/ai-usagebar/releases/latest).
2. Install it:

   ```bash
   gnome-extensions install --force ai-usagebar@wilfison.shell-extension.zip
   ```

3. Log out and back in (required on Wayland), then enable it:

   ```bash
   gnome-extensions enable ai-usagebar@wilfison
   ```

## Configuration

Open preferences with the gear button in the popup footer, or
`gnome-extensions prefs ai-usagebar@wilfison`. The sidebar has two sections:

- **General**: *Panel* (position and label format), *Popup* (extra rows, pace
  marker, the `Super+U` shortcut), *Display* (primary vendor, vendor logos,
  severity colors) and *Behavior* (refresh interval, notifications, update check, reset all).
- **Vendors**: one page per vendor: enable it and set its credentials.

![The preferences window with its sidebar](https://raw.githubusercontent.com/wilfison/ai-usagebar/main/screenshots/preferences.png)

Only the active vendor is polled, every 300 s at the least (the endpoints
rate-limit below that); the others refresh when you scroll to them or press
"Refresh all".

### Label placeholders

The panel label (`bar-format`, default `{session_pct}% · {session_reset}`) and
the optional popup rows (`tooltip-format`) substitute `{token}` placeholders
from the active vendor. An unknown token is left as is; a window the vendor did
not report resolves to an empty string.

Every vendor provides `{icon}`, `{vendor_short}`, `{plan}`, `{session_pct}`,
`{session_reset}`, `{session_elapsed}`, `{weekly_pct}`, `{weekly_reset}` and
`{weekly_elapsed}`. Reset tokens are countdowns such as `4h 05m`; `*_elapsed` is
the share of the window that has passed. Vendors with a reset instant also give
`{session_pace}` and `{weekly_pace}` (`↑` ahead of pace, `→` on track, `↓`
under). OpenRouter and DeepSeek have no usage windows, so there the `session_` /
`weekly_` tokens hold the consumed share (OpenRouter) or `0`.

<details>
<summary>Vendor-specific tokens</summary>

| Vendor | Its own tokens |
| --- | --- |
| Anthropic | `{sonnet_pct}`, `{sonnet_reset}`, `{sonnet_elapsed}`, `{sonnet_pace}`; for each of `session`, `weekly`, `sonnet`: `_pace_indicator`, `_pace_pct`, `_pace_pts`, `_pace_delta`, `_pace_abs_delta`; `{extra_spent}`, `{extra_limit}`, `{extra_pct}`; `{resets_available}` (banked resets), `{resets}` (`2 resets available`) |
| OpenAI | `{oai_plan}`; `{oai_session_*}` and `{oai_weekly_*}` with `_pct`, `_reset`, `_elapsed`, `_pace`, `_pace_indicator`; `{oai_code_review_pct}`, `{oai_credit_balance}`, `{oai_local_msgs}`, `{oai_cloud_msgs}`; `{oai_resets_available}`, `{oai_resets}` |
| Z.AI | `{zai_plan}`; `{zai_session_*}`, `{zai_weekly_*}`, `{zai_mcp_*}` with `_pct`, `_reset`, `_elapsed`, `_pace`, `_pace_indicator` |
| OpenRouter | `{or_label}`, `{or_balance}`, `{or_total}`, `{or_used}`, `{or_used_today}`, `{or_used_week}`, `{or_used_month}`, `{or_consumed_pct}`, `{or_free_tier}`, `{or_limit}`, `{or_limit_remaining}` |
| DeepSeek | `{ds_balance}`, `{ds_granted}`, `{ds_topped_up}`, `{ds_available}`, `{currency}` |
| Kimi | `{kimi_plan}`, `{kimi_window_pct}`, `{kimi_window_reset}`, `{kimi_weekly_pct}`, `{kimi_weekly_reset}`, `{kimi_monthly_pct}`, `{kimi_monthly_reset}` |
| Ollama Cloud | `{oll_plan}`, `{oll_cost}`; `{oll_session_*}`, `{oll_weekly_*}`, `{oll_monthly_*}` with `_pct`, `_reset`, `_elapsed` (never paced: the API reports no reset) |
| Custom provider | `{custom_plan}`, `{custom_<i>_pct}`, `{custom_<i>_reset}` for each metric from 0 |

</details>

### Custom provider

The **Custom** page turns any endpoint that answers a `GET` with JSON into a
vendor. Set a name, the URL (`https://`, unless you allow plain HTTP for a
local service), an optional API key with its header and scheme (default
`Authorization: Bearer`), optional extra headers as a JSON object, and a
**mapping** that addresses fields of the response by
[JSON Pointer](https://www.rfc-editor.org/rfc/rfc6901). Given

```json
{
  "account": {"tier": "Team"},
  "requests": {"used": 420, "limit": 1000, "resets_at": "2026-10-01T00:00:00Z"},
  "tokens": {"percent": 91.5, "seconds_left": 5400},
  "status": {"region": "sa-east-1"}
}
```

this mapping shows two usage rows and a text row:

```json
{
  "planPath": "/account/tier",
  "metrics": [
    {"label": "Requests", "used": "/requests/used", "limit": "/requests/limit",
     "resetsAt": "/requests/resets_at", "windowSecs": 86400},
    {"label": "Tokens", "percent": "/tokens/percent", "resetsAfterSeconds": "/tokens/seconds_left"}
  ],
  "texts": [
    {"label": "Region", "value": "/status/region"}
  ]
}
```

- A **metric** has either `used` + `limit` or a single `percent`. Numbers may be
  JSON numbers or numeric strings.
- `resetsAt` takes an RFC 3339 timestamp or a Unix epoch (seconds or
  milliseconds); `resetsAfterSeconds` takes the seconds left. With `windowSecs`
  (at least 60) and a reset, the row gets the pace marker.
- A **text** shows a string, number or boolean. `plan` sets a fixed title;
  `planPath` reads it from the response.
- Labels are 1–64 characters and unique. The mapping is checked when the editor
  loses focus, and the last valid one is kept.
- A pointer that does not resolve fails the refresh; the last good figures stay
  on screen, marked stale.

### Context monitor

On the Anthropic page, **Show session context** lists your most recent Claude
Code sessions with how much of the context window each one used. It reads the
tail of the transcripts in `~/.claude/projects` only while the option is on. Set
a default window size (and optionally per-model sizes) to get a percentage
instead of a raw token count.

## How it behaves

- **Stale data.** When a refresh fails, the last good figures stay on screen
  with a `⏸` mark for up to 7 days; after that the error is shown.
- **Rate limits.** An HTTP 429 pauses that vendor for 5 minutes; the popup says
  when the next attempt is.
- **Notifications.** Each usage window notifies once when it reaches the
  threshold (default 97%), and again only after usage drops 7 points below it or
  the window resets. A banked reset is announced 48 hours before it expires.
- **Updates.** Once a day the extension asks GitHub for the latest release; when
  it is newer than the installed one, a link to it appears at the bottom of the
  popup. Turn it off under *Behavior*.

## Privacy

- Credentials are read locally and sent only to the vendor they belong to, over
  HTTPS (the custom provider may use plain HTTP if you allow it). A redirect to
  another origin is never followed.
- No telemetry, no analytics, no third parties. The daily update check is one
  unauthenticated request to `api.github.com`, and it can be turned off.
- Only the figures shown in the popup are cached, under
  `~/.cache/ai-usagebar/`; credentials are never copied or logged, and refreshed
  OAuth tokens are written back only to the file they came from.

## Development

There is no build step: GNOME Shell loads the JS directly. Symlink the checkout
as `~/.local/share/gnome-shell/extensions/ai-usagebar@wilfison` and use the
`Makefile` (run `make` to list every target):

```bash
make test      # pure-JS unit suite (gjs)
make lint      # hygiene lint
make eslint    # needs `npm ci`
make validate  # metadata.json + schema
make run       # nested gnome-shell (Wayland) to test live
make logs      # follow the gnome-shell journal
make pack      # build the installable zip
```

Dependencies:

```bash
# Ubuntu
sudo apt install gjs libglib2.0-bin gettext gir1.2-soup-3.0 mutter-dev-bin
# Arch
sudo pacman -S gjs glib2-devel gnome-shell gettext libsoup3 mutter
```

Architecture, conventions and the testing policy are in
[`CLAUDE.md`](CLAUDE.md). Issues and pull requests are welcome.

## Credits & license

A GNOME Shell port inspired by the
[`akitaonrails/ai-usagebar`](https://github.com/akitaonrails/ai-usagebar) Waybar
widget. MIT license, see [`LICENSE`](LICENSE).

Vendor names and the monochrome logos under [`icons/`](icons/) (sources in
[`icons/README.md`](icons/README.md)) are used only to identify each service;
the marks belong to their owners and no affiliation or endorsement is implied.
Turn **Show vendor logos** off to show plain short codes instead.
