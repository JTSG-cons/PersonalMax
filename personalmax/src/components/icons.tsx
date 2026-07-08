// Hand-rolled inline SVG icons (no icon dependency).

const PATHS = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5",
  dumbbell:
    "M6.5 6.5v11M4 8v8M2 9.5v5M17.5 6.5v11M20 8v8M22 9.5v5M6.5 12h11",
  flame:
    "M12 3c1 3-.5 4.5-1.5 6C9.5 10.5 9 12 9 13.5A3.5 3.5 0 0 0 12.5 17c2.5 0 4.5-2 4.5-5 0-3.5-2.5-5.5-5-9ZM12.5 21c-4 0-7-2.5-7-6.5 0-2 1-3.9 2-5",
  utensils:
    "M7 3v7a2 2 0 0 1-2 2v9M5 3v5M9 3v5M17 3c-1.5 1-2.5 3-2.5 5.5 0 2 1 3 2.5 3V21",
  shield: "M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z",
  swords:
    "M4 4l7 7M4 4v3M4 4h3M20 4l-7 7M20 4v3M20 4h-3M6.5 14.5 4 20l5.5-2.5M17.5 14.5 20 20l-5.5-2.5M9 15l6 0",
  users:
    "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a3 3 0 1 0-2-5.2M2.5 20c.5-3.5 3-5 5.5-5s5 1.5 5.5 5M15 15.5c2 .3 4 1.7 4.5 4.5",
  trophy:
    "M7 4h10v5a5 5 0 0 1-10 0V4ZM7 5H4a3 3 0 0 0 3 5M17 5h3a3 3 0 0 1-3 5M12 14v3m-4 4h8m-6.5-4h5l1 4h-7l1-4Z",
  crown: "M4 8l4 4 4-7 4 7 4-4v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z",
  chart: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  plus: "M12 5v14M5 12h14",
  calendar:
    "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8 3v4M16 3v4M4 10h16",
  target: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0",
} as const satisfies Record<string, string>;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
