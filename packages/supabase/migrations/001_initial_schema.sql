-- ClipEngine Database Schema
-- Initial migration: all core tables with RLS policies

-- ─── Extensions ─────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ─── Custom Types ───────────────────────────────────────────────────
create type platform_type as enum (
  'twitter', 'linkedin', 'instagram', 'youtube_shorts',
  'newsletter', 'blog', 'quote_graphic'
);

create type content_status as enum (
  'pending', 'processing', 'transcribing', 'generating', 'completed', 'failed'
);

create type output_status as enum (
  'draft', 'approved', 'scheduled', 'published', 'failed'
);

create type subscription_tier as enum (
  'free', 'starter', 'pro', 'enterprise'
);

create type source_content_type as enum (
  'audio', 'video', 'text', 'url'
);

create type source_type as enum (
  'podcast', 'video', 'article', 'text'
);

create type transcription_provider as enum (
  'whisper', 'assemblyai'
);

create type schedule_status as enum (
  'pending', 'scheduled', 'published', 'failed', 'cancelled'
);

create type formality_level as enum (
  'casual', 'conversational', 'professional', 'formal'
);

create type emoji_usage as enum (
  'none', 'minimal', 'moderate', 'heavy'
);

-- ─── Organizations ──────────────────────────────────────────────────
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  subscription_tier subscription_tier not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  monthly_credits integer not null default 100,
  credits_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organizations_owner on organizations(owner_id);
create index idx_organizations_slug on organizations(slug);

-- ─── Organization Members (for multi-user orgs) ────────────────────
create table organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

create index idx_org_members_user on organization_members(user_id);
create index idx_org_members_org on organization_members(organization_id);

