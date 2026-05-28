import { useState } from 'react';
import { BarChart2, Sparkles } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { DataPreview } from './components/DataPreview';
import { ChatPanel } from './components/ChatPanel';
import { InsightChart } from './components/InsightChart';
import { queryGeminiAnalyst } from './utils/gemini';
import type { WorkbookData, SheetData } from './utils/dataEngine';
import type { ChatMessage } from './utils/gemini';

function App() {
  const [workbookData, setWorkbookData] = useState<WorkbookData | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Directly load API key from Vite environment variable
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  const activeSheet = workbookData?.sheets.find(s => s.name === activeSheetName) || workbookData?.sheets[0];

  // Helper to execute query against Gemini
  const executeAnalysis = async (queryText: string, currentHistory: ChatMessage[], targetSheet: SheetData) => {
    if (!apiKey) {
      console.error('API key is missing in environment variables.');
      return;
    }

    setIsLoading(true);
    
    // Add user message to state
    const updatedMessages: ChatMessage[] = [
      ...currentHistory,
      { role: 'user', content: queryText }
    ];
    setMessages(updatedMessages);

    try {
      // Run the query using Sheet Schema and 5-row sample
      const sampleRows = targetSheet.rows.slice(0, 5);
      const analystResult = await queryGeminiAnalyst(
        apiKey,
        targetSheet.name,
        targetSheet.columns,
        targetSheet.rowCount,
        sampleRows,
        currentHistory,
        queryText
      );

      setMessages([
        ...updatedMessages,
        { role: 'model', content: '', analystResponse: analystResult }
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages([
        ...updatedMessages,
        { 
          role: 'model', 
          content: err?.message || 'An error occurred while connecting to the Gemini API. Please check your network connection.',
          isError: true 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkbookLoaded = (data: WorkbookData) => {
    setWorkbookData(data);
    setActiveSheetName(data.activeSheetName);
    setMessages([]);

    const firstSheet = data.sheets[0];
    if (apiKey && firstSheet) {
      executeAnalysis(
        'Perform an initial audit of this worksheet. Outline the primary metrics and recommend 1-2 charting configurations.',
        [],
        firstSheet
      );
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setActiveSheetName(sheetName);
    
    const nextSheet = workbookData?.sheets.find(s => s.name === sheetName);
    if (nextSheet && apiKey) {
      executeAnalysis(
        `I have switched sheets. Let's analyze the "${sheetName}" sheet. Give me its summary and suggest suitable charts.`,
        messages,
        nextSheet
      );
    }
  };

  const handleSendMessage = (text: string) => {
    if (!activeSheet) return;
    executeAnalysis(text, messages, activeSheet);
  };

  // Extract the most recently generated chart recommendations to display on the visual panel
  const currentCharts = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'model' && messages[i].analystResponse?.charts) {
        return messages[i].analystResponse?.charts || [];
      }
    }
    return [];
  })();

  const handleReset = () => {
    setWorkbookData(null);
    setActiveSheetName('');
    setMessages([]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">
            <Sparkles size={16} color="white" />
          </div>
          <span className="logo-text">Antigravity Excel Analyst</span>
        </div>

        <div className="header-actions">
          {workbookData && (
            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleReset}>
              Reset Workbook
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!workbookData ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <FileUploader onWorkbookLoaded={handleWorkbookLoaded} />
          </div>
        ) : (
          <div className="dashboard-grid">
            {/* Left Column - Visualizations and Previews */}
            <div className="main-content-panel">
              {/* Tabulated preview grid */}
              <DataPreview
                workbookData={workbookData}
                activeSheetName={activeSheetName}
                onSheetChange={handleSheetChange}
              />

              {/* Graphical Visualizations Panel */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                  <BarChart2 size={18} style={{ color: 'hsl(var(--primary))' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>Interactive Visualizations</h3>
                </div>

                {currentCharts.length === 0 ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>
                    Ask the AI Analyst a question or select an option to generate charts dynamically from your sheet records.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', width: '100%' }}>
                    {currentCharts.map((chart, idx) => (
                      <InsightChart
                        key={idx}
                        chartSpec={chart}
                        rows={activeSheet?.rows || []}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Chat Assistant Drawer */}
            <div className="sidebar-panel">
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                hasData={!!workbookData}
                hasApiKey={true} // Always true since handled in background
                onOpenSettings={() => {}} // No-op, settings button removed
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

