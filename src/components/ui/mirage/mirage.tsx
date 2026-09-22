import { useId, type CSSProperties } from "react";
import "./mirage.css";

export function Mirage({
	size = 24,
	speed = 2.5,
	className,
}: {
	size?: number;
	speed?: number;
	className?: string;
}) {
	const filterId = useId();
	const dot = size * 0.23;
	return (
		<svg
			className={`mirage ${className ?? ""}`}
			role="status"
			aria-label="Syncing"
			width={size}
			height={dot}
			viewBox={`0 0 ${size} ${dot}`}
			preserveAspectRatio="xMidYMid meet"
			style={
				{
					"--uib-size": `${size}px`,
					"--uib-speed": `${speed}s`,
					filter: `url(#${filterId})`,
				} as CSSProperties
			}
		>
			{Array.from({ length: 5 }, (_, i) => (
				<circle key={i} className="mirage-dot" cx="0" cy={dot / 2} r={dot / 2} />
			))}
			<defs>
				<filter id={filterId}>
					<feGaussianBlur in="SourceGraphic" stdDeviation={size / 20} result="blur" />
					<feColorMatrix
						in="blur"
						type="matrix"
						values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
						result="ooze"
					/>
					<feBlend in="SourceGraphic" in2="ooze" />
				</filter>
			</defs>
		</svg>
	);
}
