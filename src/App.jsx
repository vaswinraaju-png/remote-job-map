import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function JobMap() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [jobType, setJobType] = useState('');
  const [source, setSource] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobTypes, setJobTypes] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const JOBS_PER_PAGE = 50;

  useEffect(() => {
    fetchJobs();
    fetchFilters();
  }, [search, jobType, source, page]);

  async function fetchJobs() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: JOBS_PER_PAGE,
        offset: page * JOBS_PER_PAGE,
        ...(search && { search }),
        ...(jobType && { job_type: jobType }),
        ...(source && { source })
      });

      const res = await fetch(`${API_BASE}/api/jobs?${params}`);
      const data = await res.json();
      setJobs(data.jobs);
      setTotal(data.total);
    } catch (err) {
      console.error('Error:', err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFilters() {
    try {
      const [typesRes, sourcesRes] = await Promise.all([
        fetch(`${API_BASE}/api/job-types`),
        fetch(`${API_BASE}/api/sources`)
      ]);
      setJobTypes(await typesRes.json());
      setSources(await sourcesRes.json());
    } catch (err) {
      console.error('Filter error:', err);
    }
  }

  const totalPages = Math.ceil(total / JOBS_PER_PAGE);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: 20, fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 30, textAlign: 'center' }}>Remote Job Map</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
        />
        <select value={jobType} onChange={(e) => { setJobType(e.target.value); setPage(0); }} style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6 }}>
          <option value="">All Types</option>
          {jobTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(0); }} style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6 }}>
          <option value="">All Sources</option>
          {sources.map(s => <option key={s.source} value={s.source}>{s.source} ({s.count})</option>)}
        </select>
        <button onClick={() => { setSearch(''); setJobType(''); setSource(''); setPage(0); }} style={{ padding: '10px 16px', background: '#eee', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>Reset</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Loading...</div>
          ) : jobs.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>No jobs found</div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                Showing {page * JOBS_PER_PAGE + 1}-{Math.min((page + 1) * JOBS_PER_PAGE, total)} of {total}
              </div>
              {jobs.map(job => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  style={{
                    padding: 16,
                    marginBottom: 12,
                    border: selectedJob?.id === job.id ? '2px solid #3b82f6' : '1px solid #ddd',
                    borderRadius: 8,
                    background: selectedJob?.id === job.id ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600 }}>{job.title}</h3>
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: 4 }}>{job.job_type}</span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 500 }}>{job.company}</p>
                  <p style={{ margin: '0 0 4px', fontSize: 13, color: '#666' }}>{job.location}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#999' }}>From {job.source}</p>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24, padding: '16px 0' }}>
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} style={{ padding: '8px 16px', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}>← Previous</button>
                <span style={{ padding: '8px 0' }}>Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} style={{ padding: '8px 16px', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.5 : 1 }}>Next →</button>
              </div>
            </>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 20, height: 'fit-content', position: 'sticky', top: 20 }}>
          {selectedJob ? (
            <div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>{selectedJob.title}</h2>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: '#3b82f6', fontWeight: 500 }}>{selectedJob.company}</p>
              <div style={{ borderTop: '1px solid #ddd', borderBottom: '1px solid #ddd', padding: '12px 0', marginBottom: 16, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#666' }}>Type:</span>
                  <span>{selectedJob.job_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#666' }}>Location:</span>
                  <span>{selectedJob.location}</span>
                </div>
                {selectedJob.salary && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#666' }}>Salary:</span>
                    <span>{selectedJob.salary}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Source:</span>
                  <span>{selectedJob.source}</span>
                </div>
              </div>
              {selectedJob.description && (
                <div style={{ marginBottom: 16, fontSize: 13, color: '#666', maxHeight: 150, overflow: 'auto' }}>
                  {selectedJob.description.substring(0, 300)}...
                </div>
              )}
              <button
                onClick={() => window.open(selectedJob.url, '_blank')}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Apply Now ↗
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>Select a job to view details</div>
          )}
        </div>
      </div>
    </div>
  );
}
