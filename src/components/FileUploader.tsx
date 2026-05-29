import React, { useState, useRef } from 'react';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';
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
    if (!isLoading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div
        className={`uploader-zone ${isDragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerInputClick}
        style={{
          border: isDragActive ? '2px dashed var(--LabelBG)' : '2px dashed rgba(0, 82, 189, 0.25)',
          borderRadius: '12px',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          background: isDragActive ? 'rgba(0, 82, 189, 0.04)' : 'var(--WidgetBG)',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem'
        }}
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
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1rem' }}>
            <Loader2 size={36} className="loading-dot" style={{ color: 'var(--BannerGB)', animation: 'spin 1s linear infinite' }} />
            <p style={{ fontWeight: 600, color: 'var(--LabelBG)', margin: 0, fontSize: '0.9rem' }}>
              Parsing Excel sheets & analyzing fields...
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--DarkGray)', margin: 0 }}>
              Performing aggregations, building column metrics, and loading AI structures
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div className="uploader-icon" style={{ background: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--LightGray)', color: 'var(--BannerGB)', margin: '0 auto' }}>
              <UploadCloud size={24} />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--HeaderText)', margin: '0 0 0.15rem 0', fontSize: '0.95rem' }}>
                Drag and drop your cost report file here
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--DarkGray)', margin: '0 0 0.75rem 0' }}>
                Supports standard Excel sheets (`.xlsx` or `.xls`)
              </p>
            </div>
            <button 
              type="button" 
              className="btn btn-primary"
              style={{ padding: '0.35rem 1rem', fontSize: '0.75rem', pointerEvents: 'none' }}
            >
              Choose Spreadsheet File
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1.5px solid rgba(239, 68, 68, 0.2)',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            fontSize: '0.825rem',
            lineHeight: '1.4'
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem', color: '#dc2626' }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
