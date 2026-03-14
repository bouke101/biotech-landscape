"""
Biotech Landscape Dashboard — aiBio Labs
Organised around three client segments: Start-ups · Investors · Corporates
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import streamlit as st
import pandas as pd
import plotly.express as px
from scrapers.news import fetch_news
from scrapers.pubmed import fetch_publication_trends, fetch_topic_counts

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title='Biotech Landscape · aiBio Labs',
    page_icon='🧬',
    layout='wide',
)

st.markdown("""
<style>
    [data-testid="stAppViewContainer"] { background: #f8f9fb; }
    h1, h2, h3 { color: #0A0F1E; }
    .news-card {
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 12px;
        border-left: 4px solid #0047CC;
    }
    .news-card a { color: #0047CC; text-decoration: none; font-weight: 600; }
    .news-card .meta { color: #888; font-size: 12px; margin-top: 4px; }
    .news-card .summary { color: #444; font-size: 13px; margin-top: 6px; }
</style>
""", unsafe_allow_html=True)

COBALT = '#0047CC'
JADE   = '#00A86B'
PURPLE = '#C084FC'

SEGMENT_COLORS = {
    'Start-ups': JADE,
    'Investors':  COBALT,
    'Corporates': PURPLE,
    'General':    '#94a3b8',
}

# ── Helpers ────────────────────────────────────────────────────────────────────
def render_news(df: pd.DataFrame):
    if df.empty:
        st.info('No articles found.')
        return
    for _, row in df.iterrows():
        color = SEGMENT_COLORS.get(row.get('segment', 'General'), '#ccc')
        date_str = row['published'].strftime('%d %b %Y') if pd.notna(row.get('published')) else ''
        st.markdown(f"""
        <div class="news-card" style="border-left-color:{color}">
            <a href="{row['url']}" target="_blank">{row['title']}</a>
            <div class="meta">{row['source']} · {date_str}</div>
            <div class="summary">{row['summary']}</div>
        </div>
        """, unsafe_allow_html=True)


def render_service_panel(areas: dict):
    for area, items in areas.items():
        with st.expander(area, expanded=True):
            for item in items:
                st.markdown(f'· {item}')


def bar_by_source(df: pd.DataFrame, color: str):
    if df.empty:
        return
    src = df['source'].value_counts().reset_index()
    src.columns = ['source', 'count']
    fig = px.bar(src, x='count', y='source', orientation='h',
                 color_discrete_sequence=[color])
    fig.update_layout(showlegend=False, plot_bgcolor='white',
                      paper_bgcolor='white', yaxis_title='', xaxis_title='Articles')
    st.plotly_chart(fig, use_container_width=True)


# ── Cached data loaders ────────────────────────────────────────────────────────
@st.cache_data(ttl=3600, show_spinner=False)
def load_news():
    return fetch_news(max_per_feed=25)

@st.cache_data(ttl=86400, show_spinner=False)
def load_pubmed_trends():
    return fetch_publication_trends()

@st.cache_data(ttl=86400, show_spinner=False)
def load_pubmed_counts():
    return fetch_topic_counts(years_back=3)


# ── Header ─────────────────────────────────────────────────────────────────────
st.markdown('# 🧬 Biotech Landscape')
st.caption('aiBio Labs · Live intelligence for biotech start-ups, investors, and corporates')
st.divider()

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown('### aiBio Labs')
    st.caption('Biotech · AI · Innovation')
    st.divider()
    if st.button('🔄 Refresh data', use_container_width=True):
        st.cache_data.clear()
        st.rerun()
    st.divider()
    st.markdown('**Data sources**')
    st.caption(
        '· FierceBiotech RSS\n'
        '· STAT News RSS\n'
        '· BioPharma Dive RSS\n'
        '· BioSpace RSS\n'
        '· Endpoints News RSS\n'
        '· PubMed E-utilities API'
    )

# ── Load ───────────────────────────────────────────────────────────────────────
with st.spinner('Fetching latest biotech intelligence...'):
    news_df    = load_news()
    pub_df     = load_pubmed_trends()
    pub_counts = load_pubmed_counts()

startup_news  = news_df[news_df['segment'] == 'Start-ups']
investor_news = news_df[news_df['segment'] == 'Investors']
corporate_news = news_df[news_df['segment'] == 'Corporates']

# ── Tabs ───────────────────────────────────────────────────────────────────────
tab_overview, tab_startups, tab_investors, tab_corporates, tab_science = st.tabs([
    '📊 Overview',
    '🚀 Start-ups',
    '💼 Investors',
    '🏢 Corporates',
    '🔬 Science Trends',
])


# ── Overview ───────────────────────────────────────────────────────────────────
with tab_overview:
    st.subheader('Landscape at a glance')
    c1, c2, c3, c4 = st.columns(4)
    c1.metric('Articles tracked', len(news_df))
    c2.metric('Start-up articles', len(startup_news))
    c3.metric('Investor articles', len(investor_news))
    c4.metric('Corporate articles', len(corporate_news))

    st.divider()
    col_a, col_b = st.columns(2)

    with col_a:
        st.markdown('#### News by segment')
        if not news_df.empty:
            seg = news_df['segment'].value_counts().reset_index()
            seg.columns = ['segment', 'count']
            fig = px.bar(seg, x='segment', y='count', color='segment',
                         color_discrete_map=SEGMENT_COLORS,
                         labels={'count': 'Articles', 'segment': ''})
            fig.update_layout(showlegend=False, plot_bgcolor='white', paper_bgcolor='white')
            st.plotly_chart(fig, use_container_width=True)

    with col_b:
        st.markdown('#### News by source')
        if not news_df.empty:
            src = news_df['source'].value_counts().reset_index()
            src.columns = ['source', 'count']
            fig2 = px.pie(src, names='source', values='count',
                          color_discrete_sequence=px.colors.qualitative.Pastel)
            fig2.update_traces(textposition='inside', textinfo='percent+label')
            fig2.update_layout(paper_bgcolor='white')
            st.plotly_chart(fig2, use_container_width=True)

    st.markdown('#### Latest headlines')
    render_news(news_df.head(10))


# ── Start-ups ──────────────────────────────────────────────────────────────────
with tab_startups:
    st.subheader('🚀 Start-up Landscape')
    st.caption('Early-stage companies · Funding · Technology platforms · R&D strategy')

    col1, col2 = st.columns([2, 1])
    with col1:
        st.markdown('#### Latest start-up news')
        render_news(startup_news.head(15))
    with col2:
        st.markdown('#### Focus areas')
        render_service_panel({
            'Technology & Innovation Strategy': [
                'Evaluation of technology platforms',
                'Defining scalable product opportunities',
                'Shaping and prioritization of R&D roadmaps',
                'Identification of key technical risks',
                'Scale-up and biomanufacturing strategy',
            ],
            'Investor Readiness': [
                'Scientific positioning for investors',
                'Support with technical due diligence',
                'Refining the company narrative',
                'Techno-economic analysis (TEA)',
            ],
            'Strategic Advisory': [
                'Fractional CTO/CSO support',
                'Founder decision support',
                'Coaching',
            ],
        })
        st.divider()
        st.markdown('#### Source breakdown')
        bar_by_source(startup_news, JADE)


# ── Investors ──────────────────────────────────────────────────────────────────
with tab_investors:
    st.subheader('💼 Investor Landscape')
    st.caption('VC activity · Deal flow · Technology landscape · Portfolio intelligence')

    col1, col2 = st.columns([2, 1])
    with col1:
        st.markdown('#### Latest investor news')
        render_news(investor_news.head(15))
    with col2:
        st.markdown('#### Intelligence areas')
        render_service_panel({
            'Technical Due Diligence': [
                'Evaluation of scientific and technical credibility',
                'Techno-economic analysis (TEA)',
                'Identification of development risks',
            ],
            'Technology Landscape Analysis': [
                'Mapping emerging technology trends',
                'Evaluation of competitive positioning',
                'Identification of disruptive innovation areas',
            ],
            'Portfolio Support': [
                'Leadership assessments and support',
                'Coaching of founders',
                'Strategic advisory for portfolio companies',
                'Technology and development guidance',
            ],
        })
        st.divider()
        st.markdown('#### Publication trends')
        if not pub_counts.empty:
            fig = px.line(pub_counts, x='year', y='publications', color='topic',
                          markers=True, line_shape='spline',
                          color_discrete_sequence=px.colors.qualitative.Set2)
            fig.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                              legend_title='', xaxis_title='Year', yaxis_title='Publications')
            st.plotly_chart(fig, use_container_width=True)


# ── Corporates ─────────────────────────────────────────────────────────────────
with tab_corporates:
    st.subheader('🏢 Corporate Landscape')
    st.caption('M&A · Partnerships · Technology scouting · Ecosystem engagement')

    col1, col2 = st.columns([2, 1])
    with col1:
        st.markdown('#### Latest corporate news')
        render_news(corporate_news.head(15))
    with col2:
        st.markdown('#### Scouting focus')
        render_service_panel({
            'Technology Scouting': [
                'Identification of relevant start-ups and technology opportunities',
                'Support for partnerships and collaborations',
                'Evaluation of emerging technology platforms',
            ],
            'Ecosystem Engagement': [
                'Connecting with the biotech innovation ecosystem',
                'Advisory on partnerships, consortia, and innovation platforms',
            ],
        })
        st.divider()
        st.markdown('#### Source breakdown')
        bar_by_source(corporate_news, PURPLE)


# ── Science Trends ─────────────────────────────────────────────────────────────
with tab_science:
    st.subheader('🔬 Science & Technology Trends')
    st.caption('Publication trends by technology area · Sourced from PubMed')

    if not pub_counts.empty:
        st.markdown('#### Publication volume by topic')
        fig = px.line(pub_counts, x='year', y='publications', color='topic',
                      markers=True, line_shape='spline',
                      color_discrete_sequence=px.colors.qualitative.Set2)
        fig.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                          legend_title='', height=420)
        st.plotly_chart(fig, use_container_width=True)

        st.markdown('#### Topic comparison — latest year')
        latest = pub_counts[pub_counts['year'] == pub_counts['year'].max()].sort_values('publications', ascending=True)
        fig2 = px.bar(latest, x='publications', y='topic', orientation='h',
                      color='publications', color_continuous_scale='teal')
        fig2.update_layout(plot_bgcolor='white', paper_bgcolor='white',
                           yaxis_title='', coloraxis_showscale=False)
        st.plotly_chart(fig2, use_container_width=True)

    st.divider()
    st.markdown('#### Recent publications')
    topic_filter = st.selectbox(
        'Filter by topic',
        ['All'] + sorted(pub_df['topic'].unique().tolist()) if not pub_df.empty else ['All']
    )
    filtered_pubs = pub_df if topic_filter == 'All' else pub_df[pub_df['topic'] == topic_filter]

    for _, row in filtered_pubs.head(25).iterrows():
        st.markdown(f"""
        <div class="news-card" style="border-left-color:{COBALT}">
            <a href="{row['url']}" target="_blank">{row['title']}</a>
            <div class="meta">{row['journal']} · {row['date']} ·
                <span style="color:{JADE};font-weight:600">{row['topic']}</span>
            </div>
        </div>
        """, unsafe_allow_html=True)
