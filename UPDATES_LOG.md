# ASCR AI Data Analyst - Project Updates Log

This log chronicles the day-by-day development, feature additions, user requests, and visual refinement updates completed for the **ASCR AI Data Analyst** application.

---

## 📅 May 28, 2026: Workspace Foundations & Scaling
* **3-Panel Interface layout**: Formed the core workspace layout containing collapsible sidebar panels (Left Controls and Right AI Analyst Chat Panel) wrapping a center dashboard canvas.
* **Viewport Scaling & Layout adjustments**: Reconfigured CSS layouts to fix screen cutoff issues, enabling clean scroll heights for the tabular spreadsheet grid.
* **Client PDF Export**: Designed landscape PDF export parameters to cleanly output metrics sheets.
* **Interactive Tooltips**: Added hover tooltip components across all charts to highlight underlying mathematical definitions and values.

---

## 📅 May 29, 2026: Visual Redesign & Core Workspace Navigation
* **Sleek Uploader Landing Screen**: Removed vertical header banners to free up real estate. Redesigned the uploader container to expand horizontally with drag-and-drop file imports.
* **Multi-Tab Workspace Navigation**: Segmented the central canvas into three dedicated, full-width views:
  1. **Executive Dashboard**: Key metrics cards and visualization grids.
  2. **Spreadsheet Data**: High-density tabular data explorer.
  3. **Methodology & Calculations**: Explanations of cost structures and algorithms.
* **Advanced Chart Suite**:
  * **Custom SVG Box & Whisker Plots**: Built a custom renderer calculating quartiles (Q1, Q3, Median), whiskers, and rose-colored outlier points.
  * **Horizontal Bar Charts**: Configured Recharts for horizontal layouts with rounded bar corners.
  * **Radar polar plots** and **Scatter Bubble charts** for multi-variable correlation mapping.
* **Dashboard Controls & Live Filters**: Relocated metadata summaries away from sidebars. Implemented real-time category filters (pills/dropdowns) updating metric calculations reactively.
* **Analyst Copilot conversational UX**: Updated Gemini schemas to return conversational replies instead of raw bullet points. Restructured suggestions into proactive analyst questions.
* **Palette Theme Switcher**: Added a setting to toggle between **Classic PCG Blue** (unified corporate gradients) and **Vibrant Domain** (color-coded cards by category).

---

## 📅 June 3, 2026: Schema Mapping & Data Curations
* **Business-Friendly Data Preview & Schema Mapper**: Created an upload staging screen. Replaced technical database jargon with plain business terms (e.g. "Interpret As", "Column Settings", "Calculation Type").
* **AI-Guided Schema Curation (Let AI Decide)**: Integrated a "Tailor Visualization Presets" objective input and an "Auto-Generate" skip button using Gemini to cast schemas and build layouts.
* **Dynamic X-Axis Label Slanting**: Configured Recharts axes to auto-slant labels at `-35` degrees with padded bottom margins when dealing with long category text.
* **Dynamic Formula Previews**: Connected math equations in the calculations tab to update variables and benchmarks in real-time based on active datasets and filters.
* **PDF Print Harmony**: Resolved Recharts printing issues by bypassing responsive wrappers with static dimensions for print media, fitting dashboards on exactly one landscape page.
* **JSON Profile Portability**: Enabled exporting and importing the entire dashboard configuration state (active filters, layout modes, selected charts, titles) to and from a `.json` configuration file.

---

## 📅 June 10, 2026 (Today): Immersive Easing & Mock Data Restructuring
* **Dynamic Zoom-In Origin Point**: Refined the Expand button to track midpoint client coordinates and dynamically compute offsets. The expanded pop-up now scales out directly from the clicked button.
* **Ease-Out Deceleration**: Configured the modal scale transition to use `cubic-bezier(0.25, 1, 0.5, 1)` with a `0.48s` duration, removing spring recoil.
* **Maximized Expanded Viewport**: Maximized modal bounds to `95vw` and `92vh`, enabling percentage-based scaling (`outerRadius="72%"`) for Pie/Doughnut charts.
* **Dedicated `mock_data/` Folder**: Added a centralized repository directory for mock datasets. Generated a new 100-row `Hospital_Clinical_Performance_Metrics.csv` file modeling division-wide administrative and clinical stats.
* **Consolidated 3-Report Quick Start**: Standardized the welcome page list to exactly three clean Excel sheets, removing CAD benchmarks and CSV files.
* **Hide Button Prop Restoration**: Restored the missing `onRemove` callback prop to financial charts in the grid layout, bringing back the **Hide** button to all widgets.
* **Production Build Checks**: Verified all build bundles compile cleanly with zero TypeScript errors.
