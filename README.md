# ASCR AI Data Analyst - Executive Reporting Platform

An advanced, executive-ready analytical workspace designed to help public agency stakeholders and personnel managers ingest operational worksheets, collaborate with a conversational AI copilot, and export beautifully scaled multi-page PDF reports.

---

## Technical Stack & Architecture

- **Frontend Core**: React 18, TypeScript, Vite (High HMR development experience)
- **Data Visualizations**: Recharts (Line, Bar, Horizontal Bar, Pie, Radar, Scatter, Bubble Charts) supplemented by a custom-engineered responsive SVG Box & Whisker plot renderer for quartile variance analysis.
- **Design System & Theme**: Custom CSS stylesheet featuring glassmorphic drawers, micro-animations, fade-ins, and dynamic visual color thematic bindings (financial green, salary purple, time benchmarks teal, and distributions amber).
- **AI Engine**: Google Gemini API integration using structured JSON schemas and guide-driven conversational heuristics.

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
