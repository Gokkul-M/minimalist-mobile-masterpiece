# Expense category analytics chart

## What will change
- Replace the **All categories** list on the Expenses page with one line chart containing a separate series for each expense category.
- Add a compact **Categories** dropdown above the chart with checkboxes, including Select all and Clear controls.
- Keep all recorded and custom categories available; categories without spending in the selected period remain selectable.
- Add zoom-in, zoom-out, and reset controls. Wheel and trackpad zoom will stay anchored within the chart and will not scroll the page behind it.
- Keep chart points tappable/hoverable so each date displays category amounts in a tooltip.

## Behavior
- The chart follows the Expenses page's Week, Month, Year, or Custom date selection.
- Dates are grouped at a readable interval for the selected range.
- Unchecking a category hides only its line; underlying transactions are unchanged.
- The chart shows a clear empty state when there is no expense data or no category is selected.

## Technical details
- Build the chart as a focused reusable ExpenseCategoryChart component using Recharts.
- Use the existing semantic color tokens and existing dropdown/button components.
- Implement bounded, cursor-centered wheel zoom with a native non-passive wheel listener; zoom buttons use the chart center.
- Verify the Expenses page at mobile and desktop sizes, including category filtering and zoom controls.
