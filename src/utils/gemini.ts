import { GoogleGenAI } from '@google/genai';
import type { ColumnMetadata } from './dataEngine';

export interface ChartSpecification {
  chartType: 'bar' | 'horizontalBar' | 'line' | 'pie' | 'scatter' | 'bubble' | 'radar' | 'box' | 'stackedBar' | 'percentStackedBar' | 'area';
  title: string;
  xAxisColumn: string;
  yAxisColumn: string;
  aggregation: 'sum' | 'avg' | 'count' | 'none';
  zAxisColumn?: string;
  stackByColumn?: string;
  excludedCategories?: string[];
}

export interface AnalystResponse {
  thinking: string;
  conversationalResponse: string;
  insights: string[];
  charts: ChartSpecification[];
  followUpQuestions: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  analystResponse?: AnalystResponse; // Parsed structured output (only for 'model' messages)
  isError?: boolean;
}

/**
 * Builds a prompt describing the sheet's columns, stats, and sample rows.
 */
function buildDatasetContextPrompt(
  sheetName: string,
  columns: ColumnMetadata[],
  rowCount: number,
  sampleRows: any[],
  isYoy?: boolean,
  yoyBaseName?: string,
  yoyCompareName?: string,
  yoyBaseLabel?: string,
  yoyCompareLabel?: string
): string {
  const columnSummaries = columns
    .map(col => {
      let stats = `Type: ${col.type}, Nulls: ${col.nullCount}, Uniques: ${col.uniqueCount}`;
      if (col.type === 'number') {
        stats += `, Min: ${col.min ?? 'N/A'}, Max: ${col.max ?? 'N/A'}, Avg: ${col.avg ?? 'N/A'}`;
      } else if (col.type === 'date') {
        stats += `, Range: ${col.min ?? 'N/A'} to ${col.max ?? 'N/A'}`;
      }
      return `- **${col.name}**: ${stats}`;
    })
    .join('\n');

  const sampleRowsJson = JSON.stringify(sampleRows.slice(0, 5), null, 2);

  let yoySection = '';
  if (isYoy) {
    yoySection = `
### Year-over-Year (YoY) Context
- This is a comparative analysis comparing two datasets.
- **Base Dataset**: ${yoyBaseName || 'Older File'} (represented in the rows by the YoY_Year value "${yoyBaseLabel || 'Base'}")
- **Comparison Dataset**: ${yoyCompareName || 'Newer File'} (represented in the rows by the YoY_Year value "${yoyCompareLabel || 'Compare'}")
- **Analytic Instructions**: The virtual column \`YoY_Year\` splits the rows. Leverage this column to highlight changes, percentage increases/decreases, and growth trends from "${yoyBaseLabel || 'Base'}" to "${yoyCompareLabel || 'Compare'}".
`;
  }

  return `
You are analyzing the Excel worksheet named: "${sheetName}".
${yoySection}
### Dataset Overview
- **Total Rows**: ${rowCount}
- **Columns & Statistics**:
${columnSummaries}

### First 5 Sample Rows
\`\`\`json
${sampleRowsJson}
\`\`\`

Analyze the dataset above and answer the user's question. Generate insights and decide if a visualization helps explain the trends.
`;
}

/**
 * Sends a message to Gemini 3.5 Flash requesting a structured data analysis response.
 */
