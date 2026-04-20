const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const Parser = require('rss-parser');
const pg = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/remote_jobs'
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      job_id VARCHAR(255) UNIQUE,
      title VARCHAR(255),
      company VARCHAR(255),
      description TEXT,
      location VARCHAR(255),
      salary VARCHAR(100),
      job_type VARCHAR(50),
      url TEXT,
      source VARCHAR(50),
      posted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true
    );
    CREATE INDEX IF NOT EXISTS idx_company ON jobs(company);
    CREATE INDEX IF NOT EXISTS idx_source ON jobs(source);
    CREATE INDEX IF NOT EXISTS idx_job_type ON jobs(job_type);
    CREATE INDEX IF NOT EXISTS idx_is_active ON jobs(is_active);
  `);
  console.log('✓ Database initialized');
}

async function fetchRemoteOK() {
  try {
    const response = await fetch('https://remoteok.io/api');
    const data = await response.json();
    const jobs = data
      .filter(job => job.job_type !== 'other' && job.company)
      .map(job => ({
        job_id: `remoteok_${job.id}`,
        title: job.title,
        company: job.company,
        description: job.description || '',
        location: job.location || 'Remote',
        salary: job.salary ? `$${job.salary}` : null,
        job_type: job.job_type,
        url: job.url,
        source: 'remoteok',
        posted_at: new Date(job.date_posted * 1000)
      }));
    console.log(`✓ Fetched ${jobs.length} jobs from RemoteOK`);
    return jobs;
  } catch (err) {
    console.error('❌ RemoteOK fetch failed:', err.message);
    return [];
  }
}

async function fetchWeWorkRemotely() {
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://weworkremotely.com/categories/remote-full-stack-programming.rss');
    const jobs = feed.items.map(item => ({
      job_id: `weeworkremotely_${item.guid}`,
      title: item.title,
      company: item.author || 'Unknown',
      description: item.content || item.summary || '',
      location: 'Remote',
      salary: null,
      job_type: 'full-time',
      url: item.link,
      source: 'weeworkremotely',
      posted_at: new Date(item.pubDate)
    }));
    console.log(`✓ Fetched ${jobs.length} jobs from We Work Remotely`);
    return jobs;
  } catch (err) {
    console.error('❌ We Work Remotely fetch failed:', err.message);
    return [];
  }
}

async function upsertJobs(jobs) {
  let inserted = 0;
  let updated = 0;
  for (const job of jobs) {
    try {
      await pool.query(
        `INSERT INTO jobs (job_id, title, company, description, location, salary, job_type, url, source, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (job_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP, is_active = true`,
        [job.job_id, job.title, job.company, job.description, job.location, job.salary, job.job_type, job.url, job.source, job.posted_at]
      );
      updated++;
    } catch (err) {
      console.error(`Error inserting job ${job.job_id}:`, err.message);
    }
  }
  console.log(`✓ Inserted: ${inserted}, Updated: ${updated}`);
}

async function markOldJobsInactive() {
  const result = await pool.query(
    `UPDATE jobs SET is_active = false WHERE updated_at < NOW() - INTERVAL '30 days'`
  );
  console.log(`✓ Marked ${result.rowCount} old jobs as inactive`);
}

async function runScraper() {
  console.log('\n📡 Starting job scraper...');
  const remoteOKJobs = await fetchRemoteOK();
  const weWorkRemotelyJobs = await fetchWeWorkRemotely();
  const allJobs = [...remoteOKJobs, ...weWorkRemotelyJobs];
  if (allJobs.length > 0) {
    await upsertJobs(allJobs);
    await markOldJobsInactive();
  }
  console.log('✓ Scraper complete\n');
}

app.get('/api/jobs', async (req, res) => {
  try {
    const { search, job_type, source, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM jobs WHERE is_active = true';
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (title ILIKE $${paramCount} OR company ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    if (job_type) {
      query += ` AND job_type = $${paramCount}`;
      params.push(job_type);
      paramCount++;
    }
    if (source) {
      query += ` AND source = $${paramCount}`;
      params.push(source);
      paramCount++;
    }

    query += ` ORDER BY posted_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    let countQuery = 'SELECT COUNT(*) FROM jobs WHERE is_active = true';
    let countParams = [];
    if (search) {
      countQuery += ` AND (title ILIKE $1 OR company ILIKE $1)`;
      countParams.push(`%${search}%`);
    }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      jobs: result.rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/job-types', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT job_type FROM jobs WHERE is_active = true ORDER BY job_type'
    );
    res.json(result.rows.map(r => r.job_type));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sources', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT source, COUNT(*) as count FROM jobs WHERE is_active = true GROUP BY source'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await initDB();
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
  await runScraper();
  setInterval(runScraper, 12 * 60 * 60 * 1000);
}

start().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});

module.exports = app;
