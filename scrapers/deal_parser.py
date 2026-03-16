"""
Regex-based extraction of deal signals from article text.
Populates the _hint columns in scraped_articles.
Never writes to the deals table — that remains curated.
"""

import re

AMOUNT_RE = re.compile(
    r'[\$€£]?\s*(\d[\d,.]*)\s*(M|B|million|billion|mn|bn)',
    re.IGNORECASE,
)

ROUND_KEYWORDS = [
    'series d', 'series c', 'series b', 'series a',
    'seed round', 'seed funding', 'pre-seed',
    'ipo', 'initial public offering',
    'acquisition', 'acquires', 'acquired',
    'm&a', 'merger',
    'grant', 'horizon europe', 'eic accelerator',
    'convertible note',
]

SEGMENT_KEYWORDS = {
    'Start-ups': [
        'startup', 'start-up', 'seed', 'series a', 'series b', 'founder',
        'early-stage', 'spinout', 'spin-out', 'incubator', 'accelerator',
        'raise', 'raised', 'funding round', 'pre-seed',
    ],
    'Investors': [
        'venture capital', 'vc fund', 'investor', 'investment', 'portfolio',
        'due diligence', 'series c', 'series d', 'ipo', 'deal flow',
    ],
    'Corporates': [
        'acquisition', 'merger', 'partnership', 'collaboration', 'licensing',
        'corporate', 'big pharma', 'alliance', 'agreement', 'm&a', 'takeover',
    ],
}


def classify_segments(text: str) -> list[str]:
    text_lower = text.lower()
    return [
        seg for seg, kws in SEGMENT_KEYWORDS.items()
        if any(kw in text_lower for kw in kws)
    ] or ['General']


def parse(title: str, summary: str | None) -> dict:
    text = (title + ' ' + (summary or '')).lower()

    result: dict = {
        'deal_extracted': False,
        'company_name_hint': None,
        'amount_hint': None,
        'round_type_hint': None,
        'investors_hint': [],
        'segments': classify_segments(text),
    }

    # Amount
    m = AMOUNT_RE.search(text)
    if m:
        unit = m.group(2).upper()
        unit = 'M' if unit in ('M', 'MILLION', 'MN') else 'B'
        result['amount_hint'] = f"{m.group(1)}{unit}"
        result['deal_extracted'] = True

    # Round type (check longest/most specific first)
    for kw in ROUND_KEYWORDS:
        if kw in text:
            result['round_type_hint'] = kw
            result['deal_extracted'] = True
            break

    return result
