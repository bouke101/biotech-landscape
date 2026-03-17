"""
Biotech news scraper — pulls from public RSS feeds.
No API key required.
"""

import feedparser
import pandas as pd
from datetime import datetime, timezone
import time
import urllib.parse

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

FOCUS_TYPE_KEYWORDS = {
    'startups':   'startup OR "seed round" OR "Series A" OR "Series B" OR founder OR "spin-out"',
    'investment': 'investment OR "venture capital" OR VC OR funding OR raise OR IPO OR acquisition',
    'all':        'biotech OR "life science" OR startup OR investment',
}


def _classify(text: str) -> list[str]:
    """Return which segments an article belongs to based on keywords."""
    text_lower = text.lower()
    return [
        segment
        for segment, keywords in SEGMENT_KEYWORDS.items()
        if any(kw in text_lower for kw in keywords)
    ] or ['General']


def _is_relevant(text: str, topic: str | None, geography: str | None) -> bool:
    """Return True if the article text matches the focus topic or geography."""
    if not topic and not geography:
        return True
    text_lower = text.lower()
    topic_match = topic and topic.lower() in text_lower
    geo_match = geography and geography.lower() in text_lower
    # Accept if at least one filter matches (OR logic — don't discard everything)
    return bool(topic_match or geo_match)


def build_google_news_query(topic: str | None, geography: str | None, focus_type: str | None) -> str:
    """Build a Google News RSS search query from focus params."""
    parts = []
    if topic:
        parts.append(topic)
    if geography:
        parts.append(geography)
    # Add focus-type keywords
    ftype = focus_type or 'all'
    if ftype == 'startups':
        parts.append('startup funding')
    elif ftype == 'investment':
        parts.append('investment VC biotech')
    else:
        parts.append('biotech')
    return ' '.join(parts)


def fetch_google_news(topic: str | None, geography: str | None, focus_type: str | None,
                      max_items: int = 40) -> list[dict]:
    """
    Fetch targeted biotech news via Google News RSS.
    Returns plain dicts ready for the Supabase pipeline.
    """
    query = build_google_news_query(topic, geography, focus_type)
    encoded = urllib.parse.quote(query)
    url = f'https://news.google.com/rss/search?q={encoded}&hl=en-US&gl=US&ceid=US:en'
    source_label = f'Google News: {query}'

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
                'source':       source_label,
                'source_type':  'google_news',
                'title':        title,
                'summary':      summary[:500],
                'source_url':   link,
                'published_at': published,
            })
    except Exception as e:
        print(f'[google_news] error: {e}', flush=True)

    time.sleep(0.5)
    return articles


def fetch_single_feed(source: str, url: str, max_items: int = 30,
                      topic: str | None = None, geography: str | None = None) -> list[dict]:
    """
    Fetch one RSS feed and return a list of plain dicts (no pandas).
    When topic/geography are set, filters to relevant articles only.
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

            # Relevance filter when a focus is set
            if topic or geography:
                if not _is_relevant(title + ' ' + summary, topic, geography):
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
