# ASCR AI Data Analyst - Executive Reporting Platform

An advanced, executive-ready analytical tool designed to ingest tabular worksheets (such as Excel spreadsheets and CSV files) to instantly generate visual charts and professional summaries. It enables users to converse directly with their data in real time, extract key operational metrics, and export polished, multi-page executive reports on the fly.

---

## Technical Stack & Architecture

- **Interactive User Interface**: Built using React and TypeScript for a fluid, responsive browser experience, powered by Vite for rapid assembly and instant page load times.
- **Data Visualization Engine**: Utilizes Recharts and custom responsive SVG renderers to turn raw spreadsheets into high-impact visuals (such as trend lines, category bars, salary boxes, and multi-axis radars).
- **Tailored Workspace Layout**: A premium CSS system styled with collapsible panel drawers, glassmorphic accents, and color-coordinated indicators to streamline review and executive presentations.
- **GenAI Copilot Integration**: Connected directly to the Google Gemini developer API to analyze tables, explain anomalies, suggest business queries, and automatically curate chart recommendations.

### Gemini Developer API Access
The application communicates directly from the client browser with the Google Gemini developer API endpoints:
- **SDK Integration**: Utilizes the official `@google/genai` developer SDK.
- **Secure Authentication**: Authenticates using a user-supplied or environment-configured developer API Key (`new GoogleGenAI({ apiKey })`).
- **Structured Context Passing**: Sends the active dataset schema, column statistics, and chat history with each user query.
- **JSON Schema Enforcement**: Leverages structured JSON output (`application/json`) config, strictly enforcing a schema that returns internal reasoning (`thinking`), conversational responses, markdown insights, and chart specification parameters.

---

## Core Features

1. **Dedicated 3-Panel Workspace**:
   - **Left Control Panel**: Swaps sheets, curates dataset filters, toggles chart displays, and configures new custom charts.
   - **Center Canvas**: Houses the main workspace tabs (Executive Dashboard, tabular Spreadsheet Data Grid, and the dynamic Methodology Calculations log).
   - **Right Copilot Drawer**: An interactive chatbot panel that answers natural language prompts, suggests business questions, and auto-generates charts.
2. **True WYSIWYG PDF Report Builder**:
   - Dynamic page break layouts allowing each visualization to render on its own dedicated print page.
   - Live orientation switching (Portrait / Landscape) with dynamic `@page` CSS configuration injection.
   - Portrait margins automatically scale to `0.4in` and chart heights expand to `520px` to maximize the vertical printing real estate.
   - Landscape layouts format charts at `280px` height to keep graphics and AI summary cards perfectly aligned on a single sheet.
3. **Calculation Methodology Slide**:
   - Stacks relevant math equations, variables, and parameters (PEMT supplemental funding, FTE equivalents, CAD timing benchmarks) vertically.
   - Automatically references active filtered rows and warns with fallback badges when data is unmapped.
4. **Natural Language Chart Editing & Element Exclusions**:
   - Refine any chart dynamically by clicking the **Edit** button on its header and describing changes in natural language (e.g. *"change to a line chart"*, *"group by Job Title"*).
   - Exclude specific categories, legend items, or synthetic groupings (such as `"Other"`) directly using commands like *"remove Tampa"* or *"exclude Other"*.
   - Exclusions use case-insensitive substring and word-level matching, and apply reactively across all visual components (including Scatter plots, Bubble charts, Bar/Line/Area/Radar charts, and Box & Whisker plots).

---

## Security & Data Privacy

Data security and privacy are fundamental pillars of the ASCR AI Analyst platform. The application is built to safeguard sensitive information through the following measures:

### 1. Google Gemini Paid Tier Protection
The AI copilot operates under the **paid service tier** of the Google Gemini API. 
- **No Data Training**: Under the paid tier, Google does **not** store or use your uploaded prompts, data queries, or generated insights to train its foundation models.
- **Enterprise-Grade Confidentiality**: All interactions with the Gemini service are encrypted, private, and isolated to our active workspace session, guaranteeing that agency records remain entirely confidential.

### 2. Synthesized Dummy Data Compliance
To test capabilities and run analyses without risking actual proprietary data exposure, the system runs entirely on simulated operational data:
- **Cost Report Realism**: Demo datasets model standard cost reports, payroll audits, and dispatch logs (incorporating seasonal trends, FTE hours, direct cost variances, and scene/transit delay intervals).
- **Randomized Generation**: Mock datasets (such as clinical staff-to-patient ratios or overtime payroll logs) are synthesized off-the-fly and populated with completely random numbers.
- **Zero Real-World PII**: The files contain no real-world patient identifiers, actual payroll accounts, or protected health/business information, eliminating compliance risks.

---

## Getting Started

### 1. Installation
Install project dependencies locally:
```bash
npm install
```

### 2. Local Development Server
Start the local Vite development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
Build and minify the application for production deployment:
```bash
npm run build
```
The compiled HTML, CSS, and JS assets will be written to the `/dist` folder.
