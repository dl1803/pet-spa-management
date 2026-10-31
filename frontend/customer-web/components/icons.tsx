import type { ReactNode, SVGProps } from "react";

const ICON_PATHS = {
  home: (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </>
  ),
  paw: (
    <>
      <circle cx="5.5" cy="10.5" r="2" />
      <circle cx="9.5" cy="5.5" r="2" />
      <circle cx="14.5" cy="5.5" r="2" />
      <circle cx="18.5" cy="10.5" r="2" />
      <path d="M12 12c-3 0-6 4-6 6.6 0 1.6 1.2 2.4 2.6 2.4 1.4 0 2.2-.8 3.4-.8s2 .8 3.4.8c1.4 0 2.6-.8 2.6-2.4C18 16 15 12 12 12z" />
    </>
  ),
  "calendar-plus": (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M12 14v5M9.5 16.5h5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  "chev-d": <path d="m6 9 6 6 6-6" />,
  "chev-l": <path d="m15 18-6-6 6-6" />,
  "chev-r": <path d="m9 18 6-6-6-6" />,
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4.5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5M12 7v5l4 2" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  droplet: (
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
  ),
  bed: <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />,
  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  "x-circle": (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </>
  ),
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  shield: (
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2M10 2h4" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICON_PATHS;

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { name: IconName };

export function Icon({ name, className = "size-[18px]", ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
      {...rest}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

export function PawLogo({ className, ...rest }: Omit<SVGProps<SVGSVGElement>, "children">) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className} {...rest}>
      <ellipse cx="5.2" cy="10.4" rx="2.1" ry="2.6" transform="rotate(-20 5.2 10.4)" />
      <ellipse cx="9.4" cy="5.6" rx="2.1" ry="2.7" />
      <ellipse cx="14.6" cy="5.6" rx="2.1" ry="2.7" />
      <ellipse cx="18.8" cy="10.4" rx="2.1" ry="2.6" transform="rotate(20 18.8 10.4)" />
      <path d="M12 11.2c-3.1 0-6.2 4.4-6.2 7.1 0 1.7 1.3 2.5 2.8 2.5 1.4 0 2.2-.8 3.4-.8s2 .8 3.4.8c1.5 0 2.8-.8 2.8-2.5 0-2.7-3.1-7.1-6.2-7.1Z" />
    </svg>
  );
}
