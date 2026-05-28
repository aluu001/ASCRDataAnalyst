import { useState } from 'react';
import { 
  BarChart2, 
  Sparkles, 
  ArrowLeft, 
  TrendingUp,
  FileSpreadsheet,
  Database,
  Sliders,
  Plus,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Printer,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { DataPreview } from './components/DataPreview';
import { ChatPanel } from './components/ChatPanel';
import { InsightChart } from './components/InsightChart';
import { queryGeminiAnalyst } from './utils/gemini';
import { getMockWorkbook } from './utils/mockData';
import type { WorkbookData, SheetData } from './utils/dataEngine';
import type { ChatMessage, ChartSpecification } from './utils/gemini';

// Helper to format basic inline markdown bolding and backticks
function inlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

// Smart helper to generate 8+ default charts based on sheet columns
function generateDefaultCharts(sheet: SheetData, docName: string): ChartSpecification[] {
  const numericCols = sheet.columns.filter(c => c.type === 'number');
  const catCols = sheet.columns.filter(c => c.type === 'string' || c.type === 'date');
  const catCol = catCols[0]?.name || '';

  // 1. If it's a known mock file, return pre-configured highly specific metrics
  if (docName.includes('PEMT Data') || sheet.name.includes('PEMT Reimbursement')) {
    return [
      { chartType: 'bar', title: 'Monthly Run Volume Distribution', xAxisColumn: 'Month', yAxisColumn: 'Run Volume', aggregation: 'sum' },
      { chartType: 'line', title: 'Average Cost per Transport Trend', xAxisColumn: 'Month', yAxisColumn: 'Avg Cost Per Transport', aggregation: 'avg' },
      { chartType: 'bar', title: 'Total Monthly Operational Revenue', xAxisColumn: 'Month', yAxisColumn: 'Total Revenue', aggregation: 'sum' },
      { chartType: 'bar', title: 'PEMT Supplemental Funding Allocations', xAxisColumn: 'Month', yAxisColumn: 'PEMT Supplement', aggregation: 'sum' },
      { chartType: 'pie', title: 'Share of Annual PEMT Supplement', xAxisColumn: 'Month', yAxisColumn: 'PEMT Supplement', aggregation: 'sum' },
      { chartType: 'scatter', title: 'Correlation: Run Volume vs Total Revenue', xAxisColumn: 'Run Volume', yAxisColumn: 'Total Revenue', aggregation: 'none' },
      { chartType: 'line', title: 'Transport Fee Charge Rates', xAxisColumn: 'Month', yAxisColumn: 'Transport Fee', aggregation: 'avg' },
      { chartType: 'bar', title: 'Aggregated Annual Operational Totals', xAxisColumn: 'Month', yAxisColumn: 'Total Revenue', aggregation: 'sum' }
    ];
  }

  if (docName.includes('Personnel Hours') || sheet.name.includes('Personnel Expenses')) {
    return [
      { chartType: 'bar', title: 'FTE Distribution by Job Title', xAxisColumn: 'Job Title', yAxisColumn: 'FTE Count', aggregation: 'sum' },
      { chartType: 'bar', title: 'Total Regular Base Salary by Title', xAxisColumn: 'Job Title', yAxisColumn: 'Total Regular Pay', aggregation: 'sum' },
      { chartType: 'bar', title: 'Total Overtime Expenditures by Title', xAxisColumn: 'Job Title', yAxisColumn: 'Total Overtime Pay', aggregation: 'sum' },
      { chartType: 'line', title: 'Comparison of Average Hourly Rates', xAxisColumn: 'Job Title', yAxisColumn: 'Avg Hourly Rate', aggregation: 'avg' },
      { chartType: 'pie', title: 'FTE Share by Department Role', xAxisColumn: 'Job Title', yAxisColumn: 'FTE Count', aggregation: 'sum' },
      { chartType: 'bar', title: 'Accumulated Overtime Hours by Job Title', xAxisColumn: 'Job Title', yAxisColumn: 'Overtime Hours', aggregation: 'sum' },
      { chartType: 'scatter', title: 'Correlation: Base Hours vs Base Pay', xAxisColumn: 'Regular Hours', yAxisColumn: 'Total Regular Pay', aggregation: 'none' },
      { chartType: 'pie', title: 'Overtime Pay Distribution by Role', xAxisColumn: 'Job Title', yAxisColumn: 'Total Overtime Pay', aggregation: 'sum' }
    ];
  }

  if (docName.includes('Arrival Time') || docName.includes('CAD Data') || sheet.name.includes('CAD Responses')) {
    return [
      { chartType: 'bar', title: 'Average Response Time by Incident Source', xAxisColumn: 'Call Source', yAxisColumn: 'Response Time (min)', aggregation: 'avg' },
      { chartType: 'bar', title: 'Average Dispatch Lag Time (Seconds)', xAxisColumn: 'Call Source', yAxisColumn: 'Dispatch Time (sec)', aggregation: 'avg' },
      { chartType: 'bar', title: 'Average On-Scene Treatment Duration', xAxisColumn: 'Call Source', yAxisColumn: 'Scene Time (min)', aggregation: 'avg' },
      { chartType: 'bar', title: 'Average Patient Transport Duration', xAxisColumn: 'Call Source', yAxisColumn: 'Transport Time (min)', aggregation: 'avg' },
      { chartType: 'pie', title: 'Incident Frequency Share by Category', xAxisColumn: 'Call Source', yAxisColumn: 'Response Time (min)', aggregation: 'count' },
      { chartType: 'line', title: 'Response Efficiency Benchmark Index', xAxisColumn: 'Call Source', yAxisColumn: 'Response Time (min)', aggregation: 'avg' },
      { chartType: 'scatter', title: 'Correlation: Dispatch Latency vs Total Response Time', xAxisColumn: 'Dispatch Time (sec)', yAxisColumn: 'Response Time (min)', aggregation: 'none' },
      { chartType: 'bar', title: 'Total Accumulated Response Loads', xAxisColumn: 'Call Source', yAxisColumn: 'Response Time (min)', aggregation: 'sum' }
    ];
  }

  // 2. Fallback dynamic generator for user-uploaded custom sheets
  if (numericCols.length > 0) {
    const y1 = numericCols[0].name;
    const y2 = numericCols[1]?.name || y1;
    const y3 = numericCols[2]?.name || y1;
    const cat = catCol || sheet.columns[0]?.name || '';

    return [
      { chartType: 'bar', title: `Distribution of ${y1} by ${cat}`, xAxisColumn: cat, yAxisColumn: y1, aggregation: 'sum' },
      { chartType: 'bar', title: `Distribution of ${y2} by ${cat}`, xAxisColumn: cat, yAxisColumn: y2, aggregation: 'sum' },
      { chartType: 'line', title: `Average of ${y1} over ${cat}`, xAxisColumn: cat, yAxisColumn: y1, aggregation: 'avg' },
      { chartType: 'line', title: `Average of ${y2} over ${cat}`, xAxisColumn: cat, yAxisColumn: y2, aggregation: 'avg' },
      { chartType: 'pie', title: `Share of ${y1} by Category`, xAxisColumn: cat, yAxisColumn: y1, aggregation: 'sum' },
      { chartType: 'pie', title: `Share of ${y3} by Category`, xAxisColumn: cat, yAxisColumn: y3, aggregation: 'sum' },
      { chartType: 'scatter', title: `Correlation: ${y1} vs ${y2}`, xAxisColumn: y1, yAxisColumn: y2, aggregation: 'none' },
      { chartType: 'bar', title: `Count of Records by ${cat}`, xAxisColumn: cat, yAxisColumn: y1, aggregation: 'count' }
    ];
  }

  return [];
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
  
  // Visualizations states
  const [availableCharts, setAvailableCharts] = useState<ChartSpecification[]>([]);
  const [selectedChartTitles, setSelectedChartTitles] = useState<string[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(true);

  // Collapse / Expand Workspace states
  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(false);
  const [isInsightsCollapsed, setIsInsightsCollapsed] = useState<boolean>(false);
  
  // Presentation modes: 'grid' | 'carousel' | 'tabbed'
  const [layoutMode, setLayoutMode] = useState<'grid' | 'carousel' | 'tabbed'>('grid');
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [activeChartTab, setActiveChartTab] = useState<string>('');

  // Custom Chart Form states
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customChartType, setCustomChartType] = useState<'bar' | 'line' | 'pie' | 'scatter'>('bar');
  const [customX, setCustomX] = useState<string>('');
  const [customY, setCustomY] = useState<string>('');
  const [customAggregation, setCustomAggregation] = useState<'sum' | 'avg' | 'count' | 'none'>('sum');

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

      // Merge Gemini recommended charts into registry if they are unique
      if (analystResult.charts && analystResult.charts.length > 0) {
        setAvailableCharts(prev => {
          const updated = [...prev];
          const existingTitles = prev.map(c => c.title.toLowerCase());
          analystResult.charts.forEach(newChart => {
            if (!existingTitles.includes(newChart.title.toLowerCase())) {
              updated.push(newChart);
            }
          });
          return updated;
        });

        setSelectedChartTitles(prev => {
          const updated = [...prev];
          analystResult.charts.forEach(newChart => {
            if (!updated.map(t => t.toLowerCase()).includes(newChart.title.toLowerCase())) {
              updated.push(newChart.title);
            }
          });
          return updated;
        });
      }

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
    const docName = loadedName || 'Uploaded Cost Report';
    setCurrentDocName(docName);
    setActiveTab('dashboard');
    setIsChatCollapsed(false);

    const firstSheet = data.sheets[0];
    if (firstSheet) {
      setCustomX(firstSheet.columns[0]?.name || '');
      setCustomY(firstSheet.columns.filter(c => c.type === 'number')[0]?.name || firstSheet.columns[0]?.name || '');
      
      // Auto-generate 8 smart visual specs immediately
      const defaultCharts = generateDefaultCharts(firstSheet, docName);
      setAvailableCharts(defaultCharts);
      setSelectedChartTitles(defaultCharts.map(c => c.title));
      
      // Set default tab selection
      if (defaultCharts.length > 0) {
        setActiveChartTab(defaultCharts[0].title);
      }

      if (apiKey) {
        executeAnalysis(
          `Perform an initial cost report audit of this worksheet. Outline the primary operational/financial metrics and recommend some custom visualizations.`,
          [],
          firstSheet
        );
      }
    }
  };

  const handleSheetChange = (sheetName: string) => {
    setActiveSheetName(sheetName);
    
    const nextSheet = workbookData?.sheets.find(s => s.name === sheetName);
    if (nextSheet) {
      setCustomX(nextSheet.columns[0]?.name || '');
      setCustomY(nextSheet.columns.filter(c => c.type === 'number')[0]?.name || nextSheet.columns[0]?.name || '');
      
      const defaultCharts = generateDefaultCharts(nextSheet, currentDocName);
      setAvailableCharts(defaultCharts);
      setSelectedChartTitles(defaultCharts.map(c => c.title));

      if (defaultCharts.length > 0) {
        setActiveChartTab(defaultCharts[0].title);
      }
      setCarouselIndex(0);

      if (apiKey) {
        executeAnalysis(
          `I have switched worksheets. Let's analyze the "${sheetName}" sheet. Give me its summary and suggest suitable charts.`,
          messages,
          nextSheet
        );
      }
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

  const handleCreateCustomChart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customX || !customY) return;
    
    const newChart: ChartSpecification = {
      chartType: customChartType,
      title: customTitle,
      xAxisColumn: customX,
      yAxisColumn: customY,
      aggregation: customAggregation
    };

    setAvailableCharts(prev => [...prev, newChart]);
    setSelectedChartTitles(prev => [...prev, newChart.title]);
    setActiveChartTab(newChart.title);
    setCustomTitle('');
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Filter available charts based on multi-select state
  const chartsToRender = availableCharts.filter(c => selectedChartTitles.includes(c.title));

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
    setAvailableCharts([]);
    setSelectedChartTitles([]);
    setCarouselIndex(0);
    setActiveChartTab('');
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

      {/* Welcome Bar */}
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
            {isChatCollapsed && (
              <button 
                className="btn btn-primary" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => setIsChatCollapsed(false)}
              >
                <MessageSquare size={14} /> Open Copilot
              </button>
            )}
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
          <div className="dashboard-grid" style={{ height: '100%', padding: '1rem 1.5rem', gridTemplateColumns: isChatCollapsed ? '1fr' : undefined }}>
            
            {/* Left Column - Large visual dashboard and data tables */}
            <div className="main-content-panel">
              
              {/* Collapsible Executive Summary & Key Insights */}
              {latestInsights.length > 0 && (
                <div className="glass-card" style={{ borderLeft: '4px solid var(--BannerGB)', padding: '1.25rem' }}>
                  <div 
                    onClick={() => setIsInsightsCollapsed(!isInsightsCollapsed)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <TrendingUp size={18} style={{ color: 'var(--BannerGB)' }} />
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--LabelBG)' }}>Executive Summary & Key Insights</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--BannerGB)', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      <span>{isInsightsCollapsed ? 'Expand' : 'Collapse'}</span>
                      {isInsightsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </div>
                  </div>
                  
                  {!isInsightsCollapsed && (
                    <ul style={{ margin: '0.75rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--HeaderText)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {latestInsights.map((insight, idx) => (
                        <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(insight) }} />
                      ))}
                    </ul>
                  )}
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

                  {/* Chart Control Center (Selector + Creator) */}
                  <div className="glass-card chart-control-center-panel" style={{ padding: '1.25rem' }}>
                    <div 
                      onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: isSelectorOpen ? '1px solid var(--LightGray)' : 'none', paddingBottom: isSelectorOpen ? '0.75rem' : '0' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sliders size={18} style={{ color: 'var(--BannerGB)' }} />
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--LabelBG)' }}>
                          Chart Control Center ({selectedChartTitles.length}/{availableCharts.length} Selected)
                        </h3>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--BannerGB)', fontWeight: 'bold' }}>
                        {isSelectorOpen ? 'Hide Controls' : 'Show Controls'}
                      </span>
                    </div>

                    {isSelectorOpen && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                        {/* Selector Sub-panel */}
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--DarkGray)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Select Visualizations to Display (Multi-Select Pills)
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {availableCharts.map((chart, idx) => {
                              const isChecked = selectedChartTitles.includes(chart.title);
                              return (
                                <label 
                                  key={idx} 
                                  className="suggestion-chip" 
                                  style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.4rem', 
                                    background: isChecked ? 'var(--WidgetBG)' : 'white',
                                    borderColor: isChecked ? 'var(--BannerGB)' : 'var(--LightGray)',
                                    color: isChecked ? 'var(--LabelBG)' : 'var(--DarkGray)',
                                    fontWeight: isChecked ? 'bold' : 'normal',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '16px'
                                  }}
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    onChange={() => {
                                      let nextTitles;
                                      if (isChecked) {
                                        nextTitles = selectedChartTitles.filter(t => t !== chart.title);
                                      } else {
                                        nextTitles = [...selectedChartTitles, chart.title];
                                      }
                                      setSelectedChartTitles(nextTitles);
                                      
                                      // Sync active tab or carousel index if deleted
                                      if (nextTitles.length > 0) {
                                        if (carouselIndex >= nextTitles.length) {
                                          setCarouselIndex(nextTitles.length - 1);
                                        }
                                        if (!nextTitles.includes(activeChartTab)) {
                                          setActiveChartTab(nextTitles[0]);
                                        }
                                      }
                                    }}
                                    style={{ display: 'none' }}
                                  />
                                  <span style={{ fontSize: '0.8rem', color: 'var(--BannerGB)' }}>
                                    {isChecked ? '✓' : '+'}
                                  </span>
                                  <span style={{ fontSize: '0.775rem' }}>{chart.title}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        {/* Creator Sub-panel */}
                        <div style={{ borderTop: '1px dashed var(--LightGray)', paddingTop: '1rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--DarkGray)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Create Custom Visualization
                          </div>
                          <form onSubmit={handleCreateCustomChart} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 180px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Chart Title</span>
                              <input 
                                type="text"
                                className="form-input"
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                                placeholder="e.g. Total Overtime Cost Share"
                                value={customTitle}
                                onChange={e => setCustomTitle(e.target.value)}
                                required
                              />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '110px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Type</span>
                              <select 
                                className="filter-select" 
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                                value={customChartType}
                                onChange={e => setCustomChartType(e.target.value as any)}
                              >
                                <option value="bar">Bar</option>
                                <option value="line">Line</option>
                                <option value="pie">Pie</option>
                                <option value="scatter">Scatter</option>
                              </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 120px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>X-Axis</span>
                              <select 
                                className="filter-select" 
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                                value={customX}
                                onChange={e => setCustomX(e.target.value)}
                                required
                              >
                                <option value="">-- Select --</option>
                                {activeSheet?.columns.map((c, i) => (
                                  <option key={i} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 120px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Y-Axis</span>
                              <select 
                                className="filter-select" 
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                                value={customY}
                                onChange={e => setCustomY(e.target.value)}
                                required
                              >
                                <option value="">-- Select --</option>
                                {activeSheet?.columns.map((c, i) => (
                                  <option key={i} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '110px' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Rollup</span>
                              <select 
                                className="filter-select" 
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                                value={customAggregation}
                                onChange={e => setCustomAggregation(e.target.value as any)}
                              >
                                <option value="sum">Sum</option>
                                <option value="avg">Average</option>
                                <option value="count">Count</option>
                                <option value="none">None (Plot All)</option>
                              </select>
                            </div>

                            <button 
                              type="submit"
                              className="btn btn-primary" 
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', height: '32px' }}
                            >
                              <Plus size={14} /> Add Chart
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rendered Visualizations Card */}
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* Visualizer header containing controls */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--LightGray)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart2 size={18} style={{ color: 'var(--BannerGB)' }} />
                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--LabelBG)' }}>Rendered Visualizations</h3>
                      </div>
                      
                      <div className="layout-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* Presentation Selector */}
                        <div style={{ display: 'flex', background: 'var(--ExtraLightGray)', borderRadius: '6px', padding: '2px', border: '1px solid var(--LightGray)' }}>
                          <button 
                            className="btn" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: layoutMode === 'grid' ? 'white' : 'transparent', color: layoutMode === 'grid' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: layoutMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                            onClick={() => setLayoutMode('grid')}
                          >
                            Grid layout
                          </button>
                          <button 
                            className="btn" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: layoutMode === 'carousel' ? 'white' : 'transparent', color: layoutMode === 'carousel' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: layoutMode === 'carousel' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                            onClick={() => setLayoutMode('carousel')}
                          >
                            Carousel
                          </button>
                          <button 
                            className="btn" 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: layoutMode === 'tabbed' ? 'white' : 'transparent', color: layoutMode === 'tabbed' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: layoutMode === 'tabbed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}
                            onClick={() => setLayoutMode('tabbed')}
                          >
                            Tabbed
                          </button>
                        </div>

                        {/* Export to PDF */}
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={handleExportPDF}
                        >
                          <Printer size={12} /> PDF Export
                        </button>
                      </div>
                    </div>

                    {chartsToRender.length === 0 ? (
                      <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--DarkGray)', fontSize: '0.9rem' }}>
                        {availableCharts.length === 0 
                          ? (isLoading ? 'AI Copilot is auditing spreadsheet and designing dashboard charts...' : 'Upload data to begin.') 
                          : 'No charts selected. Check item boxes in the Chart Control Center above to display visualizations.'}
                      </div>
                    ) : (
                      <>
                        {/* ==========================================
                           LAYOUT MODE: GRID RENDER (2-Column Large View)
                           ========================================== */}
                        {layoutMode === 'grid' && (
                          <div className="print-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', width: '100%' }}>
                            {chartsToRender.map((chart, idx) => (
                              <InsightChart
                                key={idx}
                                chartSpec={chart}
                                rows={activeSheet?.rows || []}
                              />
                            ))}
                          </div>
                        )}

                        {/* ==========================================
                           LAYOUT MODE: CAROUSEL RENDER (Single-Frame Slider)
                           ========================================== */}
                        {layoutMode === 'carousel' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                            {/* Carousel Controls */}
                            <div className="carousel-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--WidgetBG)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(0,82,189,0.08)' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => setCarouselIndex(prev => (prev > 0 ? prev - 1 : chartsToRender.length - 1))}
                              >
                                <ChevronLeft size={14} /> Prev
                              </button>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>
                                Visualization {carouselIndex + 1} of {chartsToRender.length}
                              </span>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => setCarouselIndex(prev => (prev < chartsToRender.length - 1 ? prev + 1 : 0))}
                              >
                                Next <ChevronRight size={14} />
                              </button>
                            </div>
                            {/* Chart Frame */}
                            {chartsToRender[carouselIndex] && (
                              <InsightChart
                                chartSpec={chartsToRender[carouselIndex]}
                                rows={activeSheet?.rows || []}
                              />
                            )}
                            {/* Printable Fallback (Hidden on Screen, visible in Print) */}
                            <div className="print-charts-grid" style={{ display: 'none' }}>
                              {chartsToRender.map((chart, idx) => (
                                <InsightChart
                                  key={idx}
                                  chartSpec={chart}
                                  rows={activeSheet?.rows || []}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ==========================================
                           LAYOUT MODE: TABBED RENDER (Interactive Tabs)
                           ========================================== */}
                        {layoutMode === 'tabbed' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                            {/* Chart Tabs Bar */}
                            <div className="tabs-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', borderBottom: '1px solid var(--LightGray)', paddingBottom: '0.25rem' }}>
                              {chartsToRender.map((chart, idx) => (
                                <button
                                  key={idx}
                                  className="btn"
                                  style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.75rem',
                                    borderRadius: '6px',
                                    background: activeChartTab === chart.title ? 'var(--LabelBG)' : 'transparent',
                                    color: activeChartTab === chart.title ? 'white' : 'var(--DarkGray)',
                                    border: activeChartTab === chart.title ? 'none' : '1px solid var(--LightGray)',
                                    fontWeight: activeChartTab === chart.title ? 'bold' : 'normal'
                                  }}
                                  onClick={() => setActiveChartTab(chart.title)}
                                >
                                  {chart.title}
                                </button>
                              ))}
                            </div>
                            {/* Active Chart Frame */}
                            {chartsToRender.find(c => c.title === activeChartTab) && (
                              <InsightChart
                                chartSpec={chartsToRender.find(c => c.title === activeChartTab)!}
                                rows={activeSheet?.rows || []}
                              />
                            )}
                            {/* Printable Fallback */}
                            <div className="print-charts-grid" style={{ display: 'none' }}>
                              {chartsToRender.map((chart, idx) => (
                                <InsightChart
                                  key={idx}
                                  chartSpec={chart}
                                  rows={activeSheet?.rows || []}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </>
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
            {!isChatCollapsed && (
              <div className="sidebar-panel">
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  hasData={!!workbookData}
                  hasApiKey={true}
                  onCollapse={() => setIsChatCollapsed(true)}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
