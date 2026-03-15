/**
 * PinchTab Client for Bravo
 * 
 * HTTP client for PinchTab browser automation server.
 * Gives Bravo browser capabilities via shared PinchTab instance on :9867.
 * 
 * Token-efficient: ~800 tokens/page vs ~10K for screenshots (93% savings)
 */

interface PinchTabConfig {
  baseUrl: string;
  token: string;
  profile: string;
  timeout: number;
}

const DEFAULT_CONFIG: PinchTabConfig = {
  baseUrl: 'http://localhost:9867',
  token: process.env.PINCHTAB_TOKEN || 'pinchtab-local-key',
  profile: 'bravo',
  timeout: 30000,
};

export class PinchTabClient {
  private config: PinchTabConfig;

  constructor(config?: Partial<PinchTabConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`PinchTab ${res.status}: ${text}`);
      }

      const ct = res.headers.get('content-type') || '';
      return ct.includes('application/json') ? await res.json() : await res.text();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async health() { return this.request('/health'); }
  async navigate(url: string) { return this.request('/tabs/default/navigate', { method: 'POST', body: JSON.stringify({ url }) }); }
  async text() { return this.request('/tabs/default/text'); }
  async snapshot(filter = 'interactive') { return this.request(`/tabs/default/snapshot?filter=${filter}`); }
  async click(ref: string) { return this.request('/tabs/default/action', { method: 'POST', body: JSON.stringify({ kind: 'click', ref }) }); }
  async fill(ref: string, text: string) { return this.request('/tabs/default/action', { method: 'POST', body: JSON.stringify({ kind: 'fill', ref, text }) }); }
  async press(ref: string, key: string) { return this.request('/tabs/default/action', { method: 'POST', body: JSON.stringify({ kind: 'press', ref, key }) }); }

  async launchInstance(name: string, mode = 'headless') {
    return this.request('/instances/launch', { method: 'POST', body: JSON.stringify({ name, mode, profile: this.config.profile }) });
  }
  async openTab(instanceId: string, url: string) {
    return this.request(`/instances/${instanceId}/tabs/open`, { method: 'POST', body: JSON.stringify({ url }) });
  }
  async tabText(tabId: string) { return this.request(`/tabs/${tabId}/text`); }
  async tabNavigate(tabId: string, url: string) { return this.request(`/tabs/${tabId}/navigate`, { method: 'POST', body: JSON.stringify({ url }) }); }
  async tabSnapshot(tabId: string, filter = 'interactive') { return this.request(`/tabs/${tabId}/snapshot?filter=${filter}`); }
  async tabClick(tabId: string, ref: string) { return this.request(`/tabs/${tabId}/action`, { method: 'POST', body: JSON.stringify({ kind: 'click', ref }) }); }
  async listInstances() { return this.request('/instances'); }
}

let _client: PinchTabClient | null = null;
export function getPinchTab(config?: Partial<PinchTabConfig>): PinchTabClient {
  if (!_client) _client = new PinchTabClient(config);
  return _client;
}

export default PinchTabClient;
