import {
	useRef,
	type ComponentType,
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
} from "react";
import { ContextMenu, DropdownMenu } from "radix-ui";
import {
	IconArrowsExchange,
	IconDots,
	IconPencil,
	IconSettings,
	IconTrash,
} from "@tabler/icons-react";
import { openSettings } from "@/lib/settings-modal";
import { switchWallet } from "../wallet-card/switch-wallet";
import "./wallet-menu.css";

// What the menu needs of a Wallet. A WalletSummary satisfies it as is.
export type WalletMenuTarget = {
	id: string;
	label: string;
	selected: boolean;
};

export type WalletMenuActions = {
	wallet: WalletMenuTarget;
	onRename: () => void;
	onRemove: () => void;
	// Folds the switcher away, for the items that leave it behind.
	onClose: () => void;
};

type ItemProps = {
	className?: string;
	disabled?: boolean;
	onSelect?: (e: Event) => void;
	children?: ReactNode;
};

// Radix keeps the dropdown and the context menu separate, so the caller hands in
// which family to render and the items stay in one place.
export function WalletMenuItems({
	Item,
	Separator,
	wallet,
	onRename,
	onRemove,
	onClose,
}: WalletMenuActions & {
	Item: ComponentType<ItemProps>;
	Separator: ComponentType<{ className?: string }>;
}) {
	return (
		<>
			<div className="wallet-menu-heading">{wallet.label}</div>
			{!wallet.selected && (
				<Item
					className="wallet-menu-item"
					onSelect={() => {
						onClose();
						switchWallet(wallet.id);
					}}
				>
					<IconArrowsExchange />
					Use
				</Item>
			)}
			<Item className="wallet-menu-item" onSelect={onRename}>
				<IconPencil />
				Rename…
			</Item>
			<Item
				className="wallet-menu-item"
				onSelect={() => {
					onClose();
					openSettings({ wallet: wallet.id });
				}}
			>
				<IconSettings />
				Wallet settings…
			</Item>
			<Separator className="wallet-menu-sep" />
			<Item
				className="wallet-menu-item"
				data-danger=""
				onSelect={() => {
					onClose();
					onRemove();
				}}
			>
				<IconTrash />
				Remove…
			</Item>
		</>
	);
}

// A portal keeps the menu out of the card's DOM, but its events still bubble up
// the React tree into the row or head that hosts the trigger. They stop here so
// picking an item never also picks the wallet under it.
const contained = {
	onClick: (e: ReactMouseEvent) => e.stopPropagation(),
	onPointerDown: (e: ReactPointerEvent) => e.stopPropagation(),
};

// Rename waits for the menu to close before the field replaces the name. While
// the menu is open its focus trap pulls focus back inside, so a field mounted
// from onSelect never keeps it. Once the menu has unmounted the field mounts and
// focuses itself, and the closing menu must not hand focus back to its trigger.
// Every other item leaves focus alone.
function useRenameHandoff(onRename: () => void) {
	const pending = useRef(false);
	return {
		onRename: () => {
			pending.current = true;
		},
		onCloseAutoFocus: (e: Event) => {
			if (!pending.current) return;
			pending.current = false;
			e.preventDefault();
			onRename();
		},
	};
}

// The ⋯ button that rides on the LifeHash, opening the menu beside the mark.
export function WalletMenu({ wallet, onRename, ...actions }: WalletMenuActions) {
	const handoff = useRenameHandoff(onRename);
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button
					type="button"
					aria-label={`${wallet.label} actions`}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
					className="wallet-avatar-btn"
				>
					<IconDots className="size-4" />
				</button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="start"
					side="right"
					sideOffset={10}
					className="wallet-menu z-[70]"
					data-wallet-menu
					onCloseAutoFocus={handoff.onCloseAutoFocus}
					{...contained}
				>
					<WalletMenuItems
						Item={DropdownMenu.Item}
						Separator={DropdownMenu.Separator}
						wallet={wallet}
						onRename={handoff.onRename}
						{...actions}
					/>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

// The same items on right-click. `children` becomes the trigger.
export function WalletContextMenu({
	children,
	wallet,
	onRename,
	...actions
}: WalletMenuActions & { children: ReactNode }) {
	const handoff = useRenameHandoff(onRename);
	return (
		<ContextMenu.Root>
			<ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
			<ContextMenu.Portal>
				<ContextMenu.Content
					className="wallet-menu z-[70]"
					data-wallet-menu
					onCloseAutoFocus={handoff.onCloseAutoFocus}
					{...contained}
				>
					<WalletMenuItems
						Item={ContextMenu.Item}
						Separator={ContextMenu.Separator}
						wallet={wallet}
						onRename={handoff.onRename}
						{...actions}
					/>
				</ContextMenu.Content>
			</ContextMenu.Portal>
		</ContextMenu.Root>
	);
}
