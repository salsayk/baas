import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/auth";
import { getOpenAiEnvStatus, resolveOpenAiKeyForRequest } from "@/app/lib/openai-env";
import { getDbClient } from "@/database/accounts/db-client";
import { generateSummary } from "./chain";
import { parseGitHubUrl, fetchAllRepoData } from "@/app/lib/githubUtils";

// Calculate language percentages from bytes
function calculateLanguagePercentages(languages: Record<string, number>): { name: string; percentage: number; bytes: number }[] {
  const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
  
  if (totalBytes === 0) return [];
  
  return Object.entries(languages)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: Math.round((bytes / totalBytes) * 1000) / 10, // Round to 1 decimal place
    }))
    .sort((a, b) => b.percentage - a.percentage); // Sort by percentage descending
}

interface ApiKeyValidationResult {
  valid: boolean;
  error?: string;
  statusCode?: number;
  keyId?: string;
}

// Validate API key from request headers and check usage limits (PostgreSQL)
async function validateApiKeyAndCheckLimit(request: Request): Promise<ApiKeyValidationResult> {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return { valid: false, error: "Missing API key. Please provide x-api-key header.", statusCode: 401 };
  }

  const client = getDbClient();
  await client.connect();
  try {
    const res = await client.query(
      `SELECT id, usage, "limit" FROM api_keys WHERE key = $1`,
      [apiKey.trim()]
    );
    if (res.rows.length === 0) {
      return { valid: false, error: "Invalid API key", statusCode: 401 };
    }
    const row = res.rows[0];
    const usage = Number(row.usage);
    const limitVal = Number(row.limit);
    if (usage >= limitVal) {
      return {
        valid: false,
        error: `Rate limit exceeded. You have used ${usage}/${limitVal} requests. Please upgrade your plan or wait for your limit to reset.`,
        statusCode: 429,
      };
    }
    return { valid: true, keyId: row.id };
  } finally {
    await client.end();
  }
}

// Increment usage count for an API key (PostgreSQL)
async function incrementApiKeyUsage(keyId: string): Promise<boolean> {
  const client = getDbClient();
  await client.connect();
  try {
    await client.query(
      `UPDATE api_keys SET usage = usage + 1 WHERE id = $1`,
      [keyId]
    );
    return true;
  } catch (err) {
    console.error("Error incrementing usage:", err);
    return false;
  } finally {
    await client.end();
  }
}

// GET - GitHub Summarizer endpoint
export async function GET(request: Request) {
  try {
    // Validate API key and check limits
    const validation = await validateApiKeyAndCheckLimit(request);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode || 401 }
      );
    }

    return NextResponse.json({ 
      message: 'GitHub Summarizer API',
      status: 'authenticated'
    });
  } catch (error) {
    console.error('Server error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type PostAuth =
  | { mode: "api_key"; keyId: string }
  | { mode: "session" };

async function resolvePostAuth(request: Request): Promise<
  | { auth: PostAuth; error: null }
  | { auth: null; error: NextResponse }
> {
  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey) {
    const validation = await validateApiKeyAndCheckLimit(request);
    if (!validation.valid) {
      return {
        auth: null,
        error: NextResponse.json(
          { error: validation.error },
          { status: validation.statusCode || 401 }
        ),
      };
    }
    return { auth: { mode: "api_key", keyId: validation.keyId! }, error: null };
  }

  const { user, error: authError } = await getAuthenticatedUser();
  if (authError) return { auth: null, error: authError };
  if (!user) {
    return {
      auth: null,
      error: NextResponse.json(
        { error: "Missing API key. Please provide x-api-key header or sign in." },
        { status: 401 }
      ),
    };
  }

  return { auth: { mode: "session" }, error: null };
}

function resolveOpenAiApiKey(body: { openAiApiKey?: unknown }, allowSession: boolean): string | null {
  if (!allowSession) {
    const env = process.env.OPENAI_API_KEY?.trim();
    return env || null;
  }
  const fromBody = typeof body.openAiApiKey === "string" ? body.openAiApiKey : undefined;
  return resolveOpenAiKeyForRequest(fromBody);
}

// POST - Summarize GitHub repository
export async function POST(request: Request) {
  try {
    const { auth, error: authResolveError } = await resolvePostAuth(request);
    if (authResolveError) return authResolveError;

    const body = await request.json();

    if (!body.githubUrl) {
      return NextResponse.json(
        { error: 'Missing required field: githubUrl' },
        { status: 400 }
      );
    }

    // Parse GitHub URL to extract owner and repo
    const parsed = parseGitHubUrl(body.githubUrl);
    
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL. Format: https://github.com/owner/repo' },
        { status: 400 }
      );
    }

    const { owner, repo } = parsed;

    // Fetch all repository data in parallel for optimal performance
    const { repoInfo, readme, latestRelease, contributorsCount, languages } = await fetchAllRepoData(owner, repo);

    if (!repoInfo) {
      return NextResponse.json(
        { error: 'Failed to fetch repository information. Repository may not exist or is private.' },
        { status: 404 }
      );
    }

    const openAiKey = resolveOpenAiApiKey(body, auth!.mode === "session");
    if (!openAiKey) {
      const { requiresUserOpenAiKey, openaiKeyDefined } = getOpenAiEnvStatus();
      return NextResponse.json(
        {
          error:
            auth!.mode === "session" && requiresUserOpenAiKey
              ? "OPENAI_API_KEY is set in .env.local but has no value. Enter your key in the dialog."
              : auth!.mode === "session" && !openaiKeyDefined
                ? "OPENAI_API_KEY is not set in .env.local. Add OPENAI_API_KEY=your-key to your environment."
                : "OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.",
        },
        { status: 503 }
      );
    }

    const analysis = await generateSummary(repoInfo, readme, openAiKey);

    if (auth!.mode === "api_key") {
      await incrementApiKeyUsage(auth.keyId);
    }

    // Calculate language percentages
    const languagePercentages = languages ? calculateLanguagePercentages(languages) : null;

    return NextResponse.json({
      repository: {
        name: repoInfo.name,
        fullName: repoInfo.full_name,
        description: repoInfo.description,
        url: repoInfo.html_url,
        websiteUrl: repoInfo.homepage || null,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        watchers: repoInfo.watchers_count,
        openIssues: repoInfo.open_issues_count,
        contributors: contributorsCount,
        primaryLanguage: repoInfo.language,
        languages: languagePercentages,
        topics: repoInfo.topics || [],
        license: repoInfo.license ? {
          key: repoInfo.license.key,
          name: repoInfo.license.name,
          spdxId: repoInfo.license.spdx_id,
          url: repoInfo.license.url,
        } : null,
        defaultBranch: repoInfo.default_branch,
        size: repoInfo.size,
        archived: repoInfo.archived,
        visibility: repoInfo.visibility,
        createdAt: repoInfo.created_at,
        updatedAt: repoInfo.updated_at,
        pushedAt: repoInfo.pushed_at,
        latestVersion: latestRelease?.tag_name || null,
        latestRelease: latestRelease ? {
          version: latestRelease.tag_name,
          name: latestRelease.name,
          publishedAt: latestRelease.published_at,
          url: latestRelease.html_url,
          isPrerelease: latestRelease.prerelease,
        } : null,
      },
      analysis: {
        purpose: analysis.purpose,
        features: analysis.features,
        techStack: analysis.techStack,
        targetAudience: analysis.targetAudience,
        summary: analysis.summary,
      },
      status: 'completed'
    }, { status: 200 });
  } catch (error) {
    console.error('Server error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
