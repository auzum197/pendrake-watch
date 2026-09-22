import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { addYears, isAfter, isBefore, isSameMonth, startOfMonth } from "date-fns";
import { Animation } from "react-day-picker";
import {
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button/button";
import { Calendar } from "@/components/ui/calendar/calendar";
import "./birthday-calendar.css";

// Zcash mainnet launched in October 2016, so no real Wallet predates it, and a
// birthday can't fall in the future. Both bounds are clamped in every view.
const MIN_MONTH = new Date(2016, 9, 1);

type View = "day" | "month" | "year";

// Drilling between views zooms (out to a coarser grid, in to a finer one); paging
// within a view slides toward the direction of travel. Month-to-month nav is left
// to react-day-picker's own slide (see NAV). Reduced motion keeps the fade only.
const VIEW = {
	out: "animate-in fade-in zoom-in-95 motion-reduce:zoom-in-100 duration-200 ease-out-soft",
	in: "animate-in fade-in zoom-in-105 motion-reduce:zoom-in-100 duration-200 ease-out-soft",
	next: "animate-in fade-in slide-in-from-right-6 motion-reduce:slide-in-from-right-0 duration-200 ease-out-soft",
	prev: "animate-in fade-in slide-in-from-left-6 motion-reduce:slide-in-from-left-0 duration-200 ease-out-soft",
};

// react-day-picker keeps the outgoing and incoming month mounted together during a
// change and tags each with one of these classes via classList, tearing the old one
// down on the caption's animationend (so the caption animates too). Each must be a
// single token, hence the dedicated CSS rather than stacked Tailwind utilities.
const NAV = {
	[Animation.weeks_after_enter]: "birthday-cal-after-enter",
	[Animation.caption_after_enter]: "birthday-cal-after-enter",
	[Animation.weeks_before_exit]: "birthday-cal-before-exit",
	[Animation.caption_before_exit]: "birthday-cal-before-exit",
	[Animation.weeks_before_enter]: "birthday-cal-before-enter",
	[Animation.caption_before_enter]: "birthday-cal-before-enter",
	[Animation.weeks_after_exit]: "birthday-cal-after-exit",
	[Animation.caption_after_exit]: "birthday-cal-after-exit",
};

export function BirthdayCalendar({
	selected,
	onSelect,
}: {
	selected?: Date;
	onSelect: (date: Date) => void;
}) {
	const [view, setView] = useState<View>("day");
	const [cursor, setCursor] = useState(() => startOfMonth(selected ?? new Date()));
	const [anim, setAnim] = useState("");
	const contentRef = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState<number>();

	const maxMonth = startOfMonth(new Date());
	const maxYear = maxMonth.getFullYear();
	const minYear = MIN_MONTH.getFullYear();
	const year = cursor.getFullYear();
	const pageStart = year - (((year % 12) + 12) % 12);

	const pageYears = (delta: number) => {
		setAnim(delta > 0 ? VIEW.next : VIEW.prev);
		setCursor(addYears(cursor, delta));
	};

	// The body replays its enter animation whenever its key changes. The day view
	// keeps a stable key so month nav stays with rdp's own slide rather than
	// remounting; month and year views key on the range they show, so paging
	// replays the directional slide.
	const bodyKey =
		view === "day" ? "day" : view === "month" ? `m${year}` : `y${pageStart}`;

	// Track the active view's height so the container eases between sizes instead of
	// snapping. The first measure runs from an auto height, which doesn't transition,
	// so the calendar opens at the right size; later view changes animate.
	useLayoutEffect(() => {
		if (contentRef.current) setHeight(contentRef.current.offsetHeight);
	}, [bodyKey]);

	return (
		<div className="w-[15.5rem]">
			<div
				className="overflow-hidden transition-[height] duration-200 ease-out-soft motion-reduce:transition-none"
				style={{ height }}
			>
				<div key={bodyKey} ref={contentRef} className={cn("p-3", anim)}>
					{view === "day" && (
					<Calendar
						mode="single"
						animate
						fixedWeeks
						showOutsideDays
						month={cursor}
						onMonthChange={setCursor}
						selected={selected}
						onSelect={(date) => date && onSelect(date)}
						startMonth={MIN_MONTH}
						endMonth={maxMonth}
						disabled={{ before: MIN_MONTH, after: new Date() }}
						className="p-0"
						classNames={NAV}
						components={{
							// Split the caption into a month and a year control so both open
							// their grid in one click. Built off calendarMonth.date (not a
							// closure) so the label stays right for each month mid-slide, and
							// spreads divProps to keep data-animated-caption for the animation.
							MonthCaption: ({
								calendarMonth,
								displayIndex: _displayIndex,
								children: _children,
								...divProps
							}) => (
								<div {...divProps}>
									{/* rdp's nav is a full-width absolute overlay on top of the
									    caption; lift the controls above it (it sets z-index 1 mid
									    -animation) so the clicks land. Centered and narrow, they
									    stay clear of the edge arrows. */}
									<span className="relative z-10 flex items-center gap-1">
										<CaptionButton
											onClick={() => {
												setAnim(VIEW.out);
												setView("month");
											}}
										>
											{calendarMonth.date.toLocaleString(undefined, {
												month: "long",
											})}
										</CaptionButton>
										<CaptionButton
											onClick={() => {
												setAnim(VIEW.out);
												setView("year");
											}}
										>
											{calendarMonth.date.getFullYear()}
										</CaptionButton>
									</span>
								</div>
							),
						}}
					/>
				)}

				{view === "month" && (
					<div className="flex flex-col gap-2">
						<NavHeader
							label={String(year)}
							chevron
							onLabel={() => {
								setAnim(VIEW.out);
								setView("year");
							}}
							onPrev={() => pageYears(-1)}
							onNext={() => pageYears(1)}
							prevDisabled={year - 1 < minYear}
							nextDisabled={year + 1 > maxYear}
						/>
						<div className="grid min-h-[13.5rem] grid-cols-3 gap-2 [grid-auto-rows:1fr]">
							{Array.from({ length: 12 }, (_, i) => {
								const cell = new Date(year, i, 1);
								return (
									<GridButton
										key={i}
										selected={!!selected && isSameMonth(cell, selected)}
										current={isSameMonth(cell, maxMonth)}
										disabled={
											isBefore(cell, startOfMonth(MIN_MONTH)) ||
											isAfter(cell, maxMonth)
										}
										onClick={() => {
											setAnim(VIEW.in);
											setCursor(cell);
											setView("day");
										}}
									>
										{cell.toLocaleString(undefined, { month: "short" })}
									</GridButton>
								);
							})}
						</div>
					</div>
				)}

				{view === "year" && (
					<div className="flex flex-col gap-2">
						<NavHeader
							label={`${pageStart} – ${pageStart + 11}`}
							onLabel={() => {
								setAnim(VIEW.in);
								setView("month");
							}}
							onPrev={() => pageYears(-12)}
							onNext={() => pageYears(12)}
							prevDisabled={pageStart - 1 < minYear}
							nextDisabled={pageStart + 12 > maxYear}
						/>
						<div className="grid min-h-[13.5rem] grid-cols-3 gap-2 [grid-auto-rows:1fr]">
							{Array.from({ length: 12 }, (_, i) => {
								const cellYear = pageStart + i;
								return (
									<GridButton
										key={cellYear}
										selected={!!selected && selected.getFullYear() === cellYear}
										current={cellYear === maxYear}
										disabled={cellYear < minYear || cellYear > maxYear}
										onClick={() => {
											setAnim(VIEW.in);
											setCursor(new Date(cellYear, cursor.getMonth(), 1));
											setView("month");
										}}
									>
										{cellYear}
									</GridButton>
								);
							})}
						</div>
					</div>
				)}
				</div>
			</div>
		</div>
	);
}

function NavHeader({
	label,
	onLabel,
	onPrev,
	onNext,
	prevDisabled,
	nextDisabled,
	chevron = false,
}: {
	label: string;
	onLabel: () => void;
	onPrev: () => void;
	onNext: () => void;
	prevDisabled: boolean;
	nextDisabled: boolean;
	chevron?: boolean;
}) {
	return (
		<div className="flex items-center justify-between">
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={onPrev}
				disabled={prevDisabled}
				aria-label="Previous"
			>
				<IconChevronLeft className="size-4" />
			</Button>
			<CaptionButton onClick={onLabel} chevron={chevron}>
				{label}
			</CaptionButton>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={onNext}
				disabled={nextDisabled}
				aria-label="Next"
			>
				<IconChevronRight className="size-4" />
			</Button>
		</div>
	);
}

// A label that reads as a control: the chevron signals it opens a selection grid.
function CaptionButton({
	onClick,
	children,
	chevron = true,
}: {
	onClick: () => void;
	children: ReactNode;
	chevron?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-0.5 rounded-md px-2 py-1 text-sm font-medium tabular-nums hover:bg-muted"
		>
			{children}
			{chevron && (
				<IconChevronDown className="size-3.5 text-muted-foreground" />
			)}
		</button>
	);
}

function GridButton({
	selected,
	current,
	disabled,
	onClick,
	children,
}: {
	selected: boolean;
	current: boolean;
	disabled: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"h-full w-full rounded-md font-normal tabular-nums",
				current && !selected && "bg-muted text-foreground",
				selected &&
					"bg-brand text-brand-foreground hover:bg-brand hover:text-brand-foreground",
			)}
		>
			{children}
		</Button>
	);
}
