"use client";

import { Heading, SelectableCard, Stack, Text } from "@astryxdesign/core";
import { useSyncExternalStore } from "react";
import {
  getThemePrefs,
  MODE_OPTIONS,
  setThemePrefs,
  subscribeThemePrefs,
  THEME_OPTIONS,
  type ThemePrefs,
} from "@/lib/theme-store";

export function SettingsForm() {
  const prefs = useSyncExternalStore(
    subscribeThemePrefs,
    getThemePrefs,
    () => ({ theme: "butter", mode: "system" }) as ThemePrefs,
  )
  const current: ThemePrefs = prefs ?? { theme: "butter", mode: "system" }

  return (
    <Stack gap={5}>
      <Stack>
        <Heading level={1}>Settings</Heading>
        <Text type="body" color="secondary">
          Adjust application preferences. These are stored on this device.
        </Text>
      </Stack>

      <Stack gap={2}>
        <Heading level={3}>Theme mode</Heading>
        <Stack direction="horizontal" gap={3}>
          {MODE_OPTIONS.map((option) => (
            <SelectableCard
              key={option.value}
              label={`${option.label} mode`}
              isSelected={current.mode === option.value}
              onChange={() =>
                setThemePrefs({ ...current, mode: option.value })
              }
            >
              <Text type="body" weight="bold">
                {option.label}
              </Text>
            </SelectableCard>
          ))}
        </Stack>
      </Stack>

      <Stack gap={2}>
        <Heading level={3}>Theme palette</Heading>
        <Stack direction="horizontal" gap={3}>
          {THEME_OPTIONS.map((option) => (
            <SelectableCard
              key={option.value}
              label={`${option.label} palette`}
              isSelected={current.theme === option.value}
              onChange={() =>
                setThemePrefs({ ...current, theme: option.value })
              }
            >
              <Text type="body" weight="bold">
                {option.label}
              </Text>
            </SelectableCard>
          ))}
        </Stack>
      </Stack>
    </Stack>
  )
}