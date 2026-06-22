declare namespace browser {
  namespace tabs {
    interface Tab { id?: number; url?: string; title?: string; }
    function query(q: { active?: boolean; currentWindow?: boolean }): Promise<Tab[]>;
    function get(tabId: number): Promise<Tab>;
    function sendMessage(tabId: number, msg: Record<string, unknown>): Promise<void>;
  }
  namespace storage {
    namespace session {
      function get(keys: string | string[]): Promise<Record<string, unknown>>;
      function set(items: Record<string, unknown>): Promise<void>;
      function remove(keys: string | string[]): Promise<void>;
      function setAccessLevel(opts: { accessLevel: string }): Promise<void>;
    }
    namespace local {
      function get(keys: string | string[]): Promise<Record<string, unknown>>;
      function set(items: Record<string, unknown>): Promise<void>;
      function remove(keys: string | string[]): Promise<void>;
    }
  }
  namespace action {
    function setBadgeText(opts: { text: string; tabId?: number }): Promise<void>;
    function setBadgeBackgroundColor(opts: { color: string }): Promise<void>;
  }
  const contextMenus: {
    create(opts: { id: string; title: string; contexts: string[] }): void;
    onClicked: { addListener(cb: (...args: any[]) => void): void };
  };
  const runtime: {
    sendMessage(msg: Record<string, unknown>): void;
    onMessage: { addListener(cb: (...args: any[]) => void): void };
    onInstalled: { addListener(cb: () => void): void };
  };
}
