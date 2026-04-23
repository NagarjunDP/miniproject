import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertTriangle, File as FileIcon } from 'lucide-react';

const FileUploader = ({ mode }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
      setError('');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const endpoint = mode === 'add' ? '/api/v1/files/add' : '/api/v1/files/verify';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error or server is down');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: '16px', color: 'var(--gold-primary)' }}>
        {mode === 'add' ? 'Timestamp a New File' : 'Verify File Integrity'}
      </h3>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        {mode === 'add' 
          ? 'Upload a file to hash it, sign it with your GPG key, and permanently record it on the blockchain.'
          : 'Upload a file to verify its hash against the blockchain and validate the author signature.'}
      </p>

      <div 
        className={`file-dropzone ${file ? 'active' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
        />
        
        {file ? (
          <div>
            <FileIcon size={48} className="icon" style={{ margin: '0 auto' }} />
            <p className="filename">{file.name}</p>
            <p style={{ fontSize: '0.8rem' }}>{(file.size / 1024).toFixed(2)} KB</p>
          </div>
        ) : (
          <div>
            <Upload size={48} className="icon" style={{ margin: '0 auto' }} />
            <p>Drag and drop your file here</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--gold-dark)' }}>or click to browse</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          className="btn-primary" 
          onClick={handleSubmit} 
          disabled={!file || loading}
        >
          {loading ? 'Processing...' : (mode === 'add' ? 'Timestamp File' : 'Verify File')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginTop: '24px' }}>
          <AlertTriangle size={20} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="animate-fade-in" style={{ marginTop: '30px' }}>
          <div className="alert alert-success">
            <CheckCircle size={24} />
            <span>
              {mode === 'add' 
                ? 'File successfully timestamped and automatically mined into the blockchain!' 
                : 'File integrity verified! The file hash and signature are valid.'}
            </span>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: 'var(--gold-light)', marginBottom: '10px' }}>Transaction Details</h4>
            <pre>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
