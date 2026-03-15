/**
 * Web Tools Integration for Charlie
 * Provides web search and information retrieval capabilities
 */

import { getBraveSearchAPI, type SearchResult } from '../tools/web-search.js';
import type { CharlieConfig } from './config.js';
import { rootLogger } from './logger.js';

const log = rootLogger.child({ subsystem: 'web-tools' });

export interface WebSearchRequest {
  query: string;
  count?: number;
  country?: string;
  language?: string;
  safesearch?: 'off' | 'moderate' | 'strict';
  freshness?: 'pd' | 'pw' | 'pm' | 'py';
}

export interface WebSearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  totalResults: number;
  formattedText: string;
  error?: string;
}

export class WebToolsService {
  private braveSearch: ReturnType<typeof getBraveSearchAPI> | null = null;
  private config: CharlieConfig;

  constructor(config: CharlieConfig) {
    this.config = config;
    
    if (config.tools?.webSearch?.enabled && config.tools.webSearch.apiKey) {
      try {
        this.braveSearch = getBraveSearchAPI(config.tools.webSearch.apiKey);
        log.info('Web search initialized with Brave Search API');
      } catch (error) {
        log.warn({ error }, 'Failed to initialize web search');
      }
    } else {
      log.info('Web search disabled or no API key configured');
    }
  }

  /**
   * Perform web search with the configured provider
   */
  async search(request: WebSearchRequest): Promise<WebSearchResponse> {
    if (!this.braveSearch) {
      return {
        success: false,
        query: request.query,
        results: [],
        totalResults: 0,
        formattedText: 'Web search is not configured or unavailable',
        error: 'Service not initialized'
      };
    }

    try {
      log.info({ query: request.query }, 'Performing web search');

      const searchOptions = {
        query: request.query,
        count: request.count || this.config.tools?.webSearch?.defaults?.maxResults || 10,
        country: request.country || this.config.tools?.webSearch?.defaults?.country || 'US',
        search_lang: request.language || this.config.tools?.webSearch?.defaults?.search_lang || 'en',
        safesearch: request.safesearch || this.config.tools?.webSearch?.defaults?.safesearch || 'moderate',
        freshness: request.freshness,
        text_decorations: true,
        spellcheck: true,
      };

      const response = await this.braveSearch.advancedSearch(request.query, searchOptions);
      const results = response.web?.results || [];
      
      log.info({ 
        query: request.query,
        resultCount: results.length,
        altered: response.query.altered 
      }, 'Web search completed');

      const formattedText = this.formatSearchResults(results, request.query);

      return {
        success: true,
        query: response.query.altered || response.query.original,
        results,
        totalResults: results.length,
        formattedText
      };

    } catch (error) {
      log.error({ error, query: request.query }, 'Web search failed');
      
      return {
        success: false,
        query: request.query,
        results: [],
        totalResults: 0,
        formattedText: `Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Quick search for simple queries
   */
  async quickSearch(query: string, maxResults: number = 5): Promise<WebSearchResponse> {
    return this.search({
      query,
      count: maxResults
    });
  }

  /**
   * Search for recent information
   */
  async searchRecent(query: string, timeframe: 'pd' | 'pw' | 'pm' = 'pw'): Promise<WebSearchResponse> {
    return this.search({
      query,
      freshness: timeframe,
      count: 8
    });
  }

  /**
   * Format search results for AI model consumption
   */
  private formatSearchResults(results: SearchResult[], query: string): string {
    if (results.length === 0) {
      return `No web search results found for "${query}".`;
    }

    const header = `Web search results for "${query}" (${results.length} results):\n\n`;
    
    const formatted = results
      .slice(0, 10) // Limit to top 10 results
      .map((result, index) => {
        let snippet = result.description || '';
        
        // Add extra snippets if available
        if (result.extra_snippets && result.extra_snippets.length > 0) {
          snippet += '\n' + result.extra_snippets.join('\n');
        }
        
        // Clean up snippet
        snippet = snippet.trim().substring(0, 300) + (snippet.length > 300 ? '...' : '');
        
        return `${index + 1}. **${result.title}**\n   URL: ${result.url}\n   ${snippet}`;
      })
      .join('\n\n');

    return header + formatted;
  }

  /**
   * Check if web tools are available
   */
  isAvailable(): boolean {
    return this.braveSearch !== null;
  }

  /**
   * Get web tools status
   */
  getStatus() {
    return {
      webSearch: {
        enabled: this.config.tools?.webSearch?.enabled || false,
        provider: 'brave',
        available: this.isAvailable()
      }
    };
  }
}

// Global instance
let webToolsInstance: WebToolsService | null = null;

export function initializeWebTools(config: CharlieConfig): WebToolsService {
  webToolsInstance = new WebToolsService(config);
  return webToolsInstance;
}

export function getWebTools(): WebToolsService | null {
  return webToolsInstance;
}