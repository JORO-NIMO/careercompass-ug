import { createSupabaseServiceClient } from "../_shared/sbClient.ts";
import {
  verifyAuth,
  unauthorizedResponse,
  handleCors,
} from "../_shared/auth.ts";
import {
  jsonError,
  jsonSuccess,
  withRateLimitHeaders,
  withRequestIdHeaders,
  jsonErrorWithId,
  problemJson,
} from "../_shared/responses.ts";
import {
  checkRateLimitUnified as checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  RATE_LIMITS,
} from "../../_shared/rateLimit.ts";
import { getRequestId } from "../../_shared/request.ts";
import { z } from "npm:zod";
import xss from "npm:xss";

function sanitizeHtml(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const sanitized = xss(input, {
    whiteList: {
      a: ["href", "title", "target", "rel"],
      b: [],
      strong: [],
      i: [],
      em: [],
      u: [],
      p: [],
      br: [],
      span: ["class", "style"],
      h1: [],
      h2: [],
      h3: [],
      h4: [],
      h5: [],
      h6: [],
      ul: [],
      ol: [],
      li: [],
      blockquote: [],
      code: [],
      pre: [],
      img: ["src", "alt", "title"],
    },
    css: false,
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
  });
  return sanitized;
}

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

export default async function (req: Request) {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const reqId = getRequestId(req);
  const { user, error } = await verifyAuth(req);
  if (error || !user) {
    return jsonErrorWithId(
      error || "Authentication required",
      401,
      {},
      {},
      reqId,
    );
  }

  const supabase = createSupabaseServiceClient();

  // Admin check
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return jsonErrorWithId("Admin role required", 403, {}, {}, reqId);
  }

  // Rate limit admin operations
  const clientId = getClientIdentifier(req, user.id);
  const limit = await checkRateLimit(clientId, RATE_LIMITS.admin);
  if (!limit.allowed) {
    return rateLimitExceededResponse(limit.resetAt, reqId);
  }
  const rateHeaders = withRequestIdHeaders(
    withRateLimitHeaders({}, limit.remaining, limit.resetAt),
    reqId,
  );

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const adminIdx = parts.indexOf("admin_posts");
  const sub = adminIdx === -1 ? [] : parts.slice(adminIdx + 1);
  const postId = sub[0] ?? null;

  try {
    if (req.method === "GET" && !postId) {
      const { data, error: fetchError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (fetchError)
        return jsonErrorWithId(
          "Failed to load posts",
          500,
          {},
          rateHeaders,
          reqId,
        );
      return jsonSuccess({ items: data ?? [] }, 200, rateHeaders);
    }

    if (req.method === "POST" && !postId) {
      const PostCreateSchema = z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1).max(10000),
        category: z.enum(["Placements", "Announcements", "Updates"]),
        status: z.enum(["draft", "published", "archived"]),
        image_url: z.string().url().nullable().optional(),
        cta_text: z.string().max(120).nullable().optional(),
        cta_link: z.string().url().nullable().optional(),
      });
      const rawPayload = await req.json().catch(() => ({}));
      const parse = PostCreateSchema.safeParse(rawPayload);
      if (!parse.success) {
        return problemJson(
          "https://www.placementbridge.org/errors/invalid_payload",
          "Invalid payload",
          400,
          "Payload validation failed",
          { issues: parse.error.issues },
          rateHeaders,
          reqId,
        );
      }
      const payload = parse.data;

      const { data, error: insertError } = await supabase
        .from("posts")
        .insert({
          title: payload.title,
          content: sanitizeHtml(payload.content)!,
          category: payload.category,
          status: payload.status,
          image_url: payload.image_url,
          cta_text: payload.cta_text,
          cta_link: payload.cta_link,
          author_id: user.id,
          published_at:
            payload.status === "published" ? new Date().toISOString() : null,
        })
        .select("*")
        .maybeSingle();

      if (insertError) {
        console.error("admin_posts insert error", insertError);
        return jsonErrorWithId(
          "Failed to create post",
          500,
          {},
          rateHeaders,
          reqId,
        );
      }

      return jsonSuccess({ item: data }, 201, rateHeaders);
    }

    if (req.method === "PUT" && postId) {
      const PostUpdateSchema = z.object({
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(1).max(10000).optional(),
        category: z.enum(["Placements", "Announcements", "Updates"]).optional(),
        status: z.enum(["draft", "published", "archived"]).optional(),
        image_url: z.string().url().nullable().optional(),
        cta_text: z.string().max(120).nullable().optional(),
        cta_link: z.string().url().nullable().optional(),
      });
      const rawUpdate = await req.json().catch(() => ({}));
      const parsedUpdate = PostUpdateSchema.safeParse(rawUpdate);
      if (!parsedUpdate.success) {
        return problemJson(
          "https://www.placementbridge.org/errors/invalid_payload",
          "Invalid payload",
          400,
          "Update validation failed",
          { issues: parsedUpdate.error.issues },
          rateHeaders,
          reqId,
        );
      }
      const payload = parsedUpdate.data;
      const updates: Record<string, unknown> = {};
      if (payload.title !== undefined) updates.title = payload.title.trim();
      if (payload.content !== undefined)
        updates.content = sanitizeHtml(payload.content);
      if (payload.category !== undefined) updates.category = payload.category;
      if (payload.status !== undefined) updates.status = payload.status;
      if (payload.image_url !== undefined)
        updates.image_url = payload.image_url;
      if (payload.cta_text !== undefined) updates.cta_text = payload.cta_text;
      if (payload.cta_link !== undefined) updates.cta_link = payload.cta_link;

      updates.updated_at = new Date().toISOString();
      if (updates.status === "published") {
        updates.published_at = new Date().toISOString();
      }

      const { data, error: updateError } = await supabase
        .from("posts")
        .update(updates)
        .eq("id", postId)
        .select("*")
        .maybeSingle();

      if (updateError) {
        console.error("admin_posts update error", updateError);
        return jsonErrorWithId(
          "Failed to update post",
          500,
          {},
          rateHeaders,
          reqId,
        );
      }

      return jsonSuccess({ item: data }, 200, rateHeaders);
    }

    if (req.method === "DELETE" && postId) {
      const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);
      if (deleteError)
        return jsonErrorWithId(
          "Failed to delete post",
          500,
          {},
          rateHeaders,
          reqId,
        );
      return jsonSuccess({}, 200, rateHeaders);
    }

    return jsonErrorWithId("Not found", 404, {}, rateHeaders, reqId);
  } catch (err) {
    console.error("admin_posts handler error", err);
    return jsonErrorWithId(
      "Internal server error",
      500,
      {},
      rateHeaders,
      reqId,
    );
  }
}
