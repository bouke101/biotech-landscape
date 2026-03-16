"""
Main scraper entrypoint — run by GitHub Actions.

Usage:
    python scrapers/run.py [trigger]

trigger: 'scheduled' | 'manual' (default: 'scheduled')

Environment variables required:
    SUPABASE_URL
    SUPABASE_SERVICE_KEY
"""

import sys
import datetime

from news import FEEDS, fetch_single_feed
from pubmed import fetch_publication_trends
from job_manager import JobManager
from article_store import upsert_articles
from deal_parser import parse

TRIGGER = sys.argv[1] if len(sys.argv) > 1 else 'scheduled'
RUN_ID  = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ') + '-' + TRIGGER

ALL_SOURCES = list(FEEDS.keys()) + ['PubMed']
job = JobManager(run_id=RUN_ID, trigger=TRIGGER, feeds_total=len(ALL_SOURCES))

total_fetched = 0
total_new = 0

try:
    # ── RSS feeds ──────────────────────────────────────────────────────────────
    for i, (source, url) in enumerate(FEEDS.items()):
        signal = job.check_signal()
        if signal == 'stop':
            job.stop()
            sys.exit(0)

        print(f'[scraper] fetching {source} ({i + 1}/{len(FEEDS)})', flush=True)
        job.progress(feeds_done=i, current_feed=source,
                     articles_fetched=total_fetched, articles_new=total_new)

        raw = fetch_single_feed(source, url)
        enriched = [
            {**article, **parse(article['title'], article.get('summary'))}
            for article in raw
        ]

        new_count = upsert_articles(job.job_id, enriched)
        total_fetched += len(raw)
        total_new += new_count
        print(f'[scraper] {source}: fetched={len(raw)} new={new_count}', flush=True)

    # ── PubMed ─────────────────────────────────────────────────────────────────
    signal = job.check_signal()
    if signal == 'stop':
        job.stop()
        sys.exit(0)

    print(f'[scraper] fetching PubMed ({len(FEEDS) + 1}/{len(ALL_SOURCES)})', flush=True)
    job.progress(feeds_done=len(FEEDS), current_feed='PubMed',
                 articles_fetched=total_fetched, articles_new=total_new)

    pubmed_df = fetch_publication_trends()
    pubmed_rows = []
    for _, row in pubmed_df.iterrows():
        pubmed_rows.append({
            'source':       row.get('topic', 'PubMed'),
            'source_type':  'pubmed',
            'title':        row.get('title', ''),
            'summary':      None,
            'source_url':   row.get('url', ''),
            'published_at': None,
            **parse(row.get('title', ''), None),
        })

    new_count = upsert_articles(job.job_id, pubmed_rows)
    total_fetched += len(pubmed_rows)
    total_new += new_count
    print(f'[scraper] PubMed: fetched={len(pubmed_rows)} new={new_count}', flush=True)

    # ── Done ───────────────────────────────────────────────────────────────────
    job.complete(articles_fetched=total_fetched, articles_new=total_new)

except Exception as e:
    print(f'[scraper] unhandled error: {e}', flush=True)
    job.fail(str(e))
    sys.exit(1)
