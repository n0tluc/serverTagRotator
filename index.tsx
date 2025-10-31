/*
 * serverTagRotator – Automatically rotates your worn Discord Server Tag
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import { findByPropsLazy } from "@webpack";
import { React, Toasts, Forms } from "@webpack/common";

// --- Safe loader
function safeFindByProps(...props: string[]): any {
    try {
        return findByPropsLazy(...props);
    } catch {
        console.warn("[serverTagRotator] Missing module:", props);
        return null;
    }
}

// --- Discord Stores
const GuildStore = safeFindByProps("getGuild", "getGuilds") ?? {
    getGuild: () => null,
    getGuilds: () => ({})
};
const PresenceStore = safeFindByProps("isOnline", "getStatus") ?? {
    getStatus: () => "online"
};

// --- Token
const TokenModule = safeFindByProps("getToken");
const getToken = TokenModule?.getToken ?? (() => undefined);

// --- Settings
export const settings = definePluginSettings({
    intervalSeconds: {
        type: OptionType.NUMBER,
        description: "Interval (in seconds) between automatic Server Tag rotations.",
        default: 600,
        isInteger: true,
        min: 10,
        max: 86400
    },
    shuffle: {
        type: OptionType.BOOLEAN,
        description: "Randomize the order of rotation.",
        default: false
    },
    onlyWhenOnline: {
        type: OptionType.BOOLEAN,
        description: "Rotate only when your status is set to 'Online'.",
        default: true
    },
    selectedGuildIds: {
        type: OptionType.STRING,
        description: "Guilds selected for tag rotation.",
        default: ""
    }
});

// --- Helpers
function parseSelectedGuildIds(): string[] {
    const raw = settings.store.selectedGuildIds?.trim();
    if (!raw) return [];
    try {
        const maybe = JSON.parse(raw);
        if (Array.isArray(maybe)) return maybe.filter(Boolean);
    } catch { }
    return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function shuffleInPlace<T>(a: T[]) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
}

// --- Discord API: PUT /users/@me/clan
async function wearGuildTag(guildId: string) {
    const token = getToken?.();
    if (!token) {
        console.warn("[serverTagRotator] No token found.");
        return;
    }

    const res = await fetch("https://discord.com/api/v9/users/@me/clan", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: token
        },
        body: JSON.stringify({
            identity_guild_id: guildId,
            identity_enabled: true
        })
    });

    if (!res.ok) {
        console.error("[serverTagRotator] Failed:", res.status, await res.text());
    }
}

// --- Rotation logic
let timer: any = null;
let queue: string[] = [];
let index = 0;

async function rotateOnce() {
    const ids = parseSelectedGuildIds();
    if (ids.length === 0) return;
    if (settings.store.onlyWhenOnline && PresenceStore?.getStatus?.() !== "online") return;

    if (queue.length === 0) {
        queue = ids.slice();
        if (settings.store.shuffle) shuffleInPlace(queue);
        index = 0;
    }

    const nextGuildId = queue[index % queue.length];
    index++;

    await wearGuildTag(nextGuildId);
    Toasts.show({
        message: `Switched Server Tag to: ${GuildStore?.getGuild?.(nextGuildId)?.name ?? nextGuildId}`,
        type: 1
    });
}

function startTimer() {
    stopTimer();
    const interval = Math.max(10, Number(settings.store.intervalSeconds) || 600) * 1000;
    rotateOnce();
    timer = setInterval(rotateOnce, interval);
}

function stopTimer() {
    if (timer != null) clearInterval(timer);
    timer = null;
}

// --- Settings UI
const SettingsUI = () => {
    const [, force] = React.useReducer((x: number) => x + 1, 0);

    const guilds = React.useMemo(() => {
        const all = GuildStore?.getGuilds?.() ?? {};
        return Object.values(all).sort((a: any, b: any) => a.name.localeCompare(b.name));
    }, [force]);

    const selected = new Set(parseSelectedGuildIds());

    function setSelected(next: Set<string>) {
        settings.store.selectedGuildIds = JSON.stringify(Array.from(next));
        force(0);
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle>Server Tag Rotator</Forms.FormTitle>
            <Forms.FormText>
                Automatically rotates your visible <b>Server Tag</b> at a chosen interval.
            </Forms.FormText>

            <Forms.FormDivider />

            <Forms.FormTitle>Server Selection</Forms.FormTitle>
            <Forms.FormText>Select which servers to include in the rotation.</Forms.FormText>

            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                marginTop: 8,
                maxHeight: 260,
                overflowY: "auto",
                padding: 6,
                border: "1px solid var(--background-modifier-accent)",
                borderRadius: 6
            }}>
                {guilds.map((g: any) => (
                    <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                            type="checkbox"
                            checked={selected.has(g.id)}
                            onChange={e => {
                                const next = new Set(selected);
                                if (e.currentTarget.checked) next.add(g.id);
                                else next.delete(g.id);
                                setSelected(next);
                            }}
                        />
                        <span>{g.name}</span>
                    </label>
                ))}
            </div>

            <Forms.FormDivider />


            <button
                onClick={() => {
                    stopTimer();
                    startTimer();
                    Toasts.show({ message: "Rotation restarted successfully!", type: 1 });
                }}
                style={{
                    marginTop: 16,
                    background: "var(--brand-experiment)",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: 4,
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer"
                }}
            >
                Apply & Restart
            </button>
        </Forms.FormSection>
    );
};

// --- Plugin export
export default definePlugin({
    name: "serverTagRotator",
    description: "Automatically rotates your visible Discord Server Tag using the /users/@me/clan API.",
    authors: [Devs.Ven],
    settings,
    settingsAboutComponent: SettingsUI,
    start() {
        startTimer();
    },
    stop() {
        stopTimer();
    }
});