export async function queryGeminiAnalyst(
  apiKey: string,
  sheetName: string,
  columns: ColumnMetadata[],
  rowCount: number,
  sampleRows: any[],
  history: ChatMessage[],
  userQuery: string,
  isYoy?: boolean,
  yoyBaseName?: string,
  yoyCompareName?: string,
  yoyBaseLabel?: string,
  yoyCompareLabel?: string
): Promise<AnalystResponse> {
  if (!apiKey) {
    throw new Error('API Key is required to call the Gemini API.');
  }

  // Initialize the new Google Gen AI SDK
  const ai = new GoogleGenAI({ apiKey });

  const datasetContext = buildDatasetContextPrompt(
    sheetName, 
    columns, 
    rowCount, 
    sampleRows,
    isYoy,
    yoyBaseName,
    yoyCompareName,
    yoyBaseLabel,
    yoyCompareLabel
  );
  
  // Set up the system instructions directing the agent persona and rules
  let systemInstruction = `
You are "Antigravity Data Analyst", an elite senior business intelligence analyst and data scientist.
Your role is to deeply analyze tabular datasets, draw out unexpected, crucial insights, and recommend the best interactive visualizations to explain findings.

Rules:
1. Always analyze the schema and summary statistics provided.
2. In the "thinking" field, perform your internal step-by-step reasoning:
   - Identify the user's intent.
   - Look at relevant column statistics, cardinality, and nulls.
   - Choose which fields should be plotted.
   - Outline the mathematical relationship (e.g., aggregation type: sum/avg/count).
   - Summarize findings before writing the insights.
3. In the "conversationalResponse" field, write a clear, friendly, and conversational reply directly to the user (2-4 sentences). 
   - Talk back to the user like a human colleague.
   - If the user asked to add a chart, confirm that you have added the visualization to the dashboard.
   - Example: "I have added a Bar Chart for FTE counts by Job Title to your dashboard. This comparison reveals that Paramedics constitute the highest FTE count."
4. In "insights", write 2 to 4 bullet points. Keep insights extremely punchy, analytical, and backed by specific data points. Use Markdown formatting.
5. In "charts", you MUST recommend exactly 10 distinct, clean, and highly relevant visualizations to build a comprehensive dashboard when performing audits or when requested to auto-generate/decide. If not performing an audit or requested to auto-generate, recommend 2-3 charts. Ensure the 10 charts showcase a wide range of chartType values (bar, horizontalBar, line, pie, scatter, bubble, radar, box, stackedBar, percentStackedBar, area) and different combinations of numeric and categorical columns. Only select columns that actually exist in the schema.
   - xAxisColumn: typically a categorical, text, or date column.
   - yAxisColumn: MUST be a numeric column (unless aggregation is 'count', where it can count rows).
   - aggregation: 'sum', 'avg', or 'count'. If plotting raw points (e.g. scatter/bubble/box), use 'none'.
   - chartType can be 'bar', 'horizontalBar', 'line', 'pie', 'scatter', 'bubble', 'radar', 'box', 'stackedBar', 'percentStackedBar', or 'area'.
   - If using 'stackedBar', 'percentStackedBar', or 'area', you can optionally specify 'stackByColumn' to segment/split the data by a secondary categorical column.
6. In "followUpQuestions", write 2-3 interactive, action-oriented command statements written from the user's perspective. When the user clicks them, they act as direct commands/requests to you (e.g., "Analyze the correlation between X and Y"). Do NOT phrase these as questions, and do NOT use first-person pronouns like "I" or "we". Phrase them as actions the user is commanding you to take.
   - Example: "Analyze the correlation between Regular Hours and Salary"
   - Example: "Compare average dispatch times across Call Sources using a Radar Chart"
`;

  if (isYoy) {
    systemInstruction += `
ADDITIONAL YEAR-OVER-YEAR (YoY) ANALYSIS RULES:
1. You are performing a Year-over-Year (YoY) comparative analysis. Your primary goal is to compare the base period "${yoyBaseLabel || 'Base'}" and comparison period "${yoyCompareLabel || 'Compare'}".
2. In the "thinking" field, focus specifically on calculating and identifying the differences, growth/decline rates, and variance between the base and comparison periods.
3. In "insights", every insight MUST focus on comparing the two periods and highlighting key changes (e.g., changes in revenue, run volume, FTE counts, hourly rates, response times) from "${yoyBaseLabel || 'Base'}" to "${yoyCompareLabel || 'Compare'}".
4. When recommending charts in "charts", you MUST prioritize comparative visualizations (like side-by-side bar, horizontalBar, stackedBar, percentStackedBar, area, or line charts) and set "stackByColumn" to "YoY_Year" to ensure the data is split/grouped by year.
5. In "followUpQuestions", write command statements that guide the user to explore year-over-year variations (e.g., "Examine the YoY change in regular pay for EMTs", "Plot YoY run volume by station").
`;
  }

  // Format chat history for the SDK
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [
      {
        text: msg.role === 'user' 
          ? msg.content 
          : `[Thinking]: ${msg.analystResponse?.thinking}\n[Conversational Response]: ${msg.analystResponse?.conversationalResponse}\n[Insights]:\n${msg.analystResponse?.insights.map(i => `- ${i}`).join('\n')}`
      }
    ]
  }));

  // Append current user context and question
  contents.push({
    role: 'user',
    parts: [
      {
        text: `${datasetContext}\n\nUser Question: "${userQuery}"`
      }
    ]
  });

  // Call the Gemini API with structured JSON output configurations
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: contents,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT' as any,
        properties: {
          thinking: { 
            type: 'STRING' as any, 
            description: 'Step-by-step analytical reasoning before writing insights and charts.' 
          },
          conversationalResponse: {
            type: 'STRING' as any,
            description: 'A direct, friendly conversational response addressing the user (1-3 sentences), explaining what you did (e.g. confirming added charts).'
          },
          insights: {
            type: 'ARRAY' as any,
            items: { type: 'STRING' as any },
            description: 'Punchy, markdown-styled data insights.'
          },
          charts: {
            type: 'ARRAY' as any,
            description: 'Visualizations that help depict the insights.',
            items: {
              type: 'OBJECT' as any,
              properties: {
                chartType: { 
                   type: 'STRING' as any, 
                   enum: ['bar', 'horizontalBar', 'line', 'pie', 'scatter', 'bubble', 'radar', 'box', 'stackedBar', 'percentStackedBar', 'area'] 
                },
                title: { type: 'STRING' as any },
                xAxisColumn: { type: 'STRING' as any, description: 'Column name for categories/X-axis.' },
                yAxisColumn: { type: 'STRING' as any, description: 'Numeric column name for values/Y-axis.' },
                aggregation: { 
                  type: 'STRING' as any, 
                  enum: ['sum', 'avg', 'count', 'none'],
                  description: 'How to roll up the values: sum, avg, count, or none.' 
                },
                zAxisColumn: { type: 'STRING' as any, description: 'Optional third numeric column name specifically for Bubble chart dot sizes.' },
                stackByColumn: { type: 'STRING' as any, description: 'Optional secondary categorical column name to segment/stack the data by (specifically for bar, horizontalBar, stackedBar, percentStackedBar, line, and area charts).' }
              },
              required: ['chartType', 'title', 'xAxisColumn', 'yAxisColumn', 'aggregation']
            }
          },
          followUpQuestions: {
            type: 'ARRAY' as any,
            items: { type: 'STRING' as any },
            description: 'Action-oriented command statements written from the user\'s perspective to guide further analysis (e.g. "Analyze the relationship between X and Y").'
          }
        },
        required: ['thinking', 'conversationalResponse', 'insights', 'charts', 'followUpQuestions']
      }
    }
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error('Gemini returned an empty response.');
  }

  try {
    const parsed: AnalystResponse = JSON.parse(responseText);
    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini response as JSON. Raw text:', responseText);
    throw new Error('Failed to parse analyst insights. The model response was not in the expected JSON format.');
  }
}

