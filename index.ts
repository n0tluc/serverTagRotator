/*
 * Vencord, a Discord client mod
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { definePluginSettings } from "@api/Settings";
import { Forms, React, Toasts } from "@webpack/common";
import { findByPropsLazy } from "@webpack";

// --- Discord internals (lazy lookups)
const GuildStore = findByPropsLazy("getGuild", "getGuilds");
const PresenceStore = findByPropsLazy("isOnline", "getStatus");
const ProfileActions = findByPropsLazy(
    "fetchCurrentUser", "saveGuildProfile", "updateLocalGuildProfile", "openUserProfile"
);
const RestModule = findByPropsLazy("getAPIBaseURL", "patch", "put", "get");
const { getToken } = findByPropsLazy("getToken");

// --- Settings
export const settings = definePluginSettings({
    intervalSeconds: {
        type: OptionType.NUMBER,
        description: "Intervall in Sekunden, nach dem der getragene Server-Tag gewechselt wird",
        default: 600,
        isInteger: true,
        min: 10,
        max: 24 * 60 * 60
    },
    shuffle: {
        type: OptionType.BOOLEAN,
        description: "Zufällige Reihenfolge statt fester Rotation",
        default: false
    },
    onlyWhenOnline: {
        type: OptionType.BOOLEAN,
        description: "Nur rotieren, wenn dein Status 'Online' ist",
        default: true
    },
    selectedGuildIds: {
        type: OptionType.STRING,
        description: "Vom UI befüllt. Alternativ CSV/JSON mit Guild-IDs.",
        default: ""
    }
});

function parseSelectedGuildIds(): string[] {
    const raw = settings.store.selectedGuildIds?.trim();
    if (!raw) return [];
    try {
        const maybe = JSON.parse(raw);
        if (Array.isArray(maybe)) return maybe.filter(Boolean);
    } catch {}
    return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function shuffleInPlace<T>(a: T[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
}

async function wearGuildTag(guildId: string) {
    // Strategy 1: internal client action
    try {
        if (ProfileActions?.saveGuildProfile) {
            await ProfileActions.saveGuildProfile(guildId, { });
        }
    } catch (e) {
        // ignore, try REST
    }

    // Strategy 2: REST fallback (endpoints may change)
    try {
        const token = getToken?.();
        if (!token || !RestModule?.patch || !RestModule?.getAPIBaseURL) throw new Error("REST unavailable");

        const api = RestModule.getAPIBaseURL?.() ?? "https://discord.com/api/v9";
        const headers = {
            "Content-Type": "application/json",
            "Authorization": token
        };

        // Candidate A: per-guild profile save
        await RestModule.patch(`${api}/guilds/${guildId}/profile/@me`, {
            body: JSON.stringify({ }),
            headers
        });

        // Candidate B: global selected guild tag (not always present)
        await RestModule.patch(`${api}/users/@me/profile`, {
            body: JSON.stringify({ selected_guild_tag: { guild_id: guildId } }),
            headers
        });
    } catch (e) {
        console.error("[serverTagRotator] REST attempt failed", e);
        throw e;
    }
}

let timer: number | null = null;
let queue: string[] = [];
let index = 0;

async function rotateOnce() {
    const ids = parseSelectedGuildIds();
    if (ids.length === 0) return;

    if (settings.store.onlyWhenOnline && PresenceStore?.getStatus) {
        const st = PresenceStore.getStatus?.();
        if (st && st !== "online") return;
    }

    if (queue.length === 0) {
        queue = ids.slice();
        if (settings.store.shuffle) shuffleInPlace(queue);
        index = 0;
    }

    const nextGuildId = queue[index % queue.length];
    index++;

    try {
        await wearGuildTag(nextGuildId);
        Toasts.show({
            message: `Server-Tag rotiert zu: ${GuildStore?.getGuild?.(nextGuildId)?.name ?? nextGuildId}`,
            type: 1
        });
    } catch {
        Toasts.show({ message: "Konnte Server-Tag nicht setzen (siehe Konsole).", type: 3 });
    }
}

function startTimer() {
    stopTimer();
    const interval = Math.max(10, Number(settings.store.intervalSeconds) || 600) * 1000;
    rotateOnce();
    // @ts-ignore
    timer = setInterval(rotateOnce, interval) as unknown as number;
}

function stopTimer() {
    if (timer != null) {
        clearInterval(timer as unknown as number);
        timer = null;
    }
}

const SettingsUI = () => {
    const [, force] = React.useReducer((x: number) => x + 1, 0);

    const guilds = React.useMemo(() => {
        const all = GuildStore?.getGuilds?.() ?? {};
        return Object.values(all).sort((a: any, b: any) => a.name.localeCompare(b.name));
    }, [force]);

    const selected = new Set(parseSelectedGuildIds());

    function setSelected(next: Set<string>) {
        const list = Array.from(next);
        settings.store.selectedGuildIds = JSON.stringify(list);
        settings.save();
        force(0);
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Server-Tags auswählen</Forms.FormTitle>
            <Forms.FormText>
                Wähle die Server, deren <b>Server-Tag</b> du reihum tragen möchtest.
            </Forms.FormText>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                {guilds.map((g: any) => {
                    const checked = selected.has(g.id);
                    return (
                        <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={e => {
                                    const next = new Set(selected);
                                    if (e.currentTarget.checked) next.add(g.id);
                                    else next.delete(g.id);
                                    setSelected(next);
                                }}
                            />
                            <span>{g.name}</span>
                        </label>
                    );
                })}
            </div>

            <div className={Margins.top16}>
                <Forms.FormTitle tag="h3">Rotation</Forms.FormTitle>
                <Forms.FormText>Intervall (Sekunden), Zufall &amp; Online-Check</Forms.FormText>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
                    <input
                        type="number"
                        min={10}
                        step={10}
                        defaultValue={settings.store.intervalSeconds}
                        onChange={e => (settings.store.intervalSeconds = Number(e.currentTarget.value))}
                        style={{ width: 110 }}
                        aria-label="Interval seconds"
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                            type="checkbox"
                            defaultChecked={settings.store.shuffle}
                            onChange={e => (settings.store.shuffle = e.currentTarget.checked)}
                        />
                        Zufällig
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                            type="checkbox"
                            defaultChecked={settings.store.onlyWhenOnline}
                            onChange={e => (settings.store.onlyWhenOnline = e.currentTarget.checked)}
                        />
                        Nur wenn online
                    </label>
                    <button
                        onClick={() => {
                            settings.save();
                            stopTimer();
                            startTimer();
                            Toasts.show({ message: "Rotation neu gestartet.", type: 1 });
                        }}
                    >
                        Anwenden &amp; Neustarten
                    </button>
                </div>
            </div>
        </Forms.FormSection>
    );
};

export default definePlugin({
    name: "serverTagRotator",
    description: "Rotiere automatisch deinen getragenen Server-Tag über ausgewählte Server.",
    authors: [Devs.Ven],
    settings,
    settingsAboutComponent: SettingsUI,
    start() { startTimer(); },
    stop() { stopTimer(); }
});
