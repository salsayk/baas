import { ChatOpenAI } from '@langchain/openai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { GitHubRepoInfo } from '@/app/lib/githubUtils';

// Re-export GitHubRepoInfo for backwards compatibility
export type { GitHubRepoInfo };

// Structured output schema for the summary
const summarySchema = z.object({
  purpose: z.string().describe('A brief description of what the project does and its main purpose'),
  features: z.array(z.string()).describe('A list of key features and capabilities of the project'),
  techStack: z.array(z.string()).describe('Technologies, frameworks, and languages used in the project'),
  targetAudience: z.string().describe('Who would benefit from using this project'),
  summary: z.string().describe('A comprehensive 2-3 paragraph summary of the repository'),
});

// Export the type for use in other files
export type SummaryOutput = z.infer<typeof summarySchema>;

// Generate summary using LangChain and OpenAI with structured output
export async function generateSummary(repoInfo: GitHubRepoInfo, readmeContent: string | null): Promise<SummaryOutput> {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0,
  });

  const parser = StructuredOutputParser.fromZodSchema(summarySchema);

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a technical analyst who summarizes GitHub repositories.
Analyze the repository information provided and extract structured information about it.

{format_instructions}`],
    ['human', `Please analyze this GitHub repository:

Repository: {full_name}
Description: {description}
Primary Language: {language}
Topics: {topics}
Stars: {stars}
Forks: {forks}
{readme_section}`],
  ]);

  const chain = prompt.pipe(model).pipe(parser);

  const result = await chain.invoke({
    format_instructions: parser.getFormatInstructions(),
    full_name: repoInfo.full_name,
    description: repoInfo.description || 'No description provided',
    language: repoInfo.language || 'Not specified',
    topics: repoInfo.topics?.join(', ') || 'None',
    stars: repoInfo.stargazers_count,
    forks: repoInfo.forks_count,
    readme_section: readmeContent ? `\nREADME Content:\n${readmeContent}` : '',
  });

  return result;
}

