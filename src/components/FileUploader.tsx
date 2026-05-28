import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';
import { parseExcelWorkbook } from '../utils/dataEngine';
import type { WorkbookData } from '../utils/dataEngine';

interface FileUploaderProps {
  onWorkbookLoaded: (data: WorkbookData) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onWorkbookLoaded }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    
    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      setError('Unsupported file format. Please upload an Excel workbook (.xlsx or .xls).');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbookData = parseExcelWorkbook(arrayBuffer);
      onWorkbookLoaded(workbookData);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to read the Excel file. It might be corrupted or in an invalid format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="glass-card" style={{ maxWidth: '600px', margin: '2rem auto', width: '100%' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
        Analyze Your Excel Tabular Data
      </h2>
      <p style={{ textAlign: 'center', color: 'hsl(var(--text-secondary))', marginBottom: '2rem' }}>
        Upload an Excel spreadsheet. Antigravity Data Analyst will automatically structure your rows, calculate statistics, and draw beautiful AI insights.
      </p>

      <div
        className={`uploader-zone ${isDragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInputClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          style={{ display: 'none' }}
          accept=".xlsx, .xls"
          onChange={handleChange}
          disabled={isLoading}
        />

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Loader2 className="loading-dot" style={{ width: '3rem', height: '3rem', color: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontWeight: 500, color: 'hsl(var(--text-primary))' }}>Reading Workbook & Inferred Schemas...</p>
          </div>
        ) : (
          <div>
            <div className="uploader-icon">
              <UploadCloud size={24} />
            </div>
            <p style={{ fontWeight: 600, color: 'hsl(var(--text-primary))', marginBottom: '0.25rem' }}>
              Drag & Drop your Excel workbook here
            </p>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>
              or click to browse files
            </p>
            <div className="badge badge-purple" style={{ textTransform: 'none' }}>
              <FileSpreadsheet size={12} /> Supports .xlsx, .xls
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'hsl(var(--error))',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            fontSize: '0.9rem'
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
