import { GoogleGenAI } from '@google/genai';
import type { ColumnMetadata } from './dataEngine';

export interface ChartSpecification {
  chartType: 'bar' | 'line' | 'pie' | 'scatter';
  title: string;
  xAxisColumn: string;
  yAxisColumn: string;
  aggregation: 'sum' | 'avg' | 'count' | 'none';
}

export interface AnalystResponse {
  thinking: string;
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
  sampleRows: any[]
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

  return `
You are analyzing the Excel worksheet named: "${sheetName}".

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
  userQuery: string
): Promise<AnalystResponse> {
  if (!apiKey) {
    throw new Error('API Key is required to call the Gemini API.');
  }

  // Initialize the new Google Gen AI SDK
  const ai = new GoogleGenAI({ apiKey });

  const datasetContext = buildDatasetContextPrompt(sheetName, columns, rowCount, sampleRows);
  
  // Set up the system instructions directing the agent persona and rules
  const systemInstruction = `
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
3. In "insights", write 2 to 4 bullet points. Keep insights extremely punchy, analytical, and backed by specific data points. Use Markdown formatting.
4. In "charts", you can recommend up to 2 charts. Only select columns that actually exist in the schema.
   - xAxisColumn: typically a categorical, text, or date column.
   - yAxisColumn: MUST be a numeric column (unless aggregation is 'count', where it can count rows).
   - aggregation: 'sum', 'avg', or 'count'. If plotting raw points (e.g. scatter), use 'none'.
5. In "followUpQuestions", suggest 2-3 logical next steps or deeper questions the user might want to ask.
`;

  // Format chat history for the SDK
  // We feed past messages. To keep it lightweight, user messages are just texts, and model responses can be represented as their key insights.
  const contents = history.map(msg => ({
    role: msg.role,
    parts: [
      {
        text: msg.role === 'user' 
          ? msg.content 
          : `[Thinking]: ${msg.analystResponse?.thinking}\n\n[Insights]:\n${msg.analystResponse?.insights.map(i => `- ${i}`).join('\n')}`
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
                  enum: ['bar', 'line', 'pie', 'scatter'] 
                },
                title: { type: 'STRING' as any },
                xAxisColumn: { type: 'STRING' as any, description: 'Column name for categories/X-axis.' },
                yAxisColumn: { type: 'STRING' as any, description: 'Numeric column name for values/Y-axis.' },
                aggregation: { 
                  type: 'STRING' as any, 
                  enum: ['sum', 'avg', 'count', 'none'],
                  description: 'How to roll up the values: sum, avg (average), count (number of records), or none (plot raw records).' 
                }
              },
              required: ['chartType', 'title', 'xAxisColumn', 'yAxisColumn', 'aggregation']
            }
          },
          followUpQuestions: {
            type: 'ARRAY' as any,
            items: { type: 'STRING' as any },
            description: 'Suggested follow-up questions for the user.'
          }
        },
        required: ['thinking', 'insights', 'charts', 'followUpQuestions']
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
