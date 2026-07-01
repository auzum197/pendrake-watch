// Two interlocking rings for the Transparent pool, from the designer's rings.svg.
// The brand's warm accent gradient is lightened here so the rings glow against the
// pool tile's dark fill.
export function RingsIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			className={className}
			aria-hidden
		>
			<path
				d="M9 16C12.866 16 16 12.866 16 9C16 5.13401 12.866 2 9 2C5.13401 2 2 5.13401 2 9C2 12.866 5.13401 16 9 16Z"
				stroke="url(#rings-a)"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M15 22C18.866 22 22 18.866 22 15C22 11.134 18.866 8 15 8C11.134 8 8 11.134 8 15C8 18.866 11.134 22 15 22Z"
				stroke="url(#rings-b)"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<defs>
				<linearGradient
					id="rings-a"
					x1="4.37799"
					y1="3.47368"
					x2="16"
					y2="16"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#ffb277" />
					<stop offset="1" stopColor="#ffe0b8" />
				</linearGradient>
				<linearGradient
					id="rings-b"
					x1="10.378"
					y1="9.47368"
					x2="22"
					y2="22"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#ffb277" />
					<stop offset="1" stopColor="#ffe0b8" />
				</linearGradient>
			</defs>
		</svg>
	);
}
