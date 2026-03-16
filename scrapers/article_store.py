"""
Upserts scraped articles to Supabase. Deduplicates by source_url.
"""

from supabase_client import get_client


def upsert_articles(job_id: str, articles: list[dict]) -> int:
    """
    Insert articles, skip duplicates on source_url.
    Returns count of newly inserted rows.
    """
    if not articles:
        return 0

    db = get_client()
    rows = []
    for a in articles:
        row = {k: v for k, v in a.items() if v is not None}
        row['job_id'] = job_id
        # Ensure required fields exist
        if not row.get('source_url'):
            continue
        rows.append(row)

    if not rows:
        return 0

    res = (
        db.table('scraped_articles')
        .upsert(rows, on_conflict='source_url', ignore_duplicates=True)
        .execute()
    )
    return len(res.data) if res.data else 0
