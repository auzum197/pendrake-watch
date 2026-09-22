import type { CSSProperties } from "react";
import { LifeHashIcon, lifehashAccent } from "./lifehash";

const RING_WIDTH = 2;
const GLOW_BLUR = 8;
const GLOW_SPREAD = 0;
const GLOW_ALPHA = "40";

function accentGlow(fingerprint: string): CSSProperties {
	const accent = lifehashAccent(fingerprint);
	return {
		border: `${RING_WIDTH}px solid ${accent}`,
		boxShadow: `0 0 ${GLOW_BLUR}px ${GLOW_SPREAD}px ${accent}${GLOW_ALPHA}`,
	};
}

export function LifeHashAvatar({
	fingerprint,
	className,
	ringed = false,
}: {
	fingerprint: string;
	className?: string;
	ringed?: boolean;
}) {
	return (
		<LifeHashIcon
			fingerprint={fingerprint}
			className={className}
			style={ringed ? accentGlow(fingerprint) : undefined}
		/>
	);
}
