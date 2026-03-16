"""
Biotech news scraper — pulls from public RSS feeds.
No API key required.
"""

import feedparser
import pandas as pd
from datetime import datetime, timezone
import time

FEEDS = {
    'FierceBiotech':   'https://www.fiercebiotech.com/rss/xml',
    'STAT News':       'https://www.statnews.com/feed/',
    'BioPharma Dive':  'https://www.biopharmadive.com/feeds/news/',
    'BioSpace':        'https://www.biospace.com/rss/news',
    'Endpoints News':  'https://endpts.com/feed/',
    'EU-Startups':     'https://eu-startups.com/feed/',
    'Sifted':          'https://sifted.eu/feed/',
    'GEN News':        'https://www.genengnews.com/feed/',
    'SynBioBeta':      'https://synbiobeta.com/feed/',
    'Science Daily':   'https://www.sciencedaily.com/rss/plants_animals/biotechnology.xml',
}

# Keywords to classify articles into segments
SEGMENT_KEYWORDS = {
    'Start-ups': [
        'startup', 'start-up', 'seed', 'series a', 'series b', 'founder',
        'early-stage', 'spinout', 'spin-out', 'incubator', 'accelerator',
        'raise', 'raised', 'funding round', 'pre-seed',
    ],
    'Investors': [
        'venture capital', 'vc', 'investor', 'investment', 'fund',
        'due diligence', 'portfolio', 'biotech fund', 'raise', 'series c',
        'series d', 'ipo', 'acquisition target', 'deal',
    ],
    'Corporates': [
        'acquisition', 'merger', 'partnership', 'collaboration', 'licensing',
        'corporate', 'big pharma', 'deal', 'alliance', 'agreement',
        'm&a', 'takeover', 'joint venture',
    ],
}


def _classify(text: str) -> list[str]:
    """Return which segments an article belongs to based on keywords."""
    text_lower = text.lower()
    return [
        segment
        for segment, keywords in SEGMENT_KEYWORDS.items()
        if any(kw in text_lower for kw in keywords)
    ] or ['General']


def fetch_single_feed(source: str, url: str, max_items: int = 30) -> list[dict]:
    """
    Fetch one RSS feed and return a list of plain dicts (no pandas).
    Used by the Supabase scraper pipeline.
    """
    articles = []
    try:
        feed = feedparser.parse(url)
        for entry in feed.entries[:max_items]:
            title   = entry.get('title', '').strip()
            summary = entry.get('summary', '').strip()
            link    = entry.get('link', '').strip()

            if not link or not title:
                continue

            published = None
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc).isoformat()
            elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                published = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc).isoformat()

            articles.append({
                'source':       source,
                'source_type':  'rss',
                'title':        title,
                'summary':      summary[:500],
                'source_url':   link,
                'published_at': published,
            })
    except Exception as e:
        print(f'[rss] error fetching {source}: {e}', flush=True)

    time.sleep(0.5)
    return articles


def fetch_news(max_per_feed: int = 20) -> pd.DataFrame:
    """Fetch and return articles from all feeds as a DataFrame."""
    articles = []

    for source, url in FEEDS.items():
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:max_per_feed]:
                title   = entry.get('title', '')
                summary = entry.get('summary', '')
                link    = entry.get('link', '')

                # Parse date
                published = None
                if hasattr(entry, 'published_parsed') and entry.published_parsed:
                    published = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                elif hasattr(entry, 'updated_parsed') and entry.updated_parsed:
                    published = datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)

                segments = _classify(title + ' ' + summary)

                for segment in segments:
                    articles.append({
                        'source':    source,
                        'title':     title,
                        'summary':   summary[:300].strip(),
                        'url':       link,
                        'published': published,
                        'segment':   segment,
                    })
        except Exception:
            continue

        time.sleep(0.3)

    df = pd.DataFrame(articles)
    if not df.empty and 'published' in df.columns:
        df = df.dropna(subset=['published']).sort_values('published', ascending=False)
    return df.drop_duplicates(subset=['title'])
