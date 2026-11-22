import { FILLED, PATHS, type IconName } from "../lib/icon-paths";

export function Icon({
  name,
  className,
  label,
}: {
  name: IconName;
  className?: string;
  label?: string;
}) {
  if (name === "check" || name === "sidebar") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        aria-hidden={!label}
        aria-label={label}
      >
        <path d={FILLED[name]} />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={!label}
      aria-label={label}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
