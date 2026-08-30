import "./dot-stream.css";

export function DotStream({ className }: { className?: string }) {
	return (
		<span
			className={`dot-stream ${className ?? ""}`}
			role="status"
			aria-label="Syncing"
		>
			<span />
			<span />
			<span />
			<span />
			<span />
		</span>
	);
}
