/**
 * Module: MdiIcon
 * Layer:  web-component (presentational)
 * Context: See COPILOT_CONTEXT.md; UI/UX redesign Phase 1
 *
 * Purpose: @mdi/js exports raw SVG path-data strings, not React components --
 *          this is the one wrapper that turns a path into a rendered icon.
 *          MDI is the exact icon set the mobile app's MaterialCommunityIcons
 *          wraps, used here for true visual parity across platforms.
 *
 * Notes:
 * - `currentColor` by default, so an icon inherits its surrounding text
 *   color (including the theme tokens) unless a `color` prop overrides it --
 *   matches how every other themed element in this app already works.
 */
interface MdiIconProps {
  path: string;
  size?: number;
  color?: string;
  className?: string;
}

export function MdiIcon({ path, size = 20, color = 'currentColor', className }: MdiIconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color} className={className} aria-hidden="true">
      <path d={path} />
    </svg>
  );
}
