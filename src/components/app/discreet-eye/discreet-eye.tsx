import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { toggleDiscreet, useDiscreet } from "@/lib/discreet";


export function DiscreetEye() {
	const hidden = useDiscreet();
	const Icon = hidden ? IconEyeOff : IconEye;
	return (
		<button
			type="button"
			aria-pressed={hidden}
			aria-label="Discreet mode"
			title={hidden ? "Show values" : "Hide values"}
			onClick={() => void toggleDiscreet()}
			className="flex shrink-0 cursor-pointer select-none items-center text-white/45 transition-colors hover:text-white/80 focus-visible:outline-2 focus-visible:outline-brand"
		>
			<Icon className="size-3.5" />
		</button>
	);
}
