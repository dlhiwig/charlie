/**
 * Brave Search API Integration for Bravo
 * Provides web search capabilities with region and language support
 */

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
  extra_snippets?: string[];
}

export interface SearchResponse {
  web?: {
    results: SearchResult[];
    family_friendly: boolean;
  };
  query: {
    original: string;
    show_strict_warning: boolean;
    altered?: string;
  };
}

export interface SearchOptions {
  query: string;
  count?: number;
  offset?: number;
  country?: string;
  search_lang?: string;
  ui_lang?: string;
  safesearch?: 'off' | 'moderate' | 'strict';
  freshness?: 'pd' | 'pw' | 'pm' | 'py';
  text_decorations?: boolean;
  spellcheck?: boolean;
}

export class BraveSearchAPI {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.search.brave.com/res/v1/web/search';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(options: SearchOptions): Promise<SearchResponse> {
    const params = new URLSearchParams();
    
    // Required parameters
    params.append('q', options.query);
    
    // Optional parameters
    if (options.count) params.append('count', options.count.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.country) params.append('country', options.country);
    if (options.search_lang) params.append('search_lang', options.search_lang);
    if (options.ui_lang) params.append('ui_lang', options.ui_lang);
    if (options.safesearch) params.append('safesearch', options.safesearch);
    if (options.freshness) params.append('freshness', options.freshness);
    if (options.text_decorations !== undefined) {
      params.append('text_decorations', options.text_decorations.toString());
    }
    if (options.spellcheck !== undefined) {
      params.append('spellcheck', options.spellcheck.toString());
    }

    const url = `${this.baseUrl}?${params}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as SearchResponse;
      return data;
    } catch (error) {
      console.error('Brave Search API request failed:', error);
      throw error;
    }
  }

  /**
   * Simplified search method for common use cases
   */
  async quickSearch(query: string, count: number = 10): Promise<SearchResult[]> {
    const response = await this.search({
      query,
      count,
      country: 'US',
      search_lang: 'en',
      safesearch: 'moderate',
    });

    return response.web?.results || [];
  }

  /**
   * Search with custom parameters for specialized queries
   */
  async advancedSearch(
    query: string,
    options: Partial<SearchOptions> = {}
  ): Promise<SearchResponse> {
    return this.search({
      query,
      count: 10,
      country: 'US',
      search_lang: 'en',
      safesearch: 'moderate',
      ...options,
    });
  }

  /**
   * Format search results for display
   */
  formatResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No search results found.';
    }

    return results
      .map((result, index) => {
        const snippets = result.extra_snippets?.join('\n') || '';
        return `**${index + 1}. ${result.title}**\n${result.url}\n${result.description}${snippets ? '\n' + snippets : ''}`;
      })
      .join('\n\n');
  }
}

// Export singleton instance
let braveSearchInstance: BraveSearchAPI | null = null;

export function getBraveSearchAPI(apiKey?: string): BraveSearchAPI {
  if (!braveSearchInstance) {
    if (!apiKey) {
      throw new Error('Brave Search API key required for initialization');
    }
    braveSearchInstance = new BraveSearchAPI(apiKey);
  }
  return braveSearchInstance;
}