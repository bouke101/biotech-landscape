"""
PubMed scraper — uses the free NCBI E-utilities API.
No API key required (rate limited to 3 req/s without key).
"""

import requests
import pandas as pd
import time
from datetime import datetime

BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

TOPICS = {
    'Synthetic Biology':     'synthetic biology',
    'Fermentation / Biomanufacturing': 'fermentation biomanufacturing',
    'AI Drug Discovery':     'artificial intelligence drug discovery',
    'Cell & Gene Therapy':   'cell therapy gene therapy',
    'Precision Fermentation':'precision fermentation',
    'CRISPR':                'CRISPR genome editing',
}


def _search(query: str, years_back: int = 2, retmax: int = 50) -> list[str]:
    """Return a list of PubMed IDs for a query."""
    mindate = datetime.now().year - years_back
    params = {
        'db':      'pubmed',
        'term':    query,
        'retmax':  retmax,
        'retmode': 'json',
        'mindate': str(mindate),
        'datetype':'pdat',
    }
    r = requests.get(f'{BASE}/esearch.fcgi', params=params, timeout=10)
    r.raise_for_status()
    return r.json()['esearchresult']['idlist']


def _fetch_summaries(ids: list[str]) -> list[dict]:
    """Fetch article summaries for a list of PubMed IDs."""
    if not ids:
        return []
    params = {
        'db':      'pubmed',
        'id':      ','.join(ids),
        'retmode': 'json',
    }
    r = requests.get(f'{BASE}/esummary.fcgi', params=params, timeout=10)
    r.raise_for_status()
    result = r.json().get('result', {})
    uids = result.get('uids', [])
    return [result[uid] for uid in uids if uid in result]


def fetch_publication_trends() -> pd.DataFrame:
    """
    For each topic, fetch recent PubMed publications and return a
    DataFrame with title, journal, date, and topic.
    """
    rows = []

    for topic, query in TOPICS.items():
        try:
            ids = _search(query)
            summaries = _fetch_summaries(ids)
            for s in summaries:
                pub_date = s.get('pubdate', '')
                rows.append({
                    'topic':   topic,
                    'title':   s.get('title', ''),
                    'journal': s.get('fulljournalname', s.get('source', '')),
                    'date':    pub_date,
                    'pmid':    s.get('uid', ''),
                    'url':     f"https://pubmed.ncbi.nlm.nih.gov/{s.get('uid', '')}/",
                })
        except Exception:
            continue
        time.sleep(0.4)

    return pd.DataFrame(rows)


def fetch_topic_counts(years_back: int = 3) -> pd.DataFrame:
    """Return publication counts per topic per year for trend charts."""
    current_year = datetime.now().year
    rows = []

    for topic, query in TOPICS.items():
        for year in range(current_year - years_back, current_year + 1):
            try:
                params = {
                    'db':      'pubmed',
                    'term':    query,
                    'retmax':  0,
                    'retmode': 'json',
                    'mindate': str(year),
                    'maxdate': str(year),
                    'datetype':'pdat',
                }
                r = requests.get(f'{BASE}/esearch.fcgi', params=params, timeout=10)
                r.raise_for_status()
                count = int(r.json()['esearchresult']['count'])
                rows.append({'topic': topic, 'year': year, 'publications': count})
            except Exception:
                pass
            time.sleep(0.4)

    return pd.DataFrame(rows)
