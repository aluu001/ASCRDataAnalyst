import { useState } from 'react';
import { 
  BarChart2, 
  Sparkles, 
  ArrowLeft, 
  FileText, 
  Upload, 
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { DataPreview } from './components/DataPreview';
import { ChatPanel } from './components/ChatPanel';
import { InsightChart } from './components/InsightChart';
import { queryGeminiAnalyst } from './utils/gemini';
import { getMockWorkbook } from './utils/mockData';
import type { WorkbookData, SheetData } from './utils/dataEngine';
import type { ChatMessage } from './utils/gemini';

// Gorgeous custom SVG Star of Life icon
const StarOfLifeIcon = () => (
  <svg viewBox="0 0 100 100" width="26" height="26" style={{ display: 'block' }}>
    {/* Blue 6-pointed star */}
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
    {/* Rod of Asclepius */}
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
  const [isUploadingCustom, setIsUploadingCustom] = useState<boolean>(false);

  // Portal Filter States
  const [selectedState, setSelectedState] = useState<string>('Florida');
  const [selectedProvider, setSelectedProvider] = useState<string>('All Providers');
  const [selectedPage, setSelectedPage] = useState<string>('Data Management');
  const [selectedYear, setSelectedYear] = useState<string>('FY 2025');

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
      // Build filter context to feed the AI
      const filterContextStr = `[Active Filters: State=${selectedState}, Provider=${selectedProvider === 'All Providers' ? targetSheet.name : selectedProvider}, Fiscal Year=${selectedYear}]`;
      const enrichedQueryText = `${filterContextStr}\n${queryText}`;

      // Run the query using Sheet Schema and 5-row sample
      const sampleRows = targetSheet.rows.slice(0, 5);
      const analystResult = await queryGeminiAnalyst(
        apiKey,
        targetSheet.name,
        targetSheet.columns,
        targetSheet.rowCount,
        sampleRows,
        currentHistory,
        enrichedQueryText
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
    setIsUploadingCustom(false);

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

  const handleLoadMockDocument = (name: string, fileKey: string) => {
    const data = getMockWorkbook(fileKey);
    handleWorkbookLoaded(data, name);
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

  const handleCloseWorkspace = () => {
    setWorkbookData(null);
    setActiveSheetName('');
    setMessages([]);
    setCurrentDocName('');
  };

  // Mock document registry inspired by the portal screenshot
  const mockDocuments = [
    { line: 31, provider: 'City of Oakland Park', page: 'Documentation', date: '10/12/2025 12:42 PM', name: 'Fire Detail Expense History Fund 340.xlsx', fileKey: 'Personnel Hours' },
    { line: 32, provider: 'City of Oakland Park', page: 'Documentation', date: '08/05/2025 1:01 PM', name: 'Emergency Room Arrival Time.csv', fileKey: 'Arrival Time' },
    { line: 33, provider: 'City of Oakland Park', page: 'Documentation', date: '08/05/2025 1:01 PM', name: 'CAD Data.csv', fileKey: 'Arrival Time' },
    { line: 35, provider: 'Alachua County Fire Rescue', page: 'Documentation', date: '10/09/2025 2:53 PM', name: 'PEMT Data 7-1-24 - 6-30-25.xlsx', fileKey: 'PEMT Data' },
    { line: 36, provider: 'Alachua County Fire Rescue', page: 'Documentation', date: '09/16/2025 12:16 PM', name: 'ACFR Expenditures 07012024-06302025.xlsx', fileKey: 'PEMT Data' },
    { line: 37, provider: 'Alachua County Fire Rescue', page: 'Documentation', date: '09/16/2025 12:17 PM', name: 'ACFR Other Revenues 07012024-06302025.xlsx', fileKey: 'PEMT Data' },
    { line: 38, provider: 'Alachua County Fire Rescue', page: 'Documentation', date: '09/16/2025 12:17 PM', name: 'Personnel Hours and Pay.xlsx', fileKey: 'Personnel Hours' },
    { line: 39, provider: 'Bradford County', page: 'Documentation', date: '10/02/2025 12:34 PM', name: 'Bradford PEMT Data 7-1-24 - 6-30-25.xlsx', fileKey: 'PEMT Data' }
  ];

  // Dynamic filtering of documents list based on the portal selectors
  const filteredDocuments = mockDocuments.filter(doc => {
    if (selectedProvider !== 'All Providers' && doc.provider !== selectedProvider) return false;
    if (selectedPage !== 'All Pages' && doc.page !== selectedPage) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header Banner - Corporate Branding */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">
            <StarOfLifeIcon />
          </div>
          <span className="logo-text">
            AMBULANCE SERVICES <span>COST REPORT PORTAL 2.0</span>
          </span>
        </div>

        <div className="header-actions">
          <span style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, letterSpacing: '0.05em' }}>
            PUBLIC CONSULTING GROUP
          </span>
        </div>
      </header>

      {/* User Info Bar */}
      <div className="welcome-bar">
        <div className="welcome-info">
          Welcome, <strong>Anthony</strong>
          <span>Administrator</span>
        </div>
        {workbookData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--LabelBG)', fontWeight: 600 }}>
              Active Workspace: {currentDocName}
            </span>
            <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} onClick={handleCloseWorkspace}>
              <ArrowLeft size={14} /> Back to Portal
            </button>
          </div>
        )}
      </div>

      {/* Main Layout Area */}
      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!workbookData ? (
          /* ==========================================
             PORTAL HOME PAGE (NO WORKBOOK LOADED)
             ========================================== */
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem var(--border-light)' }}>
            
            {/* Filter Bar Panel */}
            <div style={{ margin: '0 1.5rem 1.5rem', background: 'var(--WidgetBG)', border: '1.5px solid var(--LightGray)', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--LabelBG)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Portal Navigation & Filtering
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                <div className="filter-group">
                  <label className="filter-label">State</label>
                  <select className="filter-select" value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                    <option value="Florida">Florida</option>
                    <option value="California">California</option>
                    <option value="Texas">Texas</option>
                  </select>
                </div>
                
                <div className="filter-group">
                  <label className="filter-label">Provider</label>
                  <select className="filter-select" value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}>
                    <option value="All Providers">All Providers</option>
                    <option value="Alachua County Fire Rescue">Alachua County Fire Rescue</option>
                    <option value="City of Oakland Park">City of Oakland Park</option>
                    <option value="Bradford County">Bradford County</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Portal Section</label>
                  <select className="filter-select" value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)}>
                    <option value="Documentation">Data Management</option>
                    <option value="All Pages">All Portal Sheets</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Reporting Year</label>
                  <select className="filter-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                    <option value="FY 2025">FY 2025</option>
                    <option value="FY 2026">FY 2026</option>
                  </select>
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ height: '38px' }}
                  onClick={() => {
                    // Simulate updating table display or filtering
                  }}
                >
                  Apply Filters
                </button>
              </div>
            </div>

            <div className="dashboard-grid" style={{ paddingTop: 0 }}>
              
              {/* Left Column: Cost Report Portal Contents */}
              <div className="main-content-panel">
                
                {/* Dashboard Widgets Row */}
                <div className="widgets-row">
                  {/* Sign Offs Card */}
                  <div className="glass-card">
                    <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--LightGray)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--LabelBG)' }}>
                      Portal Sign Offs
                    </h3>
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--LightGray)', color: 'var(--DarkGray)', fontWeight: 'bold', textAlign: 'left' }}>
                          <th style={{ padding: '0.4rem 0', background: 'transparent', color: 'var(--DarkGray)', border: 'none' }}>Form Section</th>
                          <th style={{ padding: '0.4rem 0', background: 'transparent', color: 'var(--DarkGray)', border: 'none', textAlign: 'right' }}>PCG Sign Off</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px dashed var(--LightGray)' }}>
                          <td style={{ padding: '0.4rem 0' }}>Expenditure Crosswalk</td>
                          <td style={{ padding: '0.4rem 0', textAlign: 'right' }}><span className="status-pill completed">Yes</span></td>
                        </tr>
                        <tr style={{ borderBottom: '1px dashed var(--LightGray)' }}>
                          <td style={{ padding: '0.4rem 0' }}>CAD Crosswalk</td>
                          <td style={{ padding: '0.4rem 0', textAlign: 'right' }}><span className="status-pill completed">Yes</span></td>
                        </tr>
                        <tr style={{ borderBottom: '1px dashed var(--LightGray)' }}>
                          <td style={{ padding: '0.4rem 0' }}>Depreciation Schedule</td>
                          <td style={{ padding: '0.4rem 0', textAlign: 'right' }}><span className="status-pill completed">Yes</span></td>
                        </tr>
                        <tr style={{ borderBottom: '1px dashed var(--LightGray)' }}>
                          <td style={{ padding: '0.4rem 0' }}>Personnel Allocation</td>
                          <td style={{ padding: '0.4rem 0', textAlign: 'right' }}><span className="status-pill pending">Review</span></td>
                        </tr>
                        <tr>
                          <td style={{ padding: '0.4rem 0' }}>Total Cost Summary</td>
                          <td style={{ padding: '0.4rem 0', textAlign: 'right' }}><span className="status-pill not-started">Pending</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Important Dates Card */}
                  <div className="glass-card">
                    <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--LightGray)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--LabelBG)' }}>
                      Submission Deadlines
                    </h3>
                    <div className="timeline">
                      <div className="timeline-item">
                        <div className="timeline-marker urgent" />
                        <div className="timeline-content">
                          <span className="timeline-date">JULY 31, 2026</span>
                          <span className="timeline-text">Final PEMT cost logs submission is due.</span>
                        </div>
                      </div>
                      <div className="timeline-item">
                        <div className="timeline-marker" />
                        <div className="timeline-content">
                          <span className="timeline-date">SEPTEMBER 15, 2026</span>
                          <span className="timeline-text">Pre-audit data review completed by PCG.</span>
                        </div>
                      </div>
                      <div className="timeline-item">
                        <div className="timeline-marker" />
                        <div className="timeline-content">
                          <span className="timeline-date">NOVEMBER 30, 2026</span>
                          <span className="timeline-text">Final ASCR Cost Report submission is due.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resources Card */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', borderBottom: '1px solid var(--LightGray)', paddingBottom: '0.5rem', marginBottom: '0.75rem', color: 'var(--LabelBG)' }}>
                        Filing Resources
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <div 
                          onClick={() => handleLoadMockDocument('Personnel Hours and Pay.xlsx', 'Personnel Hours')} 
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--BannerGB)', fontWeight: 600 }}
                        >
                          <FileSpreadsheet size={16} /> Load Good Data Examples.xlsx
                        </div>
                        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--BannerGB)', fontWeight: 600, textDecoration: 'none' }}>
                          <FileText size={16} /> Cost Reporting Guide (PDF)
                        </a>
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--LightGray)', paddingTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary" style={{ flex: 1, padding: '0.3rem 0', fontSize: '0.75rem' }} onClick={() => setIsUploadingCustom(!isUploadingCustom)}>
                        <Upload size={12} /> Custom Upload
                      </button>
                    </div>
                  </div>
                </div>

                {/* File Uploader drawer conditional */}
                {isUploadingCustom && (
                  <div className="glass-card animate-slide-up" style={{ border: '2px solid var(--BannerGB)', background: 'var(--WidgetBG)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, color: 'var(--LabelBG)' }}>Upload Custom Cost Report Excel</h4>
                      <button className="btn btn-ghost" style={{ padding: 0, width: '20px', height: '20px' }} onClick={() => setIsUploadingCustom(false)}>✕</button>
                    </div>
                    <FileUploader onWorkbookLoaded={handleWorkbookLoaded} />
                  </div>
                )}

                {/* Documents Available Table (Main Screenshot replication) */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.05rem', borderBottom: '1px solid var(--LightGray)', paddingBottom: '0.65rem', marginBottom: '1rem', color: 'var(--LabelBG)' }}>
                    Documents Available
                  </h3>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>Line</th>
                          <th>Provider Name</th>
                          <th>Page Section</th>
                          <th>Submission Date</th>
                          <th>Document Name</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDocuments.map((doc, idx) => (
                          <tr key={idx} className="clickable-row" onClick={() => handleLoadMockDocument(doc.name, doc.fileKey)}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--DarkGray)' }}>{doc.line}</td>
                            <td>{doc.provider}</td>
                            <td>{doc.page}</td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{doc.date}</td>
                            <td>
                              <span className="doc-name">{doc.name}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button 
                                className="btn btn-primary btn-icon-only" 
                                style={{ width: '26px', height: '26px', borderRadius: '4px' }}
                                title="Load and Analyze Document"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLoadMockDocument(doc.name, doc.fileKey);
                                }}
                              >
                                <ArrowRight size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Sidebar Helper panel */}
              <div className="sidebar-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', background: 'linear-gradient(to bottom, #ffffff, var(--WidgetBG))' }}>
                <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                  <div style={{ background: 'var(--WidgetBG)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1.5px solid var(--LightGray)' }}>
                    <Sparkles size={28} color="var(--BannerGB)" />
                  </div>
                  <h3 style={{ color: 'var(--LabelBG)', fontSize: '1.25rem', fontFamily: 'var(--font-display)', marginBottom: '0.75rem' }}>
                    Antigravity AI Copilot
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--DarkGray)', lineHeight: 1.6 }}>
                    Select any document from the portal list, click its row, or upload your own Excel spreadsheet to launch the active workspace.
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--DarkGray)', lineHeight: 1.6 }}>
                    The AI analyst will automatically audit the schema, perform client-side groupings, run key statistics, and generate interactive charts to answer audit questions.
                  </p>
                </div>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--LightGray)', paddingTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--LabelBG)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Active Environment
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--DarkGray)' }}>
                    LLM Engine: <strong>Gemini 3.5 Flash</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--DarkGray)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    Status: <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgb(34, 197, 94)', display: 'inline-block' }} /> Online (Key Loaded)
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* ==========================================
             ACTIVE ANALYSIS WORKSPACE (FILE LOADED)
             ========================================== */
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--LightGray)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={18} style={{ color: 'var(--BannerGB)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontFamily: 'var(--font-display)', color: 'var(--LabelBG)' }}>
                      Interactive Visualizations
                    </h3>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--DarkGray)' }}>
                    <TrendingUp size={14} style={{ color: 'rgb(34, 197, 94)' }} /> Auto-Rendered
                  </div>
                </div>

                {currentCharts.length === 0 ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--DarkGray)', fontSize: '0.9rem' }}>
                    Ask the AI Analyst a question or select a prompt suggestion chip to generate charts dynamically from your sheet records.
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
