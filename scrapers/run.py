"""
Main scraper entrypoint — run by GitHub Actions.

Usage:
    python scrapers/run.py [trigger]

trigger: 'scheduled' | 'manual' | 'ui' (default: 'scheduled')

Environment variables required:
    SUPABASE_URL
    SUPABASE_SERVICE_KEY
"""

import sys
import datetime

from news import FEEDS, fetch_single_feed, fetch_google_news
from pubmed import fetch_publication_trends
from job_manager import JobManager
from article_store import upsert_articles
from deal_parser import parse

TRIGGER = sys.argv[1] if len(sys.argv) > 1 else 'scheduled'
RUN_ID  = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ') + '-' + TRIGGER


def build_google_queries(topic, geography, focus_type):
    """Return a list of Google News query strings to run."""
    base = ' '.join(p for p in [topic, geography] if p)
    if focus_type == 'startups':
        return [f'{base} startup funding', f'{base} seed OR "Series A"']
    elif focus_type == 'investment':
        return [f'{base} investment VC biotech', f'{base} funding round']
    else:
        return [f'{base} biotech', f'{base} startup investment']


total_fetched = 0
total_new = 0
feeds_done = 0

# ── Try to adopt a pending job created by the UI ────────────────────────────
job = JobManager.adopt_pending(RUN_ID)

if job is None:
    # No pending job — create one with defaults (scheduled/manual run)
    ALL_SOURCES = list(FEEDS.keys()) + ['PubMed']
    job = JobManager(
        run_id=RUN_ID,
        trigger=TRIGGER,
        feeds_total=len(ALL_SOURCES),
    )

# ── Build source list based on focus ────────────────────────────────────────
has_focus = bool(job.focus_topic or job.focus_geography)

try:
    if has_focus:
        # Focused mode: targeted Google News searches + PubMed
        print(f'[scraper] focused mode — topic={job.focus_topic!r} geography={job.focus_geography!r} type={job.focus_type}', flush=True)
        queries = build_google_queries(job.focus_topic, job.focus_geography, job.focus_type)
        total_sources = len(queries) + 1  # +1 for PubMed
        job.set_feeds_total(total_sources)

        for i, query in enumerate(queries):
            signal = job.check_signal()
            if signal == 'stop':
                job.stop(); sys.exit(0)

            label = f'Google News: {query}'
            print(f'[scraper] fetching {label} ({i + 1}/{total_sources})', flush=True)
            job.progress(feeds_done=i, current_feed=label,
                         articles_fetched=total_fetched, articles_new=total_new)

            raw = fetch_google_news(job.focus_topic, job.focus_geography, job.focus_type)
            enriched = [{**a, **parse(a['title'], a.get('summary'))} for a in raw]

            new_count = upsert_articles(job.job_id, enriched)
            total_fetched += len(raw)
            total_new += new_count
            feeds_done = i + 1
            print(f'[scraper] {label}: fetched={len(raw)} new={new_count}', flush=True)

    else:
        # Broad mode: all RSS feeds
        print('[scraper] broad mode — all RSS feeds', flush=True)

        for i, (source, url) in enumerate(FEEDS.items()):
            signal = job.check_signal()
            if signal == 'stop':
                job.stop(); sys.exit(0)

            print(f'[scraper] fetching {source} ({i + 1}/{len(FEEDS)})', flush=True)
            job.progress(feeds_done=i, current_feed=source,
                         articles_fetched=total_fetched, articles_new=total_new)

            raw = fetch_single_feed(source, url)
            enriched = [{**a, **parse(a['title'], a.get('summary'))} for a in raw]

            new_count = upsert_articles(job.job_id, enriched)
            total_fetched += len(raw)
            total_new += new_count
            feeds_done = i + 1
            print(f'[scraper] {source}: fetched={len(raw)} new={new_count}', flush=True)

    # ── PubMed ──────────────────────────────────────────────────────────────
    signal = job.check_signal()
    if signal == 'stop':
        job.stop(); sys.exit(0)

    pubmed_label = f'PubMed: {job.focus_topic}' if job.focus_topic else 'PubMed'
    print(f'[scraper] fetching {pubmed_label}', flush=True)
    job.progress(feeds_done=feeds_done, current_feed=pubmed_label,
                 articles_fetched=total_fetched, articles_new=total_new)

    pubmed_df = fetch_publication_trends(topic=job.focus_topic)
    pubmed_rows = []
    for _, row in pubmed_df.iterrows():
        pubmed_rows.append({
            'source':       row.get('topic', pubmed_label),
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

    job.complete(articles_fetched=total_fetched, articles_new=total_new)

except Exception as e:
    print(f'[scraper] unhandled error: {e}', flush=True)
    job.fail(str(e))
    sys.exit(1)
