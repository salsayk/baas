/**
 * GitHub API Utilities
 * Provides functions for interacting with the GitHub API
 */

// GitHub license information interface
export interface GitHubLicense {
  key: string;
  name: string;
  spdx_id: string;
  url: string | null;
}

// GitHub repository information interface
export interface GitHubRepoInfo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string | null;
  topics: string[];
  license: GitHubLicense | null;
  default_branch: string;
  archived: boolean;
  disabled: boolean;
  visibility: string;
  size: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

// Interface for GitHub release information
export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  prerelease: boolean;
  draft: boolean;
}

// Interface for parsed GitHub URL
export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
}

// Interface for contributors count
export interface GitHubContributorsInfo {
  count: number;
}

// Common headers for GitHub API requests
function getGitHubHeaders(): HeadersInit {
  return {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Summarizer-API',
    ...(process.env.GITHUB_TOKEN && { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` })
  };
}

/**
 * Parse a GitHub URL to extract owner and repository name
 * @param url - The GitHub repository URL
 * @returns Parsed owner and repo, or null if invalid URL
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
  const githubUrlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = url.match(githubUrlPattern);
  
  if (!match) {
    return null;
  }

  const [, owner, repo] = match;
  const repoName = repo.replace(/\.git$/, ''); // Remove .git suffix if present
  
  return { owner, repo: repoName };
}

/**
 * Fetch repository information from GitHub API
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Repository info or null if not found
 */
export async function fetchRepoInfo(owner: string, repo: string): Promise<GitHubRepoInfo | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: getGitHubHeaders()
    });

    if (!response.ok) {
      console.error(`GitHub API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching repo info:', error);
    return null;
  }
}

/**
 * Fetch README content from a GitHub repository
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param maxLength - Maximum length of README content to return (default: 10000)
 * @returns README content or null if not found
 */
export async function fetchReadme(owner: string, repo: string, maxLength: number = 10000): Promise<string | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: getGitHubHeaders()
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    // Decode base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    // Truncate if too long (to avoid token limits)
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  } catch (error) {
    console.error('Error fetching README:', error);
    return null;
  }
}

/**
 * Fetch the latest release from a GitHub repository
 * Falls back to the latest tag if no releases exist
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Release info or null if not found
 */
export async function fetchLatestRelease(owner: string, repo: string): Promise<GitHubRelease | null> {
  try {
    // First try to get the latest release (non-prerelease, non-draft)
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
      headers: getGitHubHeaders()
    });

    if (response.ok) {
      return await response.json();
    }

    // If no releases found, try to get the latest tag
    const tagsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`, {
      headers: getGitHubHeaders()
    });

    if (tagsResponse.ok) {
      const tags = await tagsResponse.json();
      if (tags && tags.length > 0) {
        // Return a partial release object with tag info
        return {
          tag_name: tags[0].name,
          name: tags[0].name,
          published_at: '',
          html_url: `https://github.com/${owner}/${repo}/releases/tag/${tags[0].name}`,
          prerelease: false,
          draft: false,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching latest release:', error);
    return null;
  }
}

/**
 * Fetch contributors count from a GitHub repository
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Contributors count or null if not found
 */
export async function fetchContributorsCount(owner: string, repo: string): Promise<number | null> {
  try {
    // Use per_page=1 and check the Link header for total count
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1&anon=true`, {
      headers: getGitHubHeaders()
    });

    if (!response.ok) {
      return null;
    }

    // Try to get count from Link header (pagination info)
    const linkHeader = response.headers.get('Link');
    if (linkHeader) {
      const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
      if (lastPageMatch) {
        return parseInt(lastPageMatch[1], 10);
      }
    }

    // If no pagination, count the results directly
    const contributors = await response.json();
    return Array.isArray(contributors) ? contributors.length : null;
  } catch (error) {
    console.error('Error fetching contributors count:', error);
    return null;
  }
}

/**
 * Fetch languages used in a GitHub repository
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Object with language names and byte counts, or null if not found
 */
export async function fetchLanguages(owner: string, repo: string): Promise<Record<string, number> | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
      headers: getGitHubHeaders()
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching languages:', error);
    return null;
  }
}

/**
 * Fetch all repository data in parallel for optimal performance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @returns Object containing all repo data fetched in parallel
 */
export async function fetchAllRepoData(owner: string, repo: string): Promise<{
  repoInfo: GitHubRepoInfo | null;
  readme: string | null;
  latestRelease: GitHubRelease | null;
  contributorsCount: number | null;
  languages: Record<string, number> | null;
}> {
  // Execute all API calls in parallel for maximum performance
  const [repoInfo, readme, latestRelease, contributorsCount, languages] = await Promise.all([
    fetchRepoInfo(owner, repo),
    fetchReadme(owner, repo),
    fetchLatestRelease(owner, repo),
    fetchContributorsCount(owner, repo),
    fetchLanguages(owner, repo)
  ]);

  return { repoInfo, readme, latestRelease, contributorsCount, languages };
}
