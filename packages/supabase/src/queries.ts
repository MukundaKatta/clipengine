import type { TypedSupabaseClient } from "./client";
import type {
  Platform,
  ContentStatus,
  OutputStatus,
  Project,
  GeneratedOutput,
  BrandProfile,
  ScheduledPost,
} from "./types";

// ─── Organization Queries ───────────────────────────────────────────

export async function getOrganization(client: TypedSupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  if (error) throw error;
  return data;
}

export async function getOrganizationBySlug(client: TypedSupabaseClient, slug: string) {
  const { data, error } = await client
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrganizationCredits(
  client: TypedSupabaseClient,
  orgId: string,
  creditsUsed: number
) {
  const { data, error } = await client
    .from("organizations")
    .update({ credits_used: creditsUsed })
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Project Queries ────────────────────────────────────────────────

export async function listProjects(
  client: TypedSupabaseClient,
  orgId: string,
  options?: { status?: ContentStatus; limit?: number; offset?: number }
) {
  let query = client
    .from("projects")
    .select("*, source_content(*), generated_outputs(count)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (options?.status) query = query.eq("status", options.status);
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { projects: data, total: count };
}

export async function getProject(client: TypedSupabaseClient, projectId: string) {
  const { data, error } = await client
    .from("projects")
    .select(`
      *,
      source_content(*),
      transcriptions(*),
      generated_outputs(*)
    `)
    .eq("id", projectId)
    .single();

  if (error) throw error;
  return data;
}

export async function createProject(
  client: TypedSupabaseClient,
  project: Omit<Project, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await client
    .from("projects")
    .insert(project)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProjectStatus(
  client: TypedSupabaseClient,
  projectId: string,
  status: ContentStatus
) {
  const { data, error } = await client
    .from("projects")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Source Content Queries ─────────────────────────────────────────

export async function createSourceContent(
  client: TypedSupabaseClient,
  content: {
    project_id: string;
    organization_id: string;
    content_type: "audio" | "video" | "text" | "url";
    original_url?: string;
    storage_path?: string;
    file_name?: string;
    file_size?: number;
    duration_seconds?: number;
    raw_text?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { data, error } = await client
    .from("source_content")
    .insert({
      ...content,
      original_url: content.original_url ?? null,
      storage_path: content.storage_path ?? null,
      file_name: content.file_name ?? null,
      file_size: content.file_size ?? null,
      duration_seconds: content.duration_seconds ?? null,
      raw_text: content.raw_text ?? null,
      metadata: content.metadata ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Transcription Queries ──────────────────────────────────────────

export async function createTranscription(
  client: TypedSupabaseClient,
  transcription: {
    source_content_id: string;
    organization_id: string;
    provider: "whisper" | "assemblyai";
    full_text: string;
    segments: unknown[];
    speakers: unknown[];
    language: string;
    confidence: number;
    word_count: number;
  }
) {
  const { data, error } = await client
    .from("transcriptions")
    .insert(transcription)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getTranscription(client: TypedSupabaseClient, transcriptionId: string) {
  const { data, error } = await client
    .from("transcriptions")
    .select("*")
    .eq("id", transcriptionId)
    .single();

  if (error) throw error;
  return data;
}

// ─── Generated Output Queries ───────────────────────────────────────

export async function listOutputs(
  client: TypedSupabaseClient,
  orgId: string,
  options?: {
    platform?: Platform;
    status?: OutputStatus;
    projectId?: string;
    limit?: number;
    offset?: number;
  }
) {
  let query = client
    .from("generated_outputs")
    .select("*, projects(name)", { count: "exact" })
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (options?.platform) query = query.eq("platform", options.platform);
  if (options?.status) query = query.eq("status", options.status);
  if (options?.projectId) query = query.eq("project_id", options.projectId);
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { outputs: data, total: count };
}

export async function createGeneratedOutput(
  client: TypedSupabaseClient,
  output: Omit<GeneratedOutput, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await client
    .from("generated_outputs")
    .insert(output)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOutputStatus(
  client: TypedSupabaseClient,
  outputId: string,
  status: OutputStatus
) {
  const { data, error } = await client
    .from("generated_outputs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", outputId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Brand Profile Queries ──────────────────────────────────────────

export async function listBrandProfiles(client: TypedSupabaseClient, orgId: string) {
  const { data, error } = await client
    .from("brand_profiles")
    .select("*")
    .eq("organization_id", orgId)
    .order("is_default", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getBrandProfile(client: TypedSupabaseClient, profileId: string) {
  const { data, error } = await client
    .from("brand_profiles")
    .select("*")
    .eq("id", profileId)
    .single();

  if (error) throw error;
  return data;
}

export async function createBrandProfile(
  client: TypedSupabaseClient,
  profile: Omit<BrandProfile, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await client
    .from("brand_profiles")
    .insert(profile)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBrandProfile(
  client: TypedSupabaseClient,
  profileId: string,
  updates: Partial<BrandProfile>
) {
  const { data, error } = await client
    .from("brand_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", profileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Schedule Queries ───────────────────────────────────────────────

export async function listScheduledPosts(
  client: TypedSupabaseClient,
  orgId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    platform?: Platform;
    status?: ScheduledPost["status"];
  }
) {
  let query = client
    .from("scheduled_posts")
    .select("*, generated_outputs(*, projects(name))")
    .eq("organization_id", orgId)
    .order("scheduled_at", { ascending: true });

  if (options?.startDate) query = query.gte("scheduled_at", options.startDate);
  if (options?.endDate) query = query.lte("scheduled_at", options.endDate);
  if (options?.platform) query = query.eq("platform", options.platform);
  if (options?.status) query = query.eq("status", options.status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createScheduledPost(
  client: TypedSupabaseClient,
  post: Omit<ScheduledPost, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await client
    .from("scheduled_posts")
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateScheduledPost(
  client: TypedSupabaseClient,
  postId: string,
  updates: Partial<ScheduledPost>
) {
  const { data, error } = await client
    .from("scheduled_posts")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Template Queries ───────────────────────────────────────────────

export async function listTemplates(
  client: TypedSupabaseClient,
  orgId: string,
  platform?: Platform
) {
  let query = client
    .from("output_templates")
    .select("*")
    .or(`organization_id.eq.${orgId},is_system.eq.true`)
    .order("is_system", { ascending: false });

  if (platform) query = query.eq("platform", platform);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createTemplate(
  client: TypedSupabaseClient,
  template: Omit<OutputTemplate, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await client
    .from("output_templates")
    .insert(template)
    .select()
    .single();

  if (error) throw error;
  return data;
}
