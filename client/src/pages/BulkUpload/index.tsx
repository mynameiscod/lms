import React, { useState, useEffect, useRef } from 'react';
import { batchApi, userApi } from '../../api';
import { Button, Alert, Spinner } from '../../components/common';
import './BulkUpload.css';

interface Batch {
  _id: string;
  name: string;
  isActive?: boolean;
}

interface StudentRow {
  email: string;
  firstName: string;
  lastName: string;
  isValid: boolean;
  error?: string;
}

interface UploadResult {
  successful: Array<{
    email: string;
    firstName: string;
    lastName: string;
    userId: string;
    emailSent: boolean;
  }>;
  failed: Array<{
    email: string;
    firstName: string;
    lastName: string;
    error: string;
  }>;
  total: number;
}

const BulkUploadPage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await batchApi.getBatches();
      const activeBatches = (response.data || response).filter((b: Batch) => b.isActive !== false);
      setBatches(activeBatches);
    } catch (err: any) {
      setError('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (text: string): StudentRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      return [];
    }

    // Get header row
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const emailIndex = header.findIndex(h => h === 'email');
    const firstNameIndex = header.findIndex(h => h === 'firstname' || h === 'first_name' || h === 'first name');
    const lastNameIndex = header.findIndex(h => h === 'lastname' || h === 'last_name' || h === 'last name');

    if (emailIndex === -1 || firstNameIndex === -1 || lastNameIndex === -1) {
      setError('CSV must have columns: email, firstName, lastName');
      return [];
    }

    const rows: StudentRow[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenEmails = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV parsing with potential commas in quoted fields
      const values = parseCSVLine(line);
      
      const email = values[emailIndex]?.trim() || '';
      const firstName = values[firstNameIndex]?.trim() || '';
      const lastName = values[lastNameIndex]?.trim() || '';

      let isValid = true;
      let errorMsg: string | undefined;

      if (!email || !firstName || !lastName) {
        isValid = false;
        errorMsg = 'Missing required fields';
      } else if (!emailRegex.test(email)) {
        isValid = false;
        errorMsg = 'Invalid email format';
      } else if (seenEmails.has(email.toLowerCase())) {
        isValid = false;
        errorMsg = 'Duplicate email in file';
      }

      if (email) {
        seenEmails.add(email.toLowerCase());
      }

      rows.push({ email, firstName, lastName, isValid, error: errorMsg });
    }

    return rows;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result.map(s => s.replace(/^"|"$/g, '').trim());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      setStudents(parsed);
      
      if (parsed.length === 0) {
        setError('No valid student data found in the file');
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file');
    };
    reader.readAsText(file);
  };

  const handleRemoveRow = (index: number) => {
    setStudents(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedBatch) {
      setError('Please select a batch');
      return;
    }

    const validStudents = students.filter(s => s.isValid);
    if (validStudents.length === 0) {
      setError('No valid students to upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const response = await userApi.bulkUploadStudents({
        students: validStudents.map(s => ({
          email: s.email,
          firstName: s.firstName,
          lastName: s.lastName
        })),
        batchId: selectedBatch
      });

      setUploadResult(response.data);
      
      if (response.data.successful.length > 0) {
        setSuccess(`Successfully added ${response.data.successful.length} student(s)`);
      }
      
      // Clear the form after successful upload
      if (response.data.failed.length === 0) {
        setStudents([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload students');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = 'email,firstName,lastName\njohn.doe@example.com,John,Doe\njane.smith@example.com,Jane,Smith';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const validCount = students.filter(s => s.isValid).length;
  const invalidCount = students.filter(s => !s.isValid).length;

  if (loading) {
    return (
      <div className="bulk-upload-page">
        <div className="loading-container">
          <Spinner size="large" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bulk-upload-page">
      <div className="page-header">
        <h1>Bulk Upload Students</h1>
        <p className="subtitle">Upload multiple students at once using a CSV file</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="upload-section">
        <div className="upload-card">
          <h2>Step 1: Select Batch</h2>
          <p className="step-description">All uploaded students will be assigned to this batch</p>
          
          <select
            className="batch-select"
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
          >
            <option value="">Select a batch...</option>
            {batches.map(batch => (
              <option key={batch._id} value={batch._id}>{batch.name}</option>
            ))}
          </select>
        </div>

        <div className="upload-card">
          <h2>Step 2: Upload CSV File</h2>
          <p className="step-description">
            CSV file must contain columns: <strong>email</strong>, <strong>firstName</strong>, <strong>lastName</strong>
          </p>
          
          <div className="file-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="file-input"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="file-upload-label">
              <span className="upload-icon">📁</span>
              <span>Click to select CSV file or drag and drop</span>
            </label>
          </div>

          <button className="template-btn" onClick={handleDownloadTemplate}>
            Download CSV Template
          </button>
        </div>
      </div>

      {students.length > 0 && (
        <div className="preview-section">
          <div className="preview-header">
            <h2>Preview ({students.length} rows)</h2>
            <div className="preview-stats">
              <span className="stat valid">✓ {validCount} valid</span>
              {invalidCount > 0 && (
                <span className="stat invalid">✕ {invalidCount} invalid</span>
              )}
            </div>
          </div>

          <div className="students-table-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Email</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={index} className={student.isValid ? 'valid-row' : 'invalid-row'}>
                    <td>{index + 1}</td>
                    <td>{student.email}</td>
                    <td>{student.firstName}</td>
                    <td>{student.lastName}</td>
                    <td>
                      {student.isValid ? (
                        <span className="status-badge success">Valid</span>
                      ) : (
                        <span className="status-badge error" title={student.error}>
                          {student.error}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="remove-btn"
                        onClick={() => handleRemoveRow(index)}
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="upload-actions">
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={uploading || validCount === 0 || !selectedBatch}
            >
              {uploading ? (
                <>
                  <Spinner size="small" /> Uploading...
                </>
              ) : (
                `Upload ${validCount} Student${validCount !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      )}

      {uploadResult && (
        <div className="results-section">
          <h2>Upload Results</h2>
          
          {uploadResult.successful.length > 0 && (
            <div className="result-group success">
              <h3>✓ Successfully Added ({uploadResult.successful.length})</h3>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Email Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadResult.successful.map((s, i) => (
                    <tr key={i}>
                      <td>{s.email}</td>
                      <td>{s.firstName} {s.lastName}</td>
                      <td>
                        {s.emailSent ? (
                          <span className="email-status sent">✓ Sent</span>
                        ) : (
                          <span className="email-status failed">✕ Not sent</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {uploadResult.failed.length > 0 && (
            <div className="result-group failed">
              <h3>✕ Failed ({uploadResult.failed.length})</h3>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadResult.failed.map((s, i) => (
                    <tr key={i}>
                      <td>{s.email}</td>
                      <td>{s.firstName} {s.lastName}</td>
                      <td className="error-cell">{s.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkUploadPage;
