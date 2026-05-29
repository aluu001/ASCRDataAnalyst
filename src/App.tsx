import { useState, useMemo } from 'react';
import { 
  BarChart2, 
  ArrowLeft, 
  TrendingUp,
  FileSpreadsheet,
  Database,
  Sliders,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Printer,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Users,
  Clock,
  DollarSign,
  ShieldCheck
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
      { chartType: 'bubble', title: 'Operational Correlation: Run Vol vs Total Revenue vs PEMT Size', xAxisColumn: 'Run Volume', yAxisColumn: 'Total Revenue', aggregation: 'none', zAxisColumn: 'PEMT Supplement' }
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
      { chartType: 'box', title: 'Hourly Rate Spread by Job Title Box Plot', xAxisColumn: 'Job Title', yAxisColumn: 'Avg Hourly Rate', aggregation: 'none' }
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
      { chartType: 'radar', title: 'CAD Response Profile Radar Analysis', xAxisColumn: 'Call Source', yAxisColumn: 'Response Time (min)', aggregation: 'avg' }
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

// Helper to classify chart titles as financial or operational
function classifyChart(title: string): 'financial' | 'operational' {
  const t = title.toLowerCase();
  if (
    t.includes('cost') ||
    t.includes('revenue') ||
    t.includes('pay') ||
    t.includes('salary') ||
    t.includes('supplement') ||
    t.includes('funding') ||
    t.includes('fee') ||
    t.includes('expenditure') ||
    t.includes('financial') ||
    t.includes('rate') ||
    t.includes('pemt') ||
    t.includes('reimbursement') ||
    t.includes('expenses') ||
    t.includes('earning')
  ) {
    return 'financial';
  }
  return 'operational';
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
  // Collapse / Expand Workspace states
  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(false);
  const [isInsightsCollapsed, setIsInsightsCollapsed] = useState<boolean>(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  // Workspace Tab selection: 'dashboard' | 'spreadsheet' | 'methodology'
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'dashboard' | 'spreadsheet' | 'methodology'>('dashboard');

  // Dashboard Interactive Filters state: mapping column names to selected values to filter by
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});

  // Sub-tab selection in Methodology page
  const [activeMethodologySubTab, setActiveMethodologySubTab] = useState<'pemt' | 'fte' | 'cad'>('pemt');

  // Presentation modes: 'grid' | 'carousel' | 'tabbed'
  const [layoutMode, setLayoutMode] = useState<'grid' | 'carousel' | 'tabbed'>('grid');
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [activeChartTab, setActiveChartTab] = useState<string>('');

  // Custom Chart Form states
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customChartType, setCustomChartType] = useState<'bar' | 'horizontalBar' | 'line' | 'pie' | 'scatter' | 'bubble' | 'radar' | 'box'>('bar');
  const [customX, setCustomX] = useState<string>('');
  const [customY, setCustomY] = useState<string>('');
  const [customZ, setCustomZ] = useState<string>('');
  const [customAggregation, setCustomAggregation] = useState<'sum' | 'avg' | 'count' | 'none'>('sum');
  const [colorTheme, setColorTheme] = useState<'classic' | 'vibrant'>('vibrant');

  // Directly load API key from Vite environment variable
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  const activeSheet = workbookData?.sheets.find(s => s.name === activeSheetName) || workbookData?.sheets[0];

  // Reactive filtered dataset rows based on activeFilters state
  const filteredRows = useMemo(() => {
    if (!activeSheet) return [];
    const filterKeys = Object.keys(activeFilters);
    if (filterKeys.length === 0) return activeSheet.rows;

    return activeSheet.rows.filter(row => {
      return filterKeys.every(colName => {
        const allowedValues = activeFilters[colName];
        if (!allowedValues || allowedValues.length === 0) return true;
        const cellValue = String(row[colName] ?? '').trim();
        return allowedValues.includes(cellValue);
      });
    });
  }, [activeSheet, activeFilters]);

  // Dynamically find columns we can filter on (string/bool with 2 to 25 unique values)
  const filterableColumns = useMemo(() => {
    if (!activeSheet) return [];
    return activeSheet.columns.filter(col => {
      if (col.type !== 'string' && col.type !== 'boolean') return false;
      const uniqueVals = new Set(activeSheet.rows.map(r => String(r[col.name] ?? '').trim()).filter(v => v !== ''));
      return uniqueVals.size >= 2 && uniqueVals.size <= 25;
    }).map(col => {
      const uniqueVals = Array.from(new Set(activeSheet.rows.map(r => String(r[col.name] ?? '').trim()).filter(v => v !== ''))).sort();
      return {
        name: col.name,
        values: uniqueVals
      };
    });
  }, [activeSheet]);

  const handleToggleFilterVal = (colName: string, value: string) => {
    setActiveFilters(prev => {
      const current = prev[colName] || [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      
      const newFilters = { ...prev };
      if (next.length === 0) {
        delete newFilters[colName];
      } else {
        newFilters[colName] = next;
      }
      return newFilters;
    });
  };

  const handleSetSingleFilterVal = (colName: string, value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (value === '' || value === 'ALL_VALUES') {
        delete newFilters[colName];
      } else {
        newFilters[colName] = [value];
      }
      return newFilters;
    });
  };

  // Dynamically calculate average of numeric columns on filtered dataset
  const getFilteredAverage = (colName: string): number => {
    if (filteredRows.length === 0) return 0;
    let sum = 0;
    let count = 0;
    for (const r of filteredRows) {
      const val = Number(r[colName]);
      if (!isNaN(val) && r[colName] !== null && r[colName] !== undefined) {
        sum += val;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  };

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
    setActiveFilters({});
    setMessages([]);
    const docName = loadedName || 'Uploaded Cost Report';
    setCurrentDocName(docName);

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
    setActiveFilters({});
    
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
      aggregation: customAggregation,
      zAxisColumn: customChartType === 'bubble' ? customZ : undefined
    };

    setAvailableCharts(prev => [...prev, newChart]);
    setSelectedChartTitles(prev => [...prev, newChart.title]);
    setActiveChartTab(newChart.title);
    setCustomTitle('');
    setCustomZ('');
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Filter available charts based on multi-select state
  const chartsToRender = availableCharts.filter(c => selectedChartTitles.includes(c.title));

  // Render grouped financial vs operational grid panels dynamically
  const renderGroupedGrid = (charts: ChartSpecification[]) => {
    const isLargeChart = (chart: ChartSpecification, rows: any[]): boolean => {
      if (chart.chartType === 'pie') return false;
      const lowerX = (chart.xAxisColumn || '').toLowerCase();
      const lowerTitle = (chart.title || '').toLowerCase();
      if (chart.chartType === 'line') return true;
      if (
        lowerX.includes('month') || 
        lowerX.includes('date') || 
        lowerX.includes('year') || 
        lowerX.includes('time') ||
        lowerTitle.includes('trend') || 
        lowerTitle.includes('timeline') || 
        lowerTitle.includes('monthly') ||
        lowerTitle.includes('overtime') ||
        lowerTitle.includes('response time')
      ) {
        return true;
      }
      if (rows && rows.length > 0 && chart.xAxisColumn) {
        const uniqueVals = new Set(rows.map(r => r[chart.xAxisColumn]).filter(v => v !== undefined && v !== null));
        if (uniqueVals.size > 5) {
          return true;
        }
      }
      return false;
    };

    const financialCharts = charts.filter(c => classifyChart(c.title) === 'financial');
    const operationalCharts = charts.filter(c => classifyChart(c.title) === 'operational');
    const rows = filteredRows;

    return (
      <div className="print-charts-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
        {financialCharts.length > 0 && (
          <div className="dashboard-section-card">
            <div className="dashboard-section-title">
              <span>💰 Financial Metrics & Cost Allocations</span>
            </div>
            <div 
              className="dashboard-section-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                gap: '1.25rem'
              }}
            >
              {financialCharts.map((chart, idx) => {
                const isLarge = isLargeChart(chart, rows);
                const gridColumn = isLarge ? 'span 2' : 'span 1';
                const height = isLarge ? '400px' : '330px';
                return (
                   <div key={idx} style={{ gridColumn }}>
                     <InsightChart
                       chartSpec={chart}
                       rows={rows}
                       borderless={true}
                       height={height}
                       colorTheme={colorTheme}
                     />
                   </div>
                );
              })}
            </div>
          </div>
        )}

        {operationalCharts.length > 0 && (
          <div className="dashboard-section-card">
            <div className="dashboard-section-title">
              <span>⚡ Operational Performance & Volumes</span>
            </div>
            <div 
              className="dashboard-section-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                gap: '1.25rem'
              }}
            >
              {operationalCharts.map((chart, idx) => {
                const isLarge = isLargeChart(chart, rows);
                const gridColumn = isLarge ? 'span 2' : 'span 1';
                const height = isLarge ? '400px' : '330px';
                return (
                  <div key={idx} style={{ gridColumn }}>
                    <InsightChart
                      chartSpec={chart}
                      rows={rows}
                      borderless={true}
                      height={height}
                      colorTheme={colorTheme}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

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
    setActiveWorkspaceTab('dashboard');
    setActiveFilters({});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
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

      {/* Welcome Bar / Global Sheet Switcher */}
      <div className="welcome-bar">
        <div className="welcome-info">
          Welcome, <strong>Anthony</strong>
          <span>Administrator</span>
        </div>
        {workbookData && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--LabelBG)', fontWeight: 600 }}>
              File: {currentDocName}
            </span>
            
            {isLeftPanelCollapsed && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => setIsLeftPanelCollapsed(false)}
              >
                <Sliders size={14} /> Show Controls
              </button>
            )}

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
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '3rem 1.5rem', backgroundColor: 'var(--DashboardBG)' }}>
            <div style={{ maxWidth: '1100px', width: '100%', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Main Uploader Card Container */}
              <div className="glass-card" style={{ padding: '2.5rem 2.5rem', borderRadius: '16px' }}>
                
                {/* 2-Column Split Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '2.5rem', alignItems: 'stretch' }}>
                  
                  {/* Left Column: Title & Upload Area */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ background: 'var(--WidgetBG)', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(0, 82, 189, 0.12)', color: 'var(--BannerGB)', flexShrink: 0 }}>
                        <FileSpreadsheet size={24} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--LabelBG)', margin: 0, fontWeight: 700 }}>
                          ASCR Data Analyst Workspace
                        </h2>
                        <span style={{ fontSize: '0.75rem', color: 'var(--DarkGray)', fontWeight: 500 }}>
                          PUBLIC CONSULTING GROUP
                        </span>
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '0.85rem', color: 'var(--DarkGray)', margin: 0, lineHeight: '1.5' }}>
                      Upload an ambulance service cost report or personnel spreadsheet file to automatically parse sheets, compute rollup benchmarks, and run audits.
                    </p>

                    <FileUploader onWorkbookLoaded={handleWorkbookLoaded} />
                  </div>

                  {/* Right Column: Demo Reports */}
                  <div className="uploader-demo-reports" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.25rem 0', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)' }}>
                        Quick Start Demo Reports
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--DarkGray)', margin: 0 }}>
                        Explore the workspace immediately with one of our preloaded mock cost sheets:
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
                      <div 
                        className="clickable-row" 
                        onClick={() => handleLoadSample('PEMT Data 7-1-24 - 6-30-25.xlsx', 'PEMT Data')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          background: 'var(--ExtraLightGray)',
                          border: '1.5px solid var(--LightGray)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ color: 'var(--BannerGB)', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--LightGray)' }}>
                            <Database size={18} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>Alachua County PEMT Data</strong>
                            <span style={{ fontSize: '0.725rem', color: 'var(--DarkGray)' }}>PEMT volumes, transport fees, & supplemental funding totals</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem', textTransform: 'none' }}>Excel sheet</span>
                          <ChevronRight size={16} style={{ color: 'var(--DarkGray)' }} />
                        </div>
                      </div>

                      <div 
                        className="clickable-row" 
                        onClick={() => handleLoadSample('Personnel Hours and Pay.xlsx', 'Personnel Hours')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          background: 'var(--ExtraLightGray)',
                          border: '1.5px solid var(--LightGray)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ color: 'var(--BannerGB)', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--LightGray)' }}>
                            <Database size={18} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>Personnel Hours and Pay Details</strong>
                            <span style={{ fontSize: '0.725rem', color: 'var(--DarkGray)' }}>FTE counts, base pay, and overtime expenditures by job title</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem', textTransform: 'none' }}>Excel sheet</span>
                          <ChevronRight size={16} style={{ color: 'var(--DarkGray)' }} />
                        </div>
                      </div>

                      <div 
                        className="clickable-row" 
                        onClick={() => handleLoadSample('Emergency Room Arrival Time.csv', 'Arrival Time')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          background: 'var(--ExtraLightGray)',
                          border: '1.5px solid var(--LightGray)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ color: 'var(--BannerGB)', background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--LightGray)' }}>
                            <Database size={18} />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>Dispatch Response Time Logs</strong>
                            <span style={{ fontSize: '0.725rem', color: 'var(--DarkGray)' }}>CAD response times, transit durations, & incident scene benchmarks</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-cyan" style={{ fontSize: '0.65rem', textTransform: 'none' }}>CSV data</span>
                          <ChevronRight size={16} style={{ color: 'var(--DarkGray)' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        ) : (
          /* ==========================================
             ACTIVE ANALYSIS WORKSPACE (MAXIMIZED FOR DATA VIS)
             ========================================== */
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              height: '100%', 
              width: '100%',
              padding: '1rem 1.5rem', 
              gap: '0', 
              overflow: 'hidden',
              background: 'var(--DashboardBG)',
              boxSizing: 'border-box'
            }}
          >
            {/* Left Column - Collapsible Drawer (Settings & Data Explorer) */}
            <div 
              className="sidebar-panel left-sidebar-panel" 
              style={{ 
                width: isLeftPanelCollapsed ? '0px' : '460px',
                opacity: isLeftPanelCollapsed ? 0 : 1,
                pointerEvents: isLeftPanelCollapsed ? 'none' : 'auto',
                transform: isLeftPanelCollapsed ? 'translateX(-100%)' : 'translateX(0)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                marginRight: isLeftPanelCollapsed ? '0' : '1.25rem',
                border: isLeftPanelCollapsed ? 'none' : undefined,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                flexShrink: 0
              }}
            >
              {/* Inner wrapper to enforce width and enable independent vertical scrolling */}
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%', 
                  width: '460px', 
                  minWidth: '460px', 
                  padding: '1.25rem', 
                  gap: '1.25rem', 
                  overflowY: 'auto',
                  boxSizing: 'border-box'
                }}
              >
                {/* Drawer Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid var(--LightGray)', paddingBottom: '0.75rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sliders size={18} style={{ color: 'var(--BannerGB)' }} />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontWeight: 'bold' }}>
                      Dashboard Controls
                    </h3>
                  </div>
                  <button 
                    className="btn btn-ghost" 
                    style={{ padding: '0.25rem', borderRadius: '4px' }}
                    onClick={() => setIsLeftPanelCollapsed(true)}
                    title="Collapse Panel"
                  >
                    <ChevronLeft size={18} style={{ color: 'var(--DarkGray)' }} />
                  </button>
                </div>

                {/* 1. Global Sheet Selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Database size={14} style={{ color: 'var(--BannerGB)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Worksheets</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {workbookData.sheets.map(sheet => (
                      <button
                        key={sheet.name}
                        className="btn"
                        style={{
                          padding: '0.3rem 0.6rem',
                          fontSize: '0.75rem',
                          borderRadius: '4px',
                          background: activeSheetName === sheet.name ? 'var(--LabelBG)' : 'white',
                          color: activeSheetName === sheet.name ? 'white' : 'var(--DarkGray)',
                          border: activeSheetName === sheet.name ? 'none' : '1px solid var(--LightGray)',
                          fontWeight: activeSheetName === sheet.name ? 'bold' : 'normal',
                          boxShadow: activeSheetName === sheet.name ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                        }}
                        onClick={() => handleSheetChange(sheet.name)}
                      >
                        {sheet.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Interactive Dashboard Filters */}
                {activeSheet && filterableColumns.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <SlidersHorizontal size={14} style={{ color: 'var(--BannerGB)' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Dashboard Filters
                        </span>
                      </div>
                      {Object.keys(activeFilters).length > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: '0px 4px', fontSize: '0.65rem', color: 'var(--BannerGB)', fontWeight: 'bold', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          onClick={() => setActiveFilters({})}
                        >
                          Reset All
                        </button>
                      )}
                    </div>
                    <div 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        border: '1px solid var(--border-light)', 
                        borderRadius: '10px', 
                        padding: '1rem', 
                        background: 'white',
                        boxShadow: 'var(--shadow-sm)',
                        gap: '0.85rem'
                      }}
                    >
                      {filterableColumns.map((col, idx) => {
                        const selectedValues = activeFilters[col.name] || [];
                        
                        return (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--LabelBG)', textTransform: 'capitalize' }}>
                              {col.name}
                            </span>
                            
                            {col.values.length <= 5 ? (
                              /* Pill list multi-selector */
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                {col.values.map(val => {
                                  const isSel = selectedValues.includes(val);
                                  return (
                                    <button
                                      key={val}
                                      type="button"
                                      style={{
                                        padding: '0.25rem 0.5rem',
                                        fontSize: '0.65rem',
                                        borderRadius: '20px',
                                        background: isSel ? 'var(--LabelBG)' : 'var(--ExtraLightGray)',
                                        color: isSel ? 'white' : 'var(--DarkGray)',
                                        border: isSel ? 'none' : '1px solid var(--LightGray)',
                                        cursor: 'pointer',
                                        fontWeight: isSel ? 'bold' : 'normal',
                                        transition: 'all 0.15s ease'
                                      }}
                                      onClick={() => handleToggleFilterVal(col.name, val)}
                                    >
                                      {val}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Dropdown single-selector */
                              <select
                                className="filter-select"
                                style={{
                                  width: '100%',
                                  padding: '0.35rem 0.5rem',
                                  fontSize: '0.75rem',
                                  borderRadius: '6px',
                                  border: '1px solid var(--LightGray)',
                                  background: selectedValues.length > 0 ? 'var(--ExtraLightGray)' : 'white',
                                  color: 'var(--LabelBG)',
                                  fontWeight: selectedValues.length > 0 ? 'bold' : 'normal'
                                }}
                                value={selectedValues[0] || 'ALL_VALUES'}
                                onChange={(e) => handleSetSingleFilterVal(col.name, e.target.value)}
                              >
                                <option value="ALL_VALUES">-- All {col.name}s --</option>
                                {col.values.map(val => (
                                  <option key={val} value={val}>{val}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Toggle Active Dashboard Charts Checklist */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active Visualizations ({selectedChartTitles.length}/{availableCharts.length})
                  </span>
                  <div 
                    style={{ 
                      maxHeight: '160px', 
                      overflowY: 'auto', 
                      border: '1px solid var(--LightGray)', 
                      borderRadius: '8px', 
                      padding: '0.75rem', 
                      background: 'white',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem'
                    }}
                  >
                    {availableCharts.map((chart, idx) => {
                      const isChecked = selectedChartTitles.includes(chart.title);
                      return (
                        <label 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            fontSize: '0.75rem',
                            color: 'var(--LabelBG)',
                            cursor: 'pointer',
                            padding: '0.15rem 0',
                            userSelect: 'none'
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
                              
                              if (nextTitles.length > 0) {
                                if (carouselIndex >= nextTitles.length) {
                                  setCarouselIndex(nextTitles.length - 1);
                                }
                                if (!nextTitles.includes(activeChartTab)) {
                                  setActiveChartTab(nextTitles[0]);
                                }
                              }
                            }}
                          />
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={chart.title}>
                            {chart.title}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Add Custom Chart Builder Form */}
                <div style={{ borderTop: '1.5px dashed var(--LightGray)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Add New Dynamic Visualization
                  </span>
                  <form onSubmit={handleCreateCustomChart} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Chart Title</span>
                      <input 
                        type="text"
                        className="form-input"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                        placeholder="e.g. Overtime Total"
                        value={customTitle}
                        onChange={e => setCustomTitle(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Type</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          value={customChartType}
                          onChange={e => {
                            const val = e.target.value as any;
                            setCustomChartType(val);
                            if (val === 'scatter' || val === 'bubble' || val === 'box' || val === 'radar') {
                              setCustomAggregation('none');
                            } else {
                              setCustomAggregation('sum');
                            }
                          }}
                        >
                          <option value="bar">Vertical Bar</option>
                          <option value="horizontalBar">Horizontal Bar</option>
                          <option value="line">Line</option>
                          <option value="pie">Pie</option>
                          <option value="scatter">Scatter</option>
                          <option value="bubble">Bubble</option>
                          <option value="radar">Radar (Spider)</option>
                          <option value="box">Box Plot (Distribution)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Rollup</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          value={customAggregation}
                          onChange={e => setCustomAggregation(e.target.value as any)}
                        >
                          <option value="sum">Sum</option>
                          <option value="avg">Average</option>
                          <option value="count">Count</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>X-Axis</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
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

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Y-Axis</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
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
                    </div>

                    {customChartType === 'bubble' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>Z-Axis (Bubble Size)</span>
                        <select 
                          className="filter-select" 
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
                          value={customZ}
                          onChange={e => setCustomZ(e.target.value)}
                          required
                        >
                          <option value="">-- Select --</option>
                          {activeSheet?.columns.filter(c => c.type === 'number').map((c, i) => (
                            <option key={i} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button 
                      type="submit"
                      className="btn btn-primary" 
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', marginTop: '0.25rem' }}
                    >
                      + Add Custom Chart
                    </button>
                  </form>
                </div>

                {/* 4.5 Color Palette Theme Toggle */}
                <div style={{ borderTop: '1.5px dashed var(--LightGray)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Dashboard Palette
                  </span>
                  <div style={{ display: 'flex', background: 'var(--ExtraLightGray)', borderRadius: '6px', padding: '3px', border: '1px solid var(--LightGray)' }}>
                    <button 
                      type="button"
                      className="btn" 
                      style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: colorTheme === 'classic' ? 'white' : 'transparent', color: colorTheme === 'classic' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: colorTheme === 'classic' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: colorTheme === 'classic' ? 'bold' : 'normal' }}
                      onClick={() => setColorTheme('classic')}
                    >
                      Classic PCG Blue
                    </button>
                    <button 
                      type="button"
                      className="btn" 
                      style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: colorTheme === 'vibrant' ? 'white' : 'transparent', color: colorTheme === 'vibrant' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: colorTheme === 'vibrant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: colorTheme === 'vibrant' ? 'bold' : 'normal' }}
                      onClick={() => setColorTheme('vibrant')}
                    >
                      Vibrant Domain
                    </button>
                  </div>
                </div>

                {/* 5. Presentation Controls & PDF Action */}
                <div style={{ borderTop: '1.5px dashed var(--LightGray)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto', flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Presentation Layout
                    </span>
                    <div style={{ display: 'flex', background: 'var(--ExtraLightGray)', borderRadius: '6px', padding: '3px', border: '1px solid var(--LightGray)' }}>
                      <button 
                        className="btn" 
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: layoutMode === 'grid' ? 'white' : 'transparent', color: layoutMode === 'grid' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: layoutMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: layoutMode === 'grid' ? 'bold' : 'normal' }}
                        onClick={() => setLayoutMode('grid')}
                      >
                        Grid
                      </button>
                      <button 
                        className="btn" 
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: layoutMode === 'carousel' ? 'white' : 'transparent', color: layoutMode === 'carousel' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: layoutMode === 'carousel' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: layoutMode === 'carousel' ? 'bold' : 'normal' }}
                        onClick={() => setLayoutMode('carousel')}
                      >
                        Carousel
                      </button>
                      <button 
                        className="btn" 
                        style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', background: layoutMode === 'tabbed' ? 'white' : 'transparent', color: layoutMode === 'tabbed' ? 'var(--LabelBG)' : 'var(--DarkGray)', border: 'none', boxShadow: layoutMode === 'tabbed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: layoutMode === 'tabbed' ? 'bold' : 'normal' }}
                        onClick={() => setLayoutMode('tabbed')}
                      >
                        Tabs
                      </button>
                    </div>
                  </div>

                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', borderRadius: '6px' }}
                    onClick={handleExportPDF}
                  >
                    <Printer size={14} /> Export landscape PDF Report
                  </button>
                </div>

              </div>
            </div>

            {/* Center Column - Large visual dashboard (spacious canvas, borderless float style) */}
            <div 
              className="dashboard-canvas-panel" 
              style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden', 
                gap: '1rem', 
                minHeight: 0 
              }}
            >
              {/* Canvas Header */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  borderBottom: '1.5px solid var(--LightGray)', 
                  paddingBottom: '0.75rem',
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {isLeftPanelCollapsed && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderRadius: '6px', marginRight: '0.5rem' }}
                      onClick={() => setIsLeftPanelCollapsed(false)}
                      title="Open Control Panel"
                    >
                      <Sliders size={14} /> Control & Data Panel
                    </button>
                  )}

                  {/* Top Level Nav Tab switcher */}
                  <div style={{ display: 'flex', background: 'var(--ExtraLightGray)', border: '1px solid var(--LightGray)', borderRadius: '8px', padding: '3px', gap: '3px' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.775rem',
                        borderRadius: '6px',
                        background: activeWorkspaceTab === 'dashboard' ? 'var(--LabelBG)' : 'transparent',
                        color: activeWorkspaceTab === 'dashboard' ? 'white' : 'var(--DarkGray)',
                        border: 'none',
                        fontWeight: activeWorkspaceTab === 'dashboard' ? 'bold' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: activeWorkspaceTab === 'dashboard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setActiveWorkspaceTab('dashboard')}
                    >
                      <BarChart2 size={14} /> Executive Dashboard
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.775rem',
                        borderRadius: '6px',
                        background: activeWorkspaceTab === 'spreadsheet' ? 'var(--LabelBG)' : 'transparent',
                        color: activeWorkspaceTab === 'spreadsheet' ? 'white' : 'var(--DarkGray)',
                        border: 'none',
                        fontWeight: activeWorkspaceTab === 'spreadsheet' ? 'bold' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: activeWorkspaceTab === 'spreadsheet' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setActiveWorkspaceTab('spreadsheet')}
                    >
                      <FileSpreadsheet size={14} /> Spreadsheet Data
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.775rem',
                        borderRadius: '6px',
                        background: activeWorkspaceTab === 'methodology' ? 'var(--LabelBG)' : 'transparent',
                        color: activeWorkspaceTab === 'methodology' ? 'white' : 'var(--DarkGray)',
                        border: 'none',
                        fontWeight: activeWorkspaceTab === 'methodology' ? 'bold' : '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: activeWorkspaceTab === 'methodology' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={() => setActiveWorkspaceTab('methodology')}
                    >
                      <TrendingUp size={14} /> Methodology & Calculations
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional Content Rendering */}
              {activeWorkspaceTab === 'dashboard' && (
                /* Canvas Scrollable Content for Dashboard Visualizations */
                <div 
                  style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1.25rem', 
                    paddingRight: '0.5rem' 
                  }}
                >
                  {/* Executive Summary Card (Collapsible, Floating Card) */}
                  {latestInsights.length > 0 && (
                    <div style={{ background: 'var(--WidgetBG)', border: '1.5px solid rgba(0,82,189,0.12)', borderLeft: '4px solid var(--BannerGB)', padding: '1.25rem', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' }}>
                      <div 
                        onClick={() => setIsInsightsCollapsed(!isInsightsCollapsed)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <TrendingUp size={16} style={{ color: 'var(--BannerGB)' }} />
                          <strong style={{ fontSize: '0.9rem', color: 'var(--LabelBG)' }}>Analysis Insights Summary</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--BannerGB)', fontWeight: 'bold', fontSize: '0.75rem' }}>
                          <span>{isInsightsCollapsed ? 'Expand' : 'Collapse'}</span>
                          {isInsightsCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </div>
                      </div>
                      
                      {!isInsightsCollapsed && (
                        <ul style={{ margin: '0.75rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--HeaderText)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {latestInsights.map((insight, idx) => (
                            <li key={idx} dangerouslySetInnerHTML={{ __html: inlineMarkdown(insight) }} />
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* KPI Statistics Row (Floating white cards with left border accents) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div 
                      style={{ 
                        border: '1px solid var(--border-light)', 
                        borderLeft: colorTheme === 'classic' ? '1px solid var(--border-light)' : '4px solid #0052BD',
                        background: colorTheme === 'classic' ? 'white' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
                        borderRadius: '10px', 
                        padding: '1rem', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.25rem',
                        boxShadow: 'var(--shadow-sm)' 
                      }}
                    >
                      <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Records</span>
                      <span style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>
                        {filteredRows.length.toLocaleString()} {filteredRows.length === activeSheet?.rows.length ? 'rows' : 'filtered'}
                      </span>
                    </div>
                    {activeSheet?.columns.filter(c => c.type === 'number').slice(0, 3).map((col, idx) => {
                      const avg = getFilteredAverage(col.name);
                      // Dynamic harmonic palettes: Emerald Green, Indigo Purple, Amber Gold
                      const isClassic = colorTheme === 'classic';
                      const cardThemes = isClassic 
                        ? Array(3).fill({ bg: 'white', border: '1px solid var(--border-light)' })
                        : [
                            { bg: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', border: '4px solid #10b981' },
                            { bg: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)', border: '4px solid #6366f1' },
                            { bg: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)', border: '4px solid #f59e0b' }
                          ];
                      const theme = cardThemes[idx % cardThemes.length];
                      
                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            border: '1px solid var(--border-light)', 
                            borderLeft: theme.border,
                            background: theme.bg, 
                            borderRadius: '10px', 
                            padding: '1rem', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '0.25rem',
                            boxShadow: 'var(--shadow-sm)' 
                          }}
                        >
                          <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--DarkGray)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg {col.name}</span>
                          <span style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>
                            {avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Visualizations Area */}
                  {chartsToRender.length === 0 ? (
                    <div style={{ background: 'white', border: '1.5px dashed var(--LightGray)', borderRadius: '10px', padding: '4rem 1rem', textAlign: 'center', color: 'var(--DarkGray)', fontSize: '0.85rem' }}>
                      {availableCharts.length === 0 
                        ? (isLoading ? 'AI Copilot is auditing spreadsheet and designing dashboard charts...' : 'Upload data to begin.') 
                        : 'No charts active. Select configurations in the Dashboard Control Panel to populate this section.'}
                    </div>
                  ) : (
                    <div style={{ width: '100%' }}>
                      {/* ==========================================
                         PRESENTATION MODE: GRID (Dynamic Tile Layout)
                         ========================================== */}
                      {layoutMode === 'grid' && renderGroupedGrid(chartsToRender)}

                      {/* ==========================================
                         PRESENTATION MODE: CAROUSEL (Slider Frame)
                         ========================================== */}
                      {layoutMode === 'carousel' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                          <div className="carousel-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                            <button 
                              type="button"
                              className="btn btn-secondary" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => setCarouselIndex(prev => (prev > 0 ? prev - 1 : chartsToRender.length - 1))}
                            >
                              <ChevronLeft size={14} /> Prev
                            </button>
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--LabelBG)' }}>
                              Chart {carouselIndex + 1} of {chartsToRender.length} • {chartsToRender[carouselIndex]?.title}
                            </span>
                            <button 
                              type="button"
                              className="btn btn-secondary" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => setCarouselIndex(prev => (prev < chartsToRender.length - 1 ? prev + 1 : 0))}
                            >
                              Next <ChevronRight size={14} />
                            </button>
                          </div>
                          {chartsToRender[carouselIndex] && (
                            <div className="dashboard-section-card" style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.25rem', boxShadow: 'var(--shadow-md)' }}>
                              <InsightChart
                                chartSpec={chartsToRender[carouselIndex]}
                                rows={filteredRows}
                                borderless={true}
                                height="400px"
                                colorTheme={colorTheme}
                              />
                            </div>
                          )}
                          
                          {/* Print Fallback (Always prints all grids grouped) */}
                          <div style={{ display: 'none' }} className="print-fallback-only">
                            {renderGroupedGrid(chartsToRender)}
                          </div>
                        </div>
                      )}

                      {/* ==========================================
                         PRESENTATION MODE: TABS (Selector Row)
                         ========================================== */}
                      {layoutMode === 'tabbed' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                          <div className="tabs-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', borderBottom: '1.5px solid var(--LightGray)', paddingBottom: '0.5rem' }}>
                            {chartsToRender.map((chart, idx) => (
                              <button
                                type="button"
                                key={idx}
                                className="btn"
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.75rem',
                                  borderRadius: '6px',
                                  background: activeChartTab === chart.title ? 'var(--LabelBG)' : 'white',
                                  color: activeChartTab === chart.title ? 'white' : 'var(--DarkGray)',
                                  border: activeChartTab === chart.title ? 'none' : '1px solid var(--LightGray)',
                                  fontWeight: activeChartTab === chart.title ? 'bold' : 'normal',
                                  boxShadow: activeChartTab === chart.title ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                                }}
                                onClick={() => setActiveChartTab(chart.title)}
                              >
                                {chart.title}
                              </button>
                            ))}
                          </div>
                          {chartsToRender.find(c => c.title === activeChartTab) && (
                            <div className="dashboard-section-card" style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.25rem', boxShadow: 'var(--shadow-md)' }}>
                              <InsightChart
                                chartSpec={chartsToRender.find(c => c.title === activeChartTab)!}
                                rows={filteredRows}
                                borderless={true}
                                height="400px"
                                colorTheme={colorTheme}
                              />
                            </div>
                          )}

                          {/* Print Fallback (Always prints all grids grouped) */}
                          <div style={{ display: 'none' }} className="print-fallback-only">
                            {renderGroupedGrid(chartsToRender)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeWorkspaceTab === 'spreadsheet' && (
                /* Spreadsheet Data Tab (Full screen data explorer, not scrunched) */
                <div 
                  style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minHeight: 0, 
                    background: 'white', 
                    borderRadius: '12px', 
                    padding: '1.25rem', 
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <DataPreview
                    workbookData={workbookData}
                    activeSheetName={activeSheetName}
                    onSheetChange={handleSheetChange}
                  />
                </div>
              )}

              {activeWorkspaceTab === 'methodology' && (
                /* Methodology & Calculation Framework Tab */
                <div 
                  style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1.25rem', 
                    paddingRight: '0.5rem' 
                  }}
                >
                  {/* Methodology Intro Card */}
                  <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      🧠 Methodology and Analytical Framework
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--DarkGray)', lineHeight: '1.5' }}>
                      This page details the underlying formulas, data models, and rollup aggregations used to generate the charts, metrics, and insights on the Executive Dashboard.
                    </p>
                  </div>

                  {/* Methodology Sub-Tabs Navigation */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--LightGray)', paddingBottom: '0.75rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        borderRadius: '20px',
                        background: activeMethodologySubTab === 'pemt' ? 'var(--LabelBG)' : 'white',
                        color: activeMethodologySubTab === 'pemt' ? 'white' : 'var(--DarkGray)',
                        border: activeMethodologySubTab === 'pemt' ? 'none' : '1px solid var(--LightGray)',
                        fontWeight: activeMethodologySubTab === 'pemt' ? 'bold' : 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: activeMethodologySubTab === 'pemt' ? 'var(--shadow-sm)' : 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => setActiveMethodologySubTab('pemt')}
                    >
                      <DollarSign size={14} /> PEMT Supplemental Reimbursement
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        borderRadius: '20px',
                        background: activeMethodologySubTab === 'fte' ? 'var(--LabelBG)' : 'white',
                        color: activeMethodologySubTab === 'fte' ? 'white' : 'var(--DarkGray)',
                        border: activeMethodologySubTab === 'fte' ? 'none' : '1px solid var(--LightGray)',
                        fontWeight: activeMethodologySubTab === 'fte' ? 'bold' : 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: activeMethodologySubTab === 'fte' ? 'var(--shadow-sm)' : 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => setActiveMethodologySubTab('fte')}
                    >
                      <Users size={14} /> Personnel Hours & FTEs
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        borderRadius: '20px',
                        background: activeMethodologySubTab === 'cad' ? 'var(--LabelBG)' : 'white',
                        color: activeMethodologySubTab === 'cad' ? 'white' : 'var(--DarkGray)',
                        border: activeMethodologySubTab === 'cad' ? 'none' : '1px solid var(--LightGray)',
                        fontWeight: activeMethodologySubTab === 'cad' ? 'bold' : 'normal',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: activeMethodologySubTab === 'cad' ? 'var(--shadow-sm)' : 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => setActiveMethodologySubTab('cad')}
                    >
                      <Clock size={14} /> CAD Dispatch Time Benchmarks
                    </button>
                  </div>

                  {/* Active Sub-Tab content */}
                  {activeMethodologySubTab === 'pemt' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          💰 PEMT Supplemental Reimbursement Calculations
                        </h4>
                        <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.825rem', color: 'var(--DarkGray)', lineHeight: '1.5' }}>
                          The Public Emergency Medical Transportation (PEMT) program provides supplemental funding to eligible providers for emergency ground transport services. The calculation models the deficit between allowable costs and baseline revenues.
                        </p>

                        {/* Equation layout */}
                        <div className="math-container">
                          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--DarkGray)', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>Operational Equation</div>
                          <div className="math-equation">
                            <span className="math-variable">Reimbursement</span>
                            <span className="math-operator">=</span>
                            <span className="math-operator">(</span>
                            <span className="math-variable">Total Run Volume</span>
                            <span className="math-operator">×</span>
                            <span className="math-variable">Avg Cost Per Transport</span>
                            <span className="math-operator">)</span>
                            <span className="math-operator">−</span>
                            <span className="math-variable">Net Baseline Revenues</span>
                          </div>
                        </div>

                        {/* Interactive Example walkthrough */}
                        <div style={{ border: '1px solid rgba(0, 82, 189, 0.15)', background: 'rgba(0, 82, 189, 0.02)', borderRadius: '10px', padding: '1.25rem', margin: '1.25rem 0' }}>
                          <h5 style={{ margin: '0 0 0.6rem 0', color: 'var(--LabelBG)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}>
                            <ShieldCheck size={15} style={{ color: 'var(--BannerGB)' }} /> Illustrative Rollup Calculation Example
                          </h5>
                          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--DarkGray)' }}>
                            Assume the following variables are parsed from an uploaded cost workbook sheet:
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>RUN VOLUME</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>1,450 transports</strong>
                            </div>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>AVG COST PER RUN</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>$850.00</strong>
                            </div>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>NET REVENUES</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>$650,000.00</strong>
                            </div>
                          </div>
                          <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(0, 82, 189, 0.12)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <div>1. <strong>Total Allowable Cost</strong>: <code style={{ background: 'var(--ExtraLightGray)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>1,450 runs × $850 = $1,232,500</code></div>
                            <div>2. <strong>Supplemental Funding</strong>: <code style={{ background: 'var(--ExtraLightGray)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>$1,232,500 − $650,000 = $582,500</code></div>
                            <div style={{ color: 'var(--BannerGB)', fontWeight: 'bold', borderTop: '1px dashed var(--LightGray)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                              Net supplemental claim value: $582,500.00
                            </div>
                          </div>
                        </div>

                        {/* Parameter Mapping Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid var(--LightGray)', marginTop: '1.25rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--ExtraLightGray)', borderBottom: '1.5px solid var(--LightGray)' }}>
                              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 'bold' }}>Parameter</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 'bold' }}>Source Column</th>
                              <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 'bold' }}>Analytical Meaning</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid var(--LightGray)' }}>
                              <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 'bold' }}>Run Volume</td>
                              <td style={{ padding: '0.5rem', color: 'var(--DarkGray)' }}>Month / Count / Transports</td>
                              <td style={{ padding: '0.5rem' }}>Total emergency ground medical transports.</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--LightGray)' }}>
                              <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 'bold' }}>Avg Cost</td>
                              <td style={{ padding: '0.5rem', color: 'var(--DarkGray)' }}>Avg Cost Per Transport</td>
                              <td style={{ padding: '0.5rem' }}>Sum of allowable expenses divided by total runs.</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 'bold' }}>Net Revenues</td>
                              <td style={{ padding: '0.5rem', color: 'var(--DarkGray)' }}>Total Revenue / Net Receipts</td>
                              <td style={{ padding: '0.5rem' }}>Total payments received for emergency runs.</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeMethodologySubTab === 'fte' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          👥 Personnel Hours & Full-Time Equivalent (FTE) Calculations
                        </h4>
                        <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.825rem', color: 'var(--DarkGray)', lineHeight: '1.5' }}>
                          Labor analytics convert actual paid personnel hours into standardized FTEs to review resource distributions, analyze shift coverages, and calculate weighted average pay rates.
                        </p>

                        <div className="math-container" style={{ gap: '1.25rem' }}>
                          {/* FTE Equation */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', width: '100%' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--DarkGray)', fontWeight: 'bold', letterSpacing: '0.05em' }}>FTE Allocation</div>
                            <div className="math-equation">
                              <span className="math-variable">Allocated FTE</span>
                              <span className="math-operator">=</span>
                              <div className="math-fraction">
                                <span className="math-numerator">Total Hours Worked</span>
                                <span className="math-denominator">2,080 Hours (Annual Standard)</span>
                              </div>
                              <span className="math-operator">×</span>
                              <div className="math-fraction">
                                <span className="math-numerator">Active Months</span>
                                <span className="math-denominator">12 Months</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ width: '80%', height: '1px', background: 'var(--LightGray)' }}></div>

                          {/* Regular Hourly Rate Equation */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', width: '100%' }}>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--DarkGray)', fontWeight: 'bold', letterSpacing: '0.05em' }}>Weighted Regular Pay Rate</div>
                            <div className="math-equation">
                              <span className="math-variable">Regular Hourly Rate</span>
                              <span className="math-operator">=</span>
                              <div className="math-fraction">
                                <span className="math-numerator">Base Regular Pay ($)</span>
                                <span className="math-denominator">Regular Hours Worked</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Example walkthrough */}
                        <div style={{ border: '1px solid rgba(0, 82, 189, 0.15)', background: 'rgba(0, 82, 189, 0.02)', borderRadius: '10px', padding: '1.25rem', margin: '1.25rem 0' }}>
                          <h5 style={{ margin: '0 0 0.6rem 0', color: 'var(--LabelBG)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 'bold' }}>
                            <ShieldCheck size={15} style={{ color: 'var(--BannerGB)' }} /> Illustrative Personnel Calculation Example
                          </h5>
                          <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.75rem', color: 'var(--DarkGray)' }}>
                            Assume a full-time paramedic works additional overtime shifts during a 12-month period:
                          </p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>REGULAR HOURS</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>2,080 hours</strong>
                            </div>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>OVERTIME HOURS</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>520 hours</strong>
                            </div>
                            <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--LightGray)' }}>
                              <div style={{ fontSize: '0.6rem', color: 'var(--DarkGray)', fontWeight: 'bold', textTransform: 'uppercase' }}>TOTAL PAY (REG + OT)</div>
                              <strong style={{ fontSize: '0.85rem', color: 'var(--LabelBG)' }}>$85,800.00</strong>
                            </div>
                          </div>
                          <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(0, 82, 189, 0.12)', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <div>1. <strong>FTE Count</strong>: <code style={{ background: 'var(--ExtraLightGray)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>(2,080 + 520) / 2,080 = 1.25 FTEs</code></div>
                            <div>2. <strong>Weighted Average Hourly Rate</strong>: <code style={{ background: 'var(--ExtraLightGray)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>$85,800 total pay / 2,600 total hours = $33.00/hour</code></div>
                            <div style={{ color: 'var(--BannerGB)', fontWeight: 'bold', borderTop: '1px dashed var(--LightGray)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                              Net employee resource value: 1.25 FTEs @ $33.00/hr
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeMethodologySubTab === 'cad' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ background: 'white', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--LabelBG)', fontFamily: 'var(--font-display)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          🚑 Dispatch CAD Response Time Benchmarks
                        </h4>
                        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.825rem', color: 'var(--DarkGray)', lineHeight: '1.5' }}>
                          Computer Aided Dispatch (CAD) log systems record timestamps for key response phase transitions. Averages help verify contract compliance and triage service-level bottlenecks.
                        </p>

                        {/* Horizontal Flowchart */}
                        <div style={{ background: 'white', border: '1px solid var(--LightGray)', borderRadius: '10px', padding: '1rem', margin: '1.5rem 0' }}>
                          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--DarkGray)', fontWeight: 'bold', letterSpacing: '0.05em', textAlign: 'center', marginBottom: '0.5rem' }}>
                            Dispatch Lifecycle & Interval Mapping
                          </div>
                          
                          <div className="dispatch-timeline">
                            <div className="dispatch-milestone">
                              <div className="dispatch-dot" style={{ background: '#64748b' }}></div>
                              <span className="dispatch-label">Call Created</span>
                            </div>

                            <div className="dispatch-milestone">
                              <div className="dispatch-dot"></div>
                              <span className="dispatch-label">Dispatched</span>
                              <div className="dispatch-interval" style={{ left: '50%', transform: 'translateX(-50%)' }}>Dispatch Delay</div>
                            </div>

                            <div className="dispatch-milestone">
                              <div className="dispatch-dot"></div>
                              <span className="dispatch-label">En Route</span>
                              <div className="dispatch-interval" style={{ left: '50%', transform: 'translateX(-50%)' }}>Turnout/Chute</div>
                            </div>

                            <div className="dispatch-milestone">
                              <div className="dispatch-dot"></div>
                              <span className="dispatch-label">Arrived Scene</span>
                              <div className="dispatch-interval" style={{ left: '50%', transform: 'translateX(-50%)' }}>Transit Time</div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'center', fontSize: '0.725rem', color: 'var(--BannerGB)', fontWeight: 'bold', marginTop: '1.25rem', background: 'rgba(0, 82, 189, 0.04)', padding: '0.45rem', borderRadius: '6px', border: '1px dashed rgba(0, 82, 189, 0.15)' }}>
                            Total CAD Response Time = Scene Arrival Time − Call Created Time
                          </div>
                        </div>

                        {/* Operational calculation card list */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
                          <div style={{ background: 'var(--ExtraLightGray)', border: '1px solid var(--LightGray)', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <strong style={{ fontSize: '0.75rem', color: 'var(--LabelBG)' }}>Chute / Turnout Duration</strong>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                              Measures how quickly emergency personnel leave the station once dispatched.
                            </p>
                            <code style={{ background: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid var(--LightGray)', marginTop: '0.35rem', display: 'inline-block', width: 'fit-content' }}>
                              En Route − Dispatched
                            </code>
                          </div>
                          
                          <div style={{ background: 'var(--ExtraLightGray)', border: '1px solid var(--LightGray)', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <strong style={{ fontSize: '0.75rem', color: 'var(--LabelBG)' }}>Transit Duration</strong>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                              Measures direct driving time to the scene of the emergency.
                            </p>
                            <code style={{ background: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid var(--LightGray)', marginTop: '0.35rem', display: 'inline-block', width: 'fit-content' }}>
                              Arrived Scene − En Route
                            </code>
                          </div>

                          <div style={{ background: 'var(--ExtraLightGray)', border: '1px solid var(--LightGray)', borderRadius: '8px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <strong style={{ fontSize: '0.75rem', color: 'var(--LabelBG)' }}>On-Scene Duration</strong>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--DarkGray)', lineHeight: '1.4' }}>
                              Measures the total care and preparation time spent at the incident site.
                            </p>
                            <code style={{ background: 'white', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid var(--LightGray)', marginTop: '0.35rem', display: 'inline-block', width: 'fit-content' }}>
                              Depart Scene − Arrived Scene
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Chat Assistant Drawer (420px fixed) */}
            {!isChatCollapsed && (
              <div 
                className="sidebar-panel" 
                style={{ 
                  width: '420px', 
                  flexShrink: 0, 
                  marginLeft: '1.25rem',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
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
