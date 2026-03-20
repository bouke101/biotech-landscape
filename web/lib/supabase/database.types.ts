export type CompanyStage = 'Stealth' | 'Pre-seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C' | 'Series D+' | 'Public' | 'Acquired'
export type BusinessModel = 'B2B' | 'B2C' | 'Licensing' | 'Platform' | 'Mixed'
export type InvestorType = 'VC' | 'CVC' | 'Family Office' | 'Government' | 'Accelerator' | 'Angel' | 'PE'
export type DealType = 'Pre-seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C' | 'Series D+' | 'Grant' | 'IPO' | 'M&A' | 'Convertible'
export type Currency = 'USD' | 'EUR' | 'GBP'

export interface Company {
  id: string
  name: string
  slug: string
  founded_year: number | null
  hq_city: string | null
  hq_country: string | null
  hq_region: string | null
  sectors: string[]
  technology_platform: string | null
  stage: CompanyStage | null
  employees_approx: number | null
  total_funding_usd: number | null
  latest_valuation_usd: number | null
  key_products: string | null
  business_model: BusinessModel | null
  partnerships: string | null
  ceo: string | null
  cso: string | null
  cto: string | null
  website: string | null
  notes: string | null
  on_watchlist: boolean
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

export interface Investor {
  id: string
  name: string
  slug: string
  investor_type: InvestorType | null
  hq_country: string | null
  hq_region: string | null
  focus_sectors: string[]
  focus_stages: string[]
  geographic_focus: string[]
  fund_size_usd: number | null
  typical_check_min: number | null
  typical_check_max: number | null
  notable_portfolio: string[]
  key_partners: string | null
  co_investment_pref: string | null
  website: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  company_id: string | null
  company_name: string
  deal_type: DealType
  amount: number | null
  currency: Currency
  amount_usd: number | null
  deal_date: string
  lead_investors: string[]
  co_investors: string[]
  valuation_pre: number | null
  valuation_post: number | null
  use_of_funds: string | null
  source_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Trend {
  id: string
  theme: string
  slug: string
  related_sectors: string[]
  geographic_momentum: string | null
  key_companies: string[]
  key_investors: string[]
  timeline_stage: string | null
  evidence: string | null
  analysis_note: string | null
  published: boolean
  created_at: string
  updated_at: string
}

export type ScraperStatus = 'running' | 'paused' | 'stopped' | 'completed' | 'failed'
export type ScraperSignal = 'run' | 'pause' | 'stop'

export interface ScraperJob {
  id: string
  run_id: string
  trigger: 'scheduled' | 'manual' | 'ui'
  status: ScraperStatus | 'pending'
  signal: ScraperSignal
  current_feed: string | null
  feeds_total: number
  feeds_done: number
  articles_fetched: number
  articles_new: number
  error_message: string | null
  focus_topic: string | null
  focus_geography: string | null
  focus_type: 'startups' | 'investment' | 'all' | null
  started_at: string
  paused_at: string | null
  completed_at: string | null
  created_at: string
}

export interface ScrapedArticle {
  id: string
  job_id: string | null
  source: string
  source_type: string
  title: string
  summary: string | null
  source_url: string
  published_at: string | null
  raw_content: Record<string, unknown> | null
  segments: string[]
  deal_extracted: boolean
  company_name_hint: string | null
  amount_hint: string | null
  round_type_hint: string | null
  investors_hint: string[]
  linked_deal_id: string | null
  linked_company_id: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company
        Insert: {
          name: string
          slug: string
          sectors?: string[]
          founded_year?: number | null
          website?: string | null
          stage?: CompanyStage | null
          business_model?: BusinessModel | null
          technology_platform?: string | null
          key_products?: string | null
          hq_city?: string | null
          hq_country?: string | null
          hq_region?: string | null
          total_funding_usd?: number | null
          latest_valuation_usd?: number | null
          employees_approx?: number | null
          ceo?: string | null
          cso?: string | null
          cto?: string | null
          partnerships?: string | null
          notes?: string | null
          on_watchlist?: boolean
          lat?: number | null
          lng?: number | null
        }
        Update: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>
      }
      investors: {
        Row: Investor
        Insert: {
          name: string
          slug: string
          investor_type?: InvestorType | null
          hq_country?: string | null
          hq_region?: string | null
          focus_sectors?: string[]
          focus_stages?: string[]
          geographic_focus?: string[]
          fund_size_usd?: number | null
          typical_check_min?: number | null
          typical_check_max?: number | null
          notable_portfolio?: string[]
          key_partners?: string | null
          co_investment_pref?: string | null
          website?: string | null
          notes?: string | null
        }
        Update: Partial<Omit<Investor, 'id' | 'created_at' | 'updated_at'>>
      }
      deals: {
        Row: Deal
        Insert: {
          company_id?: string | null
          company_name: string
          deal_type: DealType
          amount?: number | null
          currency?: Currency
          amount_usd?: number | null
          deal_date: string
          lead_investors?: string[]
          co_investors?: string[]
          valuation_pre?: number | null
          valuation_post?: number | null
          use_of_funds?: string | null
          source_url?: string | null
          notes?: string | null
        }
        Update: Partial<Omit<Deal, 'id' | 'created_at' | 'updated_at'>>
      }
      trends: {
        Row: Trend
        Insert: {
          theme: string
          slug: string
          related_sectors?: string[]
          geographic_momentum?: string | null
          key_companies?: string[]
          key_investors?: string[]
          timeline_stage?: string | null
          evidence?: string | null
          analysis_note?: string | null
          published?: boolean
        }
        Update: Partial<Omit<Trend, 'id' | 'created_at' | 'updated_at'>>
      }
      scraper_jobs: {
        Row: ScraperJob
        Insert: {
          run_id: string
          trigger: 'scheduled' | 'manual' | 'ui'
          status: ScraperStatus | 'pending'
          signal: ScraperSignal
          current_feed?: string | null
          feeds_total: number
          feeds_done: number
          articles_fetched: number
          articles_new: number
          error_message?: string | null
          focus_topic?: string | null
          focus_geography?: string | null
          focus_type?: 'startups' | 'investment' | 'all' | null
          started_at: string
          paused_at?: string | null
          completed_at?: string | null
        }
        Update: Partial<Omit<ScraperJob, 'id' | 'created_at'>>
      }
      scraped_articles: {
        Row: ScrapedArticle
        Insert: {
          job_id?: string | null
          source: string
          source_type: string
          title: string
          summary?: string | null
          source_url: string
          published_at?: string | null
          raw_content?: Record<string, unknown> | null
          segments?: string[]
          deal_extracted?: boolean
          company_name_hint?: string | null
          amount_hint?: string | null
          round_type_hint?: string | null
          investors_hint?: string[]
          linked_deal_id?: string | null
          linked_company_id?: string | null
        }
        Update: Partial<Omit<ScrapedArticle, 'id' | 'created_at'>>
      }
    }
  }
}
