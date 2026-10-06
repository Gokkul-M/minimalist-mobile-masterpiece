# Time-aware expense analytics

## What will change
- Make chart zoom use clear time levels: Hour, Day, Week, Month, and Year.
- Zooming out will move from days to weeks, months, then years; zooming in reverses that flow down to hours.
- Aggregate every selected category into the active time bucket, using each entry’s saved date and optional time.
- Show the current time level and visible period beside the controls, with unavailable zoom actions disabled.
- Refine the graph with thinner category lines, lighter grid lines, improved point emphasis, compact labels, and a cleaner interactive tooltip.
- Keep the existing hidden category checklist and ensure the layout remains usable on small phones.

## Technical details
- Replace index-range zooming with a five-level time-granularity model.
- Build continuous time buckets so dates without spending remain visible as zero values.
- Preserve cursor-wheel zoom and map its direction to the same granularity steps as the buttons.
- Verify category selection, every zoom level, mobile sizing, and the preview error logs.