/**
 * Modifies an existing ChartSpecification based on natural language instructions.
 */
export async function editChartSpecification(
  apiKey: string,
  currentSpec: ChartSpecification,
  instruction: string,
  columns: ColumnMetadata[]
): Promise<ChartSpecification> {
  if (!apiKey) {
    throw new Error('API Key is required to call the Gemini API.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const columnsList = columns
    .map(col => `- ${col.name} (type: ${col.type})`)
    .join('\n');

  const prompt = `
You are a senior data visualization assistant.
Your task is to modify an existing ChartSpecification based on the user's natural language instruction and the available columns in the dataset.

Available Columns:
${columnsList}

Current Chart Specification:
${JSON.stringify(currentSpec, null, 2)}

User Instruction:
"${instruction}"

Output a valid, updated ChartSpecification matching the schema below. Ensure all column names exist in the available columns.

Rules for category exclusions ("excludedCategories"):
1. The "excludedCategories" array stores the exact string labels (case-insensitive) of categories to exclude from the chart (e.g., specific X-axis column values like "Other", "Pinellas County Fire Rescue").
2. Accumulate/Merge: When the user asks to remove, exclude, or hide a category, you MUST keep all currently excluded categories that are already in the Current Spec's "excludedCategories" array, and add the new category/categories to that array. Do not discard existing exclusions unless the user specifically asks to restore or add them back.
3. Remove/Restore: When the user asks to add back, restore, show, or include a category that is currently listed in "excludedCategories", you must remove it from the "excludedCategories" array.
4. If the user asks to "restore all", "show all", "add back all", or "clear exclusions", empty the "excludedCategories" array (or set it to []).
5. If the instruction is unrelated to categories (e.g., changing the chart type or changing axes), preserve the entire "excludedCategories" array exactly as it is in the Current Spec.

Few-Shot Examples of Exclusions Handling:

- Case A (Add to exclusions):
  Current Spec: {"chartType": "bar", "excludedCategories": ["Other"]}
  User Instruction: "remove the 'Pinellas County' bar"
  Expected Output "excludedCategories": ["Other", "Pinellas County"]

- Case B (Restore an exclusion):
  Current Spec: {"chartType": "bar", "excludedCategories": ["Other", "Pinellas County"]}
  User Instruction: "add back Other category"
  Expected Output "excludedCategories": ["Pinellas County"]

- Case C (Preserve exclusions when editing other properties):
  Current Spec: {"chartType": "bar", "excludedCategories": ["Other", "Pinellas County"]}
  User Instruction: "change to a line chart"
  Expected Output: {"chartType": "line", "excludedCategories": ["Other", "Pinellas County"]}

- Case D (Multiple exclusions):
  Current Spec: {"chartType": "bar"}
  User Instruction: "exclude Pinellas and Hillsborough"
  Expected Output "excludedCategories": ["Pinellas", "Hillsborough"]
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT' as any,
        properties: {
          chartType: { 
             type: 'STRING' as any, 
             enum: ['bar', 'horizontalBar', 'line', 'pie', 'scatter', 'bubble', 'radar', 'box', 'stackedBar', 'percentStackedBar', 'area'] 
          },
          title: { type: 'STRING' as any },
          xAxisColumn: { type: 'STRING' as any, description: 'Column name for categories/X-axis.' },
          yAxisColumn: { type: 'STRING' as any, description: 'Numeric column name for values/Y-axis.' },
          aggregation: { 
            type: 'STRING' as any, 
            enum: ['sum', 'avg', 'count', 'none']
          },
          zAxisColumn: { type: 'STRING' as any, description: 'Optional third numeric column name specifically for Bubble chart dot sizes.' },
          stackByColumn: { type: 'STRING' as any, description: 'Optional secondary categorical column name to segment/stack the data.' },
          excludedCategories: { 
            type: 'ARRAY' as any, 
            items: { type: 'STRING' as any },
            description: 'Optional list of specific category or X-axis label values to exclude/remove from the visualization (case-insensitive).'
          }
        },
        required: ['chartType', 'title', 'xAxisColumn', 'yAxisColumn', 'aggregation']
      }
    }
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error('Gemini returned an empty response.');
  }

  try {
    const parsed: ChartSpecification = JSON.parse(responseText);

    // Client-side fail-safe: Reconcile excludedCategories to prevent Gemini from dropping exclusions during multi-turn edits
    if (currentSpec.excludedCategories && currentSpec.excludedCategories.length > 0) {
      const instructionLower = instruction.toLowerCase().trim();
      
      const isResetAll = 
        instructionLower.includes('all') || 
        instructionLower.includes('everything') || 
        instructionLower.includes('clear') || 
        instructionLower.includes('reset') ||
        instructionLower.includes('restore all') ||
        instructionLower.includes('show all') ||
        instructionLower.includes('add back all');

      if (isResetAll) {
        parsed.excludedCategories = [];
      } else {
        const nextExclusions = new Set<string>(parsed.excludedCategories || []);
        
        // Helper to check if a category is mentioned in the user instruction
        const isCategoryMentioned = (cat: string, inst: string): boolean => {
          const catLower = cat.toLowerCase().trim();
          const instLower = inst.toLowerCase().trim();
          
          if (instLower.includes(catLower) || catLower.includes(instLower)) {
            return true;
          }
          
          const stopWords = new Set([
            'add', 'back', 'remove', 'exclude', 'show', 'hide', 'restore', 'include', 'delete',
            'the', 'category', 'bar', 'column', 'row', 'chart', 'visual', 'visualization',
            'please', 'can', 'you', 'and', 'from', 'this', 'that', 'with'
          ]);
          
          const catWords = catLower.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !stopWords.has(w));
          const instWords = instLower.split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !stopWords.has(w));
          
          for (const w of instWords) {
            if (catWords.includes(w) || catLower.includes(w)) {
              return true;
            }
          }
          
          return false;
        };

        for (const cat of currentSpec.excludedCategories) {
          // If the user did not explicitly mention the category in their instruction,
          // they didn't ask to modify its status, so we should preserve it.
          if (!isCategoryMentioned(cat, instruction)) {
            nextExclusions.add(cat);
          }
        }
        
        parsed.excludedCategories = Array.from(nextExclusions);
      }
    }

    return parsed;
  } catch (err) {
    console.error('Failed to parse Gemini editChartSpecification response as JSON. Raw text:', responseText);
    throw new Error('Failed to parse refined chart configuration. The model response was not in the expected format.');
  }
}

