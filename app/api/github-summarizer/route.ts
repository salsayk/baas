import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';
import { generateSummary } from './chain';
import { parseGitHubUrl, fetchAllRepoData } from '@/app/lib/githubUtils';

// Check if Supabase is properly configured
function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

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

// Validate API key from request headers and check usage limits
async function validateApiKeyAndCheckLimit(request: Request): Promise<ApiKeyValidationResult> {
  // Extract the API key from x-api-key header
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey) {
    return { valid: false, error: 'Missing API key. Please provide x-api-key header.', statusCode: 401 };
  }

  // Check if the API key exists in the database and get usage info
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, type, usage, limit')
    .eq('key', apiKey)
    .single();

  if (error || !data) {
    return { valid: false, error: 'Invalid API key', statusCode: 401 };
  }

  // Check if usage has exceeded the limit
  if (data.usage >= data.limit) {
    return { 
      valid: false, 
      error: `Rate limit exceeded. You have used ${data.usage}/${data.limit} requests. Please upgrade your plan or wait for your limit to reset.`,
      statusCode: 429 
    };
  }

  return { valid: true, keyId: data.id };
}

// Increment usage count for an API key
async function incrementApiKeyUsage(keyId: string): Promise<boolean> {
  const { error } = await supabase.rpc('increment_api_key_usage', { key_id: keyId });
  
  // Fallback if RPC doesn't exist - use regular update
  if (error) {
    const { data: currentKey } = await supabase
      .from('api_keys')
      .select('usage')
      .eq('id', keyId)
      .single();

    if (currentKey) {
      const { error: updateError } = await supabase
        .from('api_keys')
        .update({ usage: currentKey.usage + 1 })
        .eq('id', keyId);
      
      if (updateError) {
        console.error('Error incrementing usage:', updateError);
        return false;
      }
    }
  }
  
  return true;
}

// GET - GitHub Summarizer endpoint
export async function GET(request: Request) {
  try {
    // Check configuration first
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
      return NextResponse.json(
        { error: 'Database not configured. Please check your environment variables.' },
        { status: 503 }
      );
    }

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

// POST - Summarize GitHub repository
export async function POST(request: Request) {
  try {
    // Check configuration first
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured. Please check your environment variables.' },
        { status: 503 }
      );
    }

    // Validate API key and check limits
    const validation = await validateApiKeyAndCheckLimit(request);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.statusCode || 401 }
      );
    }

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

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in your environment variables.' },
        { status: 503 }
      );
    }

    // Generate summary using LangChain and OpenAI with structured output
    const analysis = await generateSummary(repoInfo, readme);

    // Increment usage count AFTER successful processing
    if (validation.keyId) {
      await incrementApiKeyUsage(validation.keyId);
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
