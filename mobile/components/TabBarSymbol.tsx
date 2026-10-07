import { Text, type ColorValue } from 'react-native';

/** Single-color tab glyphs (system font) — reliable on Android release builds. */
const SYMBOLS = {
  nearby: '\u25CE', // ◎
  chats: '\u2709', // ✉
  profile: '\u25CF', // ●
  safety: '\u2713', // ✓
} as const;

export type TabBarSymbolId = keyof typeof SYMBOLS;

export function TabBarSymbol({
  id,
  color,
  size,
}: {
  id: TabBarSymbolId;
  color: ColorValue;
  size: number;
}) {
  return (
    <Text
      style={{
        color,
        fontSize: Math.round(size * 0.92),
        lineHeight: Math.round(size * 1.05),
        fontWeight: '600',
        textAlign: 'center',
      }}
    >
      {SYMBOLS[id]}
    </Text>
  );
}
