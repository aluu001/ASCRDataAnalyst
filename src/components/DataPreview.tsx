import React, { useState } from 'react';
import { Database, Hash, Calendar, ToggleLeft, Type as LetterText, ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorkbookData } from '../utils/dataEngine';

interface DataPreviewProps {
  workbookData: WorkbookData;
  activeSheetName: string;
  onSheetChange: (name: string) => void;
  compact?: boolean;
}

export const DataPreview: React.FC<DataPreviewProps> = ({
  workbookData,
  activeSheetName,
  onSheetChange,
  compact = false
}) => {
  const [viewMode, setViewMode] = useState<'preview' | 'schema'>('preview');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const activeSheet = workbookData.sheets.find(s => s.name === activeSheetName) || workbookData.sheets[0];

  if (!activeSheet) return null;

  const totalPages = Math.ceil(activeSheet.rows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = activeSheet.rows.slice(startIndex, startIndex + rowsPerPage);

  const getColumnIcon = (type: string) => {
    switch (type) {
      case 'number':
        return <Hash size={12} />;
      case 'date':
        return <Calendar size={12} />;
      case 'boolean':
        return <ToggleLeft size={12} />;
      default:
        return <LetterText size={12} />;
    }
  };

  const handlePageChange = (direction: 'next' | 'prev') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <div className={compact ? "" : "glass-card"} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: compact ? '0' : undefined, border: compact ? 'none' : undefined, background: compact ? 'transparent' : undefined, boxShadow: compact ? 'none' : undefined }}>
      {/* Sheet Tabs */}
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={18} style={{ color: 'hsl(var(--primary))' }} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>Workbook Sheets</h3>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {workbookData.sheets.map(sheet => (
              <button
                key={sheet.name}
                className={`btn ${activeSheetName === sheet.name ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => {
                  onSheetChange(sheet.name);
                  setCurrentPage(1); // Reset page
                }}
              >
                {sheet.name}
                <span style={{ opacity: 0.6, fontSize: '0.75rem', marginLeft: '0.25rem' }}>({sheet.rowCount} rows)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: compact ? '0.5rem' : '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontSize: compact ? '0.725rem' : '0.85rem', color: 'hsl(var(--text-secondary))' }}>
          {compact ? (
            <span>Sheet: <strong>{activeSheet.name}</strong> • {activeSheet.rowCount} rows</span>
          ) : (
            <span>Showing sheet <strong>{activeSheet.name}</strong> • {activeSheet.rowCount} rows × {activeSheet.columns.length} columns</span>
          )}
        </span>

        <div style={{ display: 'flex', gap: '0.25rem', background: 'hsl(var(--bg-input))', padding: '0.15rem', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
          <button
            className={`btn ${viewMode === 'preview' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: compact ? '0.2rem 0.5rem' : '0.3rem 0.75rem', fontSize: compact ? '0.7rem' : '0.75rem', borderRadius: '4px' }}
            onClick={() => setViewMode('preview')}
          >
            {compact ? 'Data' : 'Data Preview'}
          </button>
          <button
            className={`btn ${viewMode === 'schema' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: compact ? '0.2rem 0.5rem' : '0.3rem 0.75rem', fontSize: compact ? '0.7rem' : '0.75rem', borderRadius: '4px' }}
            onClick={() => setViewMode('schema')}
          >
            {compact ? 'Stats' : 'Column Statistics'}
          </button>
        </div>
      </div>

      {/* Grid Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {viewMode === 'preview' ? (
          <div className="table-container" style={{ margin: 0, flex: 1, overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  {activeSheet.columns.map(col => (
                    <th key={col.name}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: 'hsl(var(--primary))' }}>{getColumnIcon(col.type)}</span>
                        {col.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, idx) => (
                  <tr key={idx}>
                    <td>{startIndex + idx + 1}</td>
                    {activeSheet.columns.map(col => {
                      const rawVal = row[col.name];
                      let displayVal = '';
                      if (rawVal !== null && rawVal !== undefined) {
                        if (rawVal instanceof Date) {
                          displayVal = rawVal.toLocaleDateString();
                        } else if (typeof rawVal === 'boolean') {
                          displayVal = rawVal ? 'TRUE' : 'FALSE';
                        } else {
                          displayVal = String(rawVal);
                        }
                      }
                      return (
                        <td key={col.name} title={displayVal}>
                          {displayVal === '' ? <em style={{ opacity: 0.3 }}>null</em> : displayVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-container" style={{ margin: 0, flex: 1, overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Column Name</th>
                  <th>Inferred Type</th>
                  <th>Nulls / Missing</th>
                  <th>Unique Values</th>
                  <th>Min / Range Start</th>
                  <th>Max / Range End</th>
                  <th>Average Value</th>
                </tr>
              </thead>
              <tbody>
                {activeSheet.columns.map(col => (
                  <tr key={col.name}>
                    <td style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{col.name}</td>
                    <td>
                      <span className={`badge ${col.type === 'number' ? 'badge-cyan' : 'badge-purple'}`} style={{ gap: '0.25rem' }}>
                        {getColumnIcon(col.type)} {col.type}
                      </span>
                    </td>
                    <td>
                      {col.nullCount} <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({Math.round((col.nullCount / activeSheet.rowCount) * 100)}%)</span>
                    </td>
                    <td>{col.uniqueCount}</td>
                    <td>{col.min !== undefined ? String(col.min) : <span style={{ opacity: 0.3 }}>-</span>}</td>
                    <td>{col.max !== undefined ? String(col.max) : <span style={{ opacity: 0.3 }}>-</span>}</td>
                    <td>{col.avg !== undefined ? col.avg : <span style={{ opacity: 0.3 }}>-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls for preview */}
      {viewMode === 'preview' && totalPages > 1 && (
        <div className="table-pagination" style={{ padding: compact ? '0.5rem 0 0 0' : undefined, background: compact ? 'transparent' : undefined, borderTop: compact ? '1px dashed var(--LightGray)' : undefined }}>
          <span style={{ fontSize: compact ? '0.725rem' : '0.8rem', color: 'hsl(var(--text-secondary))' }}>
            Page <strong>{currentPage}</strong> of {totalPages} {compact ? '' : `(${activeSheet.rows.length} total rows)`}
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary btn-icon-only"
              onClick={() => handlePageChange('prev')}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="btn btn-secondary btn-icon-only"
              onClick={() => handlePageChange('next')}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
