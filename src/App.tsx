import { useState } from 'react';
import { 
  BarChart2, 
  Sparkles, 
  ArrowLeft, 
  TrendingUp,
  FileSpreadsheet,
  Database
} from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { DataPreview } from './components/DataPreview';
import { ChatPanel } from './components/ChatPanel';
import { InsightChart } from './components/InsightChart';
import { queryGeminiAnalyst } from './utils/gemini';
import { getMockWorkbook } from './utils/mockData';
import type { WorkbookData, SheetData } from './utils/dataEngine';
import type { ChatMessage } from './utils/gemini';

// Helper to format basic inline markdown bolding and backticks
function inlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

// Custom Star of Life SVG icon
const StarOfLifeIcon = () => (
  <svg viewBox="0 0 100 100" width="22" height="22" style={{ display: 'block' }}>
    <path
      d="M 50,6 L 50,94 M 12,28 L 88,72 M 12,72 L 88,28"
      stroke="white"
      strokeWidth="12"
      strokeLinecap="round"
    />
    <path
      d="M 50,11 L 50,89 M 16,31 L 84,69 M 16,69 L 84,31"
      stroke="#002185"
      strokeWidth="7"
      strokeLinecap="round"
    />
    <path
      d="M 50,25 L 50,75"
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M 45,64 Q 55,60 50,51 Q 45,42 55,37"
      fill="none"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

function App() {
  const [workbookData, setWorkbookData] = useState<WorkbookData | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentDocName, setCurrentDocName] = useState<string>('');
  
  // Dashboard Tab state: 'dashboard' or 'raw-data'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'raw-data'>('dashboard');

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

  const handleWorkbookLoaded = (data: WorkbookData, loadedName?: string) => {
    setWorkbookData(data);
    setActiveSheetName(data.activeSheetName);
    setMessages([]);
    setCurrentDocName(loadedName || 'Uploaded Cost Report');
    setActiveTab('dashboard');

    const firstSheet = data.sheets[0];
    if (apiKey && firstSheet) {
      executeAnalysis(
        `Perform an initial cost report audit of this worksheet. Outline the primary operational/financial metrics and recommend 1-2 charting configurations to highlight key spending or transport patterns.`,
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
        `I have switched worksheets. Let's analyze the "${sheetName}" sheet. Give me its summary and suggest suitable charts.`,
        messages,
        nextSheet
      );
    }
  };

  const handleSendMessage = (text: string) => {
    if (!activeSheet) return;
    executeAnalysis(text, messages, activeSheet);
  };

  const handleLoadSample = (name: string, fileKey: string) => {
    const data = getMockWorkbook(fileKey);
    handleWorkbookLoaded(data, name);
  };

  // Extract the most recently generated chart recommendations
  const currentCharts = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'model' && messages[i].analystResponse?.charts) {
        return messages[i].analystResponse?.charts || [];
      }
    }
    return [];
  })();

  // Extract the most recently generated insights
  const latestInsights = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'model' && messages[i].analystResponse?.insights) {
        return messages[i].analystResponse?.insights || [];
      }
    }
    return [];
  })();

  const handleCloseWorkspace = () => {
    setWorkbookData(null);
    setActiveSheetName('');
    setMessages([]);
    setCurrentDocName('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Clean Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">
            <StarOfLifeIcon />
          </div>
          <span className="logo-text">
            ASCR <span>AI DATA ANALYST</span>
          </span>
        </div>

        <div className="header-actions">
          <span style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, letterSpacing: '0.05em' }}>
            PUBLIC CONSULTING GROUP
          </span>
        </div>
      </header>

      {/* Welcome & Sub-bar */}
      <div className="welcome-bar">
        <div className="welcome-info">
          Welcome, <strong>Anthony</strong>
          <span>Administrator</span>
        </div>
        {workbookData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--LabelBG)', fontWeight: 600 }}>
              Active File: {currentDocName}
            </span>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={handleCloseWorkspace}>
              <ArrowLeft size={14} /> Close & Upload New
            </button>
          </div>
        )}
      </div>

      {/* Main Analysis Workspace */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!workbookData ? (
          /* ==========================================
             UPLOADER PAGE (NO WORKBOOK LOADED)
             ========================================== */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backgroundColor: 'var(--DashboardBG)' }}>
            <div style={{ maxWidth: '550px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: 'var(--WidgetBG)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1.5px solid var(--LightGray)' }}>
                  <Sparkles size={28} color="var(--BannerGB)" />
                </div>
                <h2 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', color: 'var(--LabelBG)', margin: '0 0 0.5rem' }}>
                  Executive Data Workspace
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--DarkGray)', margin: 0 }}>
                  Upload an Excel workbook file to trigger client-side data crunching and generate an AI executive analyst dashboard.
                </p>
              </div>

              <div className="glass-card" style={{ padding: '2rem' }}>
                <FileUploader onWorkbookLoaded={handleWorkbookLoaded} />
                
                {/* Sample Selection Buttons */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--LightGray)', paddingTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)', marginBottom: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>
                    Or select a sample document to test the system immediately
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => handleLoadSample('PEMT Data 7-1-24 - 6-30-25.xlsx', 'PEMT Data')}
                    >
                      <FileSpreadsheet size={14} style={{ color: 'var(--BannerGB)' }} /> Alachua PEMT Data
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => handleLoadSample('Personnel Hours and Pay.xlsx', 'Personnel Hours')}
                    >
                      <FileSpreadsheet size={14} style={{ color: 'var(--BannerGB)' }} /> Personnel Pay Details
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => handleLoadSample('Emergency Room Arrival Time.csv', 'Arrival Time')}
                    >
                      <Database size={14} style={{ color: 'var(--BannerGB)' }} /> Dispatch Response Logs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==========================================
             ACTIVE ANALYSIS WORKSPACE (MAXIMIZED FOR DATA VIS)
             ========================================== */
          <div className="dashboard-grid" style={{ height: '100%', padding: '1rem 1.5rem' }}>
            
            {/* Left Column - Large visual dashboard and data tables */}
            <div className="main-content-panel">
              
              {/* Executive Summary & Key Insights (Updates dynamically with AI feedback) */}
              {latestInsights.length > 0 && (
                <div className="glass-card" style={{ borderLeft: '4px solid var(--BannerGB)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <TrendingUp size={18} style={{ color: 'var(--BannerGB)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--LabelBG)' }}>Executive Summary & Key Insights</h3>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--HeaderText)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {latestInsights.map((insight, idx) => (
                      <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(insight) }} />
                    ))}
                  </ul>
                </div>
              )}

              {/* View Toggle Tabs */}
              <div className="sheet-tabs-container" style={{ margin: '0.25rem 0' }}>
                <button 
                  className={`sheet-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  Executive Dashboard
                </button>
                <button 
                  className={`sheet-tab ${activeTab === 'raw-data' ? 'active' : ''}`}
                  onClick={() => setActiveTab('raw-data')}
                >
                  Tabular Grid & Statistics
                </button>
              </div>

              {activeTab === 'dashboard' ? (
                /* ==========================================
                   DASHBOARD CHARTS VIEW
                   ========================================== */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* KPI Row (Derived from the columns) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Records</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>{workbookData.sheets[0].rowCount.toLocaleString()} rows</span>
                    </div>
                    {workbookData.sheets[0].columns.filter(c => c.type === 'number').slice(0, 3).map((col, idx) => (
                      <div key={idx} className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg {col.name}</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>
                          {typeof col.avg === 'number' ? col.avg.toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Visualizations Card */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--LightGray)', paddingBottom: '0.75rem' }}>
                      <BarChart2 size={18} style={{ color: 'var(--BannerGB)' }} />
                      <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--LabelBG)' }}>Interactive Visualizations</h3>
                    </div>

                    {currentCharts.length === 0 ? (
                      <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--DarkGray)', fontSize: '0.9rem' }}>
                        {isLoading ? 'AI Copilot is auditing spreadsheet and designing dashboard charts...' : 'Ask the AI Copilot to generate visual representations of your dataset.'}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', width: '100%' }}>
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
              ) : (
                /* ==========================================
                   RAW DATA GRID / COLUMN STATS VIEW
                   ========================================== */
                <DataPreview
                  workbookData={workbookData}
                  activeSheetName={activeSheetName}
                  onSheetChange={handleSheetChange}
                />
              )}
            </div>

            {/* Right Column - Chat Assistant Drawer */}
            <div className="sidebar-panel">
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                hasData={!!workbookData}
                hasApiKey={true}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
