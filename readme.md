# Remote Job Map

Zero-data-entry remote job discovery platform. Automatically scrapes **RemoteOK** and **We Work Remotely**, surfaces on searchable interface.

## What You Get

✅ **Automatic scraping** — RemoteOK API + We Work Remotely RSS (every 12h)  
✅ **No manual work** — Zero data entry, no moderation  
✅ **Searchable API** — Filter by title, company, job type  
✅ **React frontend** — Search, filter, pagination, apply links  
✅ **Production-ready** — Deploy to Railway/Vercel in 2 minutes  

## Quick Start (Local)

```bash
npm install
createdb remote_jobs
cp .env.example .env
npm start
```

## Deployment

1. Push to GitHub
2. Deploy backend to railway.app
3. Deploy frontend to vercel.com

## API Endpoints
GET /api/jobs?search=engineer&job_type=full-time&limit=50
GET /api/job-types
GET /api/sources
GET /health
## Data Sources

- RemoteOK (200+ jobs)
- We Work Remotely (50+ jobs)

Auto-scraped every 12 hours.

## Make Money

1. Sponsored listings ($50-150/week)
2. Email alerts ($4.99/month)
3. White-label platform ($299-2000/month)
4. Analytics dashboard ($99/month)
5. API access ($99/month)
6. Recruiter tools ($99/month)

## Tech Stack

- Backend: Node.js + Express
- Frontend: React
- Database: PostgreSQL
- Deployment: Railway + Vercel

## License

MIT
