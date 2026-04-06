import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { getProjects, getSubProjects } from '../api/projects';
import { createTestRun } from '../api/testruns';
import { Project, SubProject } from '../types';
import {
  CloudArrowUpIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const TEST_TOOLS = ['JMeter', 'Gatling', 'K6', 'Locust', 'Custom'];

export default function Upload() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [subprojects, setSubprojects] = useState<SubProject[]>([]);
  const [selectedProject, setSelectedProject] = useState(searchParams.get('projectId') || '');
  const [selectedSubproject, setSelectedSubproject] = useState(searchParams.get('subprojectId') || '');

  // Form fields
  const [testName, setTestName] = useState('');
  const [build, setBuild] = useState('');
  const [userLoad, setUserLoad] = useState('');
  const [testTool, setTestTool] = useState('JMeter');
  const [executionDate, setExecutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // File
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedProject) {
      getSubProjects(Number(selectedProject)).then(setSubprojects).catch(console.error);
    } else {
      setSubprojects([]);
      setSelectedSubproject('');
    }
  }, [selectedProject]);

  // Pre-select if URL params provided
  useEffect(() => {
    const spId = searchParams.get('subprojectId');
    const pId = searchParams.get('projectId');
    if (spId) setSelectedSubproject(spId);
    if (pId) setSelectedProject(pId);
  }, [searchParams]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setUploadError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  const canGoStep2 = selectedProject && selectedSubproject;
  const canGoStep3 = canGoStep2 && testName && executionDate;

  const handleSubmit = async () => {
    if (!canGoStep3 || !file) return;
    setUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', testName);
    formData.append('build', build);
    formData.append('user_load', userLoad);
    formData.append('test_tool', testTool);
    formData.append('execution_date', executionDate);
    formData.append('notes', notes);

    try {
      await createTestRun(Number(selectedSubproject), formData);
      setSuccess(true);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-9 h-9 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Upload Successful!</h2>
          <p className="text-slate-500 mb-6">Your test results have been uploaded and parsed successfully.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(`/projects/${selectedProject}/subprojects/${selectedSubproject}`)}
              className="btn-primary"
            >
              View Test Runs
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setFile(null);
                setTestName('');
                setBuild('');
                setUserLoad('');
                setStep(1);
              }}
              className="btn-secondary"
            >
              Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const StepIndicator = ({ n, label }: { n: number; label: string }) => (
    <div className={clsx('flex items-center gap-2', step >= n ? 'text-indigo-600' : 'text-slate-400')}>
      <div className={clsx(
        'w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold',
        step > n ? 'bg-indigo-600 text-white' :
        step === n ? 'bg-indigo-600 text-white' :
        'bg-slate-200 text-slate-500'
      )}>
        {step > n ? <CheckCircleIcon className="w-4 h-4" /> : n}
      </div>
      <span className={clsx('text-sm font-medium hidden sm:block', step === n ? 'text-indigo-600' : 'text-slate-500')}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Upload Test Results</h1>
        <p className="text-slate-500 mt-1">Upload CSV or Excel files from JMeter, Gatling, K6, or other tools</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-8">
        <StepIndicator n={1} label="Select Project" />
        <div className="flex-1 h-px bg-slate-200" />
        <StepIndicator n={2} label="Test Metadata" />
        <div className="flex-1 h-px bg-slate-200" />
        <StepIndicator n={3} label="Upload File" />
      </div>

      {/* Step 1: Project Selection */}
      {step === 1 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Step 1: Select Project & Sub-Project</h2>
          <div>
            <label className="form-label">Project *</label>
            <select
              className="form-select"
              value={selectedProject}
              onChange={(e) => { setSelectedProject(e.target.value); setSelectedSubproject(''); }}
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.customer_name}</option>
              ))}
            </select>
          </div>
          {selectedProject && (
            <div>
              <label className="form-label">Sub-Project *</label>
              <select
                className="form-select"
                value={selectedSubproject}
                onChange={(e) => setSelectedSubproject(e.target.value)}
              >
                <option value="">Select a sub-project...</option>
                {subprojects.map((sp) => (
                  <option key={sp.id} value={sp.id}>{sp.name}</option>
                ))}
              </select>
              {subprojects.length === 0 && (
                <p className="text-xs text-slate-500 mt-1">No sub-projects found. Create one in the project detail page.</p>
              )}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!canGoStep2}
              className="btn-primary"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Metadata */}
      {step === 2 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Step 2: Test Metadata</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="form-label">Test Name *</label>
              <input
                type="text"
                className="form-input"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g. Load Test - Sprint 42"
              />
            </div>
            <div>
              <label className="form-label">Build Number</label>
              <input
                type="text"
                className="form-input"
                value={build}
                onChange={(e) => setBuild(e.target.value)}
                placeholder="e.g. v2.5.1 or #1234"
              />
            </div>
            <div>
              <label className="form-label">User Load (VUs)</label>
              <input
                type="number"
                className="form-input"
                value={userLoad}
                onChange={(e) => setUserLoad(e.target.value)}
                placeholder="e.g. 100"
                min="1"
              />
            </div>
            <div>
              <label className="form-label">Test Tool</label>
              <select className="form-select" value={testTool} onChange={(e) => setTestTool(e.target.value)}>
                {TEST_TOOLS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Execution Date *</label>
              <input
                type="date"
                className="form-input"
                value={executionDate}
                onChange={(e) => setExecutionDate(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input resize-none"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this test run..."
              />
            </div>
          </div>
          <div className="flex gap-3 justify-between pt-2">
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button onClick={() => setStep(3)} disabled={!canGoStep3} className="btn-primary">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: File Upload */}
      {step === 3 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Step 3: Upload Results File</h2>

          {/* Metadata Summary */}
          <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-1">
            <div className="flex gap-2"><span className="text-slate-500 w-32">Test Name:</span><span className="font-medium text-slate-800">{testName}</span></div>
            <div className="flex gap-2"><span className="text-slate-500 w-32">Project:</span><span className="text-slate-700">{projects.find((p) => String(p.id) === selectedProject)?.name}</span></div>
            <div className="flex gap-2"><span className="text-slate-500 w-32">Sub-Project:</span><span className="text-slate-700">{subprojects.find((sp) => String(sp.id) === selectedSubproject)?.name}</span></div>
            <div className="flex gap-2"><span className="text-slate-500 w-32">Tool:</span><span className="text-slate-700">{testTool}</span></div>
            {build && <div className="flex gap-2"><span className="text-slate-500 w-32">Build:</span><span className="text-slate-700">{build}</span></div>}
            {userLoad && <div className="flex gap-2"><span className="text-slate-500 w-32">User Load:</span><span className="text-slate-700">{userLoad} VUs</span></div>}
          </div>

          {/* Drop Zone */}
          <div>
            <label className="form-label">Results File (CSV or Excel) *</label>
            <div
              {...getRootProps()}
              className={clsx(
                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50',
                file ? 'border-emerald-400 bg-emerald-50' : ''
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <DocumentTextIcon className="w-8 h-8 text-emerald-600" />
                  <div className="text-left">
                    <p className="font-medium text-emerald-800">{file.name}</p>
                    <p className="text-sm text-emerald-600">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-2 text-slate-400 hover:text-red-500"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div>
                  <CloudArrowUpIcon className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">
                    {isDragActive ? 'Drop the file here...' : 'Drag & drop your file here'}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">or click to browse</p>
                  <p className="text-xs text-slate-400 mt-2">Supports: CSV, XLS, XLSX — JMeter, Gatling, K6, Locust</p>
                </div>
              )}
            </div>
          </div>

          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {uploadError}
            </div>
          )}

          <div className="flex gap-3 justify-between pt-2">
            <button onClick={() => setStep(2)} className="btn-secondary" disabled={uploading}>Back</button>
            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="btn-primary"
            >
              {uploading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="w-4 h-4" />
                  Upload & Parse
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
