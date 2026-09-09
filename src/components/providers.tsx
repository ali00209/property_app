"use client";

import { LayerProvider, LinkProvider, Theme } from "@astryxdesign/core";
import { butterTheme } from "@astryxdesign/theme-butter";
import { gothicTheme } from "@astryxdesign/theme-gothic";
import { matchaTheme } from "@astryxdesign/theme-matcha";
import { neutralTheme } from "@astryxdesign/theme-neutral";
import { stoneTheme } from "@astryxdesign/theme-stone";
import { y2kTheme } from "@astryxdesign/theme-y2k";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  getThemePrefs,
  subscribeThemePrefs,
} from "@/lib/theme-store";

const themes: Record<string, typeof butterTheme> = {
  butter: butterTheme,
  neutral: neutralTheme,
  matcha: matchaTheme,
  gothic: gothicTheme,
  stone: stoneTheme,
  y2k: y2kTheme,
};

const serverPreload = { theme: "butter", mode: "system" as const };

export function Providers({ children }: { children: React.ReactNode }) {
  const prefs = useSyncExternalStore(
    subscribeThemePrefs,
    getThemePrefs,
    () => serverPreload,
  );

  return (
    <Theme theme={themes[prefs.theme] ?? butterTheme} mode={prefs.mode}>
      <LinkProvider component={Link}>
        <LayerProvider>{children}</LayerProvider>
      </LinkProvider>
    </Theme>
  );
}