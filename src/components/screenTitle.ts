import { colors, fontSizes, sizes } from '@/theme';

// The one look for a screen's title (the Insights screen's): bold text the size of the app name on Home at the start of the line. Spread it into
// a title style, and add layout (flex: 1) in the screen when the title shares a row with buttons.
export const screenTitle = { fontSize: fontSizes.lg, color: colors.textPrimary } as const;

// The row a title sits in. Every screen's title is centered in a row this tall at the top of the screen (a back button or
// the other buttons in the row are as tall), so titles line up from one screen to the next.
export const screenTitleRow = { minHeight: sizes.touchMin, justifyContent: 'center' } as const;
