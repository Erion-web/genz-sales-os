export type DealType = 'retainer' | 'project'
export type Stage = 'New' | 'Contacted' | 'Follow-up 1' | 'Follow-up 2' | 'Negotiation' | 'Closed' | 'Dead'
export type Intent = 'cold' | 'warm' | 'hot' | 'urgent'
export type ActivityType = 'Called' | 'Messaged' | 'No answer' | 'Note'
export type Source = 'Referral' | 'Cold outreach' | 'Instagram' | 'TikTok' | 'LinkedIn' | 'Facebook' | 'Website' | 'Other'
export type Service = 'Meta Ads' | 'Google Ads' | 'TikTok Ads' | 'Social Media' | 'Branding' | 'Web Dev' | 'E-Commerce' | 'Automation' | 'Video' | 'SEO'
export type Role = 'admin' | 'sales_user'

export interface Meeting {
  date: string | null
  time: string | null
}

export interface Meetings {
  meeting1: Meeting | null
  meeting2: Meeting | null
  meeting3: Meeting | null
}

export interface Lead {
  id: string
  name: string
  company: string | null
  phone: string | null
  email: string | null
  deal_type: DealType | null
  monthly: number | null
  months: number
  project: number | null
  source: Source | null
  stage: Stage
  owner_id: string
  owner_name: string | null
  intent: Intent
  services: Service[] | null
  meetings: Meetings
  next_followup: string
  last_contact: string | null
  follow_up_count: number
  created_at: string
}

export interface Activity {
  id: string
  lead_id: string
  type: ActivityType
  note: string | null
  created_at: string
  owner_id: string
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: Role
  created_at: string
}

export const STAGES: Stage[] = ['New', 'Contacted', 'Follow-up 1', 'Follow-up 2', 'Negotiation', 'Closed', 'Dead']
export const SOURCES: Source[] = ['Referral', 'Cold outreach', 'Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'Website', 'Other']
export const SERVICES: Service[] = ['Meta Ads', 'Google Ads', 'TikTok Ads', 'Social Media', 'Branding', 'Web Dev', 'E-Commerce', 'Automation', 'Video', 'SEO']
export const INTENTS: Intent[] = ['cold', 'warm', 'hot', 'urgent']

export function getDealValue(lead: Lead): number {
  if (lead.deal_type === 'retainer') {
    return (lead.monthly || 0) * (lead.months || 6)
  }
  return lead.project || 0
}

export function getFollowupStatus(nextFollowup: string): 'overdue' | 'today' | 'upcoming' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const followup = new Date(nextFollowup)
  followup.setHours(0, 0, 0, 0)
  const diff = followup.getTime() - today.getTime()
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  return 'upcoming'
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const INTENT_COLORS: Record<Intent, string> = {
  cold: 'text-tx-2 bg-s3',
  warm: 'text-warning bg-warning/10',
  hot: 'text-danger bg-danger/10',
  urgent: 'text-accent bg-accent/10',
}

export const STAGE_COLORS: Record<Stage, string> = {
  'New': 'text-info bg-info/10',
  'Contacted': 'text-accent bg-accent/10',
  'Follow-up 1': 'text-warning bg-warning/10',
  'Follow-up 2': 'text-warning bg-warning/15',
  'Negotiation': 'text-success bg-success/10',
  'Closed': 'text-success bg-success/20',
  'Dead': 'text-tx-3 bg-s3',
}