-- ─── Projects ───────────────────────────────────────────────────────
create table projects (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  status content_status not null default 'pending',
  source_type source_type not null default 'text',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_projects_org on projects(organization_id);
create index idx_projects_status on projects(status);
create index idx_projects_created on projects(created_at desc);

-- ─── Source Content ─────────────────────────────────────────────────
create table source_content (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  content_type source_content_type not null,
  original_url text,
  storage_path text,
  file_name text,
  file_size bigint,
  duration_seconds integer,
  raw_text text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_source_content_project on source_content(project_id);
create index idx_source_content_org on source_content(organization_id);

-- ─── Transcriptions ────────────────────────────────────────────────
create table transcriptions (
  id uuid primary key default uuid_generate_v4(),
  source_content_id uuid not null references source_content(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  provider transcription_provider not null,
  full_text text not null,
  segments jsonb not null default '[]',
  speakers jsonb not null default '[]',
  language text not null default 'en',
  confidence real not null default 0,
  word_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_transcriptions_source on transcriptions(source_content_id);
create index idx_transcriptions_org on transcriptions(organization_id);

-- ─── Brand Profiles ────────────────────────────────────────────────
create table brand_profiles (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  voice_description text not null default '',
  tone_attributes text[] not null default '{}',
  vocabulary_preferences jsonb not null default '{"preferred_words":[],"avoided_words":[],"industry_jargon":[],"formality_level":"conversational"}',
  example_content text[] not null default '{}',
  platform_guidelines jsonb not null default '{}',
  trained_model_data jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_brand_profiles_org on brand_profiles(organization_id);

-- ─── Output Templates ──────────────────────────────────────────────
create table output_templates (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  platform platform_type not null,
  name text not null,
  description text not null default '',
  prompt_template text not null,
  output_schema jsonb not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_templates_org on output_templates(organization_id);
create index idx_templates_platform on output_templates(platform);

-- ─── Generated Outputs ─────────────────────────────────────────────
create table generated_outputs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  transcription_id uuid references transcriptions(id) on delete set null,
  platform platform_type not null,
  output_type text not null default 'standard',
  title text,
  content text not null,
  structured_content jsonb,
  image_urls text[] not null default '{}',
  status output_status not null default 'draft',
  brand_profile_id uuid references brand_profiles(id) on delete set null,
  template_id uuid references output_templates(id) on delete set null,
  ai_model text not null default 'claude-sonnet-4-20250514',
  token_usage integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_outputs_project on generated_outputs(project_id);
create index idx_outputs_org on generated_outputs(organization_id);
create index idx_outputs_platform on generated_outputs(platform);
create index idx_outputs_status on generated_outputs(status);
create index idx_outputs_created on generated_outputs(created_at desc);

-- ─── Scheduled Posts ────────────────────────────────────────────────
create table scheduled_posts (
  id uuid primary key default uuid_generate_v4(),
  generated_output_id uuid not null references generated_outputs(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  platform platform_type not null,
  scheduled_at timestamptz not null,
  published_at timestamptz,
  external_post_id text,
  status schedule_status not null default 'pending',
  buffer_post_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_scheduled_org on scheduled_posts(organization_id);
create index idx_scheduled_at on scheduled_posts(scheduled_at);
create index idx_scheduled_status on scheduled_posts(status);

-- ─── Helper function: check org membership ─────────────────────────
create or replace function auth.user_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id from organization_members
  where user_id = auth.uid()
  union
  select id from organizations
  where owner_id = auth.uid()
$$;

-- ─── Row Level Security ────────────────────────────────────────────

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table projects enable row level security;
alter table source_content enable row level security;
alter table transcriptions enable row level security;
alter table brand_profiles enable row level security;
alter table output_templates enable row level security;
alter table generated_outputs enable row level security;
alter table scheduled_posts enable row level security;

-- Organizations: users can see/edit their own orgs
create policy "Users can view own organizations"
  on organizations for select
  using (id in (select auth.user_org_ids()));

create policy "Users can create organizations"
  on organizations for insert
  with check (owner_id = auth.uid());

create policy "Owners can update their organizations"
  on organizations for update
  using (owner_id = auth.uid());

-- Organization Members
create policy "Members can view their org memberships"
  on organization_members for select
  using (organization_id in (select auth.user_org_ids()));

create policy "Owners can manage members"
  on organization_members for all
  using (
    organization_id in (
      select id from organizations where owner_id = auth.uid()
    )
  );

-- Projects
create policy "Org members can view projects"
  on projects for select
  using (organization_id in (select auth.user_org_ids()));

create policy "Org members can create projects"
  on projects for insert
  with check (organization_id in (select auth.user_org_ids()));

create policy "Org members can update projects"
  on projects for update
  using (organization_id in (select auth.user_org_ids()));

create policy "Org members can delete projects"
  on projects for delete
  using (organization_id in (select auth.user_org_ids()));

-- Source Content
create policy "Org members can view source content"
  on source_content for select
  using (organization_id in (select auth.user_org_ids()));

create policy "Org members can create source content"
  on source_content for insert
  with check (organization_id in (select auth.user_org_ids()));

-- Transcriptions
create policy "Org members can view transcriptions"
  on transcriptions for select
  using (organization_id in (select auth.user_org_ids()));

create policy "Org members can create transcriptions"
  on transcriptions for insert
  with check (organization_id in (select auth.user_org_ids()));

-- Brand Profiles
create policy "Org members can view brand profiles"
  on brand_profiles for select
  using (organization_id in (select auth.user_org_ids()));

create policy "Org members can manage brand profiles"
  on brand_profiles for all
  using (organization_id in (select auth.user_org_ids()));

-- Output Templates
create policy "Users can view system and own templates"
  on output_templates for select
  using (is_system = true or organization_id in (select auth.user_org_ids()));

create policy "Org members can manage own templates"
  on output_templates for all
  using (organization_id in (select auth.user_org_ids()));

-- Generated Outputs
create policy "Org members can view outputs"
  on generated_outputs for select
  using (organization_id in (select auth.user_org_ids()));

create policy "Org members can create outputs"
  on generated_outputs for insert
  with check (organization_id in (select auth.user_org_ids()));

create policy "Org members can update outputs"
  on generated_outputs for update
  using (organization_id in (select auth.user_org_ids()));

create policy "Org members can delete outputs"
  on generated_outputs for delete
  using (organization_id in (select auth.user_org_ids()));

-- Scheduled Posts
create policy "Org members can view scheduled posts"
  on scheduled_posts for select
  using (organization_id in (select auth.user_org_ids()));

create policy "Org members can manage scheduled posts"
  on scheduled_posts for all
  using (organization_id in (select auth.user_org_ids()));

-- ─── Updated_at trigger ─────────────────────────────────────────────

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_organizations_updated_at
  before update on organizations
  for each row execute function update_updated_at_column();

create trigger update_projects_updated_at
  before update on projects
  for each row execute function update_updated_at_column();

create trigger update_brand_profiles_updated_at
  before update on brand_profiles
  for each row execute function update_updated_at_column();

create trigger update_output_templates_updated_at
  before update on output_templates
  for each row execute function update_updated_at_column();

create trigger update_generated_outputs_updated_at
  before update on generated_outputs
  for each row execute function update_updated_at_column();

create trigger update_scheduled_posts_updated_at
  before update on scheduled_posts
  for each row execute function update_updated_at_column();

-- ─── Storage Buckets ────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('source-media', 'source-media', false, 524288000, array['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('generated-images', 'generated-images', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Storage policies
create policy "Org members can upload source media"
  on storage.objects for insert
  with check (
    bucket_id = 'source-media' and
    (storage.foldername(name))[1]::uuid in (select auth.user_org_ids())
  );

create policy "Org members can view source media"
  on storage.objects for select
  using (
    bucket_id = 'source-media' and
    (storage.foldername(name))[1]::uuid in (select auth.user_org_ids())
  );

create policy "Anyone can view generated images"
  on storage.objects for select
  using (bucket_id = 'generated-images');

create policy "Org members can upload generated images"
  on storage.objects for insert
  with check (
    bucket_id = 'generated-images' and
    (storage.foldername(name))[1]::uuid in (select auth.user_org_ids())
  );

-- ─── Seed system templates ──────────────────────────────────────────

insert into output_templates (platform, name, description, prompt_template, output_schema, is_system) values
(
  'twitter',
  'Twitter Thread',
  'Convert content into an engaging Twitter thread with hooks and CTAs',
  'Transform the following content into a Twitter/X thread. Rules:
- First tweet must be a powerful hook that stops the scroll
- Each tweet must be under 280 characters
- Use line breaks for readability
- Include a strong CTA in the final tweet
- Aim for 5-10 tweets
- No hashtags in thread body, only in last tweet
- Use "→" or numbered lists for structure',
  '{"type":"object","properties":{"tweets":{"type":"array","items":{"type":"string"}},"hashtags":{"type":"array","items":{"type":"string"}}}}',
  true
),
(
  'linkedin',
  'LinkedIn Post',
  'Create a professional LinkedIn post with engagement hooks',
  'Transform the following content into a LinkedIn post. Rules:
- Start with a bold, attention-grabbing first line (hook)
- Use short paragraphs (1-2 sentences max)
- Include line breaks between paragraphs for mobile readability
- Add a personal insight or opinion angle
- End with a question or CTA to drive comments
- Keep under 3000 characters
- Use 3-5 relevant hashtags at the end',
  '{"type":"object","properties":{"hook":{"type":"string"},"body":{"type":"string"},"cta":{"type":"string"},"hashtags":{"type":"array","items":{"type":"string"}}}}',
  true
),
(
  'instagram',
  'Instagram Carousel',
  'Design content for an Instagram carousel post (slides)',
  'Transform the following content into an Instagram carousel. Rules:
- Slide 1: Eye-catching title/hook
- Slides 2-8: Key points, one per slide
- Last slide: Summary + CTA
- Each slide should have a headline and 1-2 supporting lines
- Keep text minimal (designed for visual format)
- Suggest colors/imagery themes',
  '{"type":"object","properties":{"slides":{"type":"array","items":{"type":"object","properties":{"headline":{"type":"string"},"body":{"type":"string"},"design_notes":{"type":"string"}}}},"caption":{"type":"string"},"hashtags":{"type":"array","items":{"type":"string"}}}}',
  true
),
(
  'youtube_shorts',
  'YouTube Shorts Script',
  'Create a short-form video script (30-60 seconds)',
  'Transform the following content into a YouTube Shorts script. Rules:
- Duration: 30-60 seconds when spoken
- Start with an immediate hook (first 3 seconds)
- Use conversational, energetic tone
- Include visual/B-roll suggestions
- End with a subscribe CTA or cliffhanger
- Include on-screen text suggestions',
  '{"type":"object","properties":{"hook":{"type":"string"},"script_segments":{"type":"array","items":{"type":"object","properties":{"narration":{"type":"string"},"visual":{"type":"string"},"on_screen_text":{"type":"string"},"duration_seconds":{"type":"number"}}}},"cta":{"type":"string"}}}',
  true
),
(
  'newsletter',
  'Newsletter Segment',
  'Create a newsletter section from the content',
  'Transform the following content into a newsletter segment. Rules:
- Compelling subject line / section header
- Opening that connects to reader pain points
- 3-5 key takeaways with brief explanations
- Actionable advice they can implement today
- Conversational but professional tone
- Include a "TLDR" at the top
- 400-600 words',
  '{"type":"object","properties":{"subject_line":{"type":"string"},"tldr":{"type":"string"},"intro":{"type":"string"},"takeaways":{"type":"array","items":{"type":"object","properties":{"title":{"type":"string"},"explanation":{"type":"string"}}}},"closing":{"type":"string"}}}',
  true
),
(
  'blog',
  'Blog Post',
  'Create a full SEO-optimized blog post',
  'Transform the following content into a comprehensive blog post. Rules:
- SEO-optimized title (under 60 chars)
- Meta description (under 160 chars)
- Introduction with hook and preview
- H2/H3 subheadings for structure
- 800-1500 words
- Include internal linking suggestions
- End with key takeaways and CTA
- Suggest 5 target keywords',
  '{"type":"object","properties":{"title":{"type":"string"},"meta_description":{"type":"string"},"keywords":{"type":"array","items":{"type":"string"}},"sections":{"type":"array","items":{"type":"object","properties":{"heading":{"type":"string"},"level":{"type":"number"},"content":{"type":"string"}}}},"takeaways":{"type":"array","items":{"type":"string"}},"cta":{"type":"string"}}}',
  true
),
(
  'quote_graphic',
  'Quote Graphics',
  'Extract quotable moments for shareable graphics',
  'Extract the most impactful, shareable quotes from the following content. Rules:
- Find 3-5 standalone quotes that work out of context
- Each quote should be powerful, concise (under 150 chars ideally)
- Include the speaker attribution if available
- Suggest background theme/color for each
- Quotes should be diverse in topic/angle',
  '{"type":"object","properties":{"quotes":{"type":"array","items":{"type":"object","properties":{"text":{"type":"string"},"attribution":{"type":"string"},"theme":{"type":"string"},"background_color":{"type":"string"}}}}}}',
  true
)
on conflict do nothing;
