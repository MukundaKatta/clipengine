export type Platform =
  | "twitter"
  | "linkedin"
  | "instagram"
  | "youtube_shorts"
  | "newsletter"
  | "blog"
  | "quote_graphic";

export type ContentStatus =
  | "pending"
  | "processing"
  | "transcribing"
  | "generating"
  | "completed"
  | "failed";

export type OutputStatus = "draft" | "approved" | "scheduled" | "published" | "failed";

export type SubscriptionTier = "free" | "starter" | "pro" | "enterprise";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  monthly_credits: number;
  credits_used: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  status: ContentStatus;
  source_type: "podcast" | "video" | "article" | "text";
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SourceContent {
  id: string;
  project_id: string;
  organization_id: string;
  content_type: "audio" | "video" | "text" | "url";
  original_url: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  raw_text: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Transcription {
  id: string;
  source_content_id: string;
  organization_id: string;
  provider: "whisper" | "assemblyai";
  full_text: string;
  segments: TranscriptionSegment[];
  speakers: Speaker[];
  language: string;
  confidence: number;
  word_count: number;
  created_at: string;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  confidence: number;
}

export interface Speaker {
  id: string;
  label: string;
  segments_count: number;
}

export interface GeneratedOutput {
  id: string;
  project_id: string;
  organization_id: string;
  transcription_id: string | null;
  platform: Platform;
  output_type: string;
  title: string | null;
  content: string;
  structured_content: Record<string, unknown> | null;
  image_urls: string[];
  status: OutputStatus;
  brand_profile_id: string | null;
  template_id: string | null;
  ai_model: string;
  token_usage: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BrandProfile {
  id: string;
  organization_id: string;
  name: string;
  voice_description: string;
  tone_attributes: string[];
  vocabulary_preferences: VocabularyPreferences;
  example_content: string[];
  platform_guidelines: Partial<Record<Platform, PlatformGuideline>>;
  trained_model_data: Record<string, unknown> | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface VocabularyPreferences {
  preferred_words: string[];
  avoided_words: string[];
  industry_jargon: string[];
  formality_level: "casual" | "conversational" | "professional" | "formal";
}

export interface PlatformGuideline {
  max_length: number;
  hashtag_strategy: string;
  emoji_usage: "none" | "minimal" | "moderate" | "heavy";
  cta_style: string;
  additional_notes: string;
}

export interface ScheduledPost {
  id: string;
  generated_output_id: string;
  organization_id: string;
  platform: Platform;
  scheduled_at: string;
  published_at: string | null;
  external_post_id: string | null;
  status: "pending" | "scheduled" | "published" | "failed" | "cancelled";
  buffer_post_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutputTemplate {
  id: string;
  organization_id: string | null;
  platform: Platform;
  name: string;
  description: string;
  prompt_template: string;
  output_schema: Record<string, unknown>;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Organization, "id" | "created_at">>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Project, "id" | "created_at">>;
      };
      source_content: {
        Row: SourceContent;
        Insert: Omit<SourceContent, "id" | "created_at">;
        Update: Partial<Omit<SourceContent, "id" | "created_at">>;
      };
      transcriptions: {
        Row: Transcription;
        Insert: Omit<Transcription, "id" | "created_at">;
        Update: Partial<Omit<Transcription, "id" | "created_at">>;
      };
      generated_outputs: {
        Row: GeneratedOutput;
        Insert: Omit<GeneratedOutput, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<GeneratedOutput, "id" | "created_at">>;
      };
      brand_profiles: {
        Row: BrandProfile;
        Insert: Omit<BrandProfile, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BrandProfile, "id" | "created_at">>;
      };
      scheduled_posts: {
        Row: ScheduledPost;
        Insert: Omit<ScheduledPost, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ScheduledPost, "id" | "created_at">>;
      };
      output_templates: {
        Row: OutputTemplate;
        Insert: Omit<OutputTemplate, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<OutputTemplate, "id" | "created_at">>;
      };
    };
  };
}
