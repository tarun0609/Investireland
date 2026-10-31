export const OPEN_CHAT_EVENT = 'investireland:open-chat';

export interface OpenChatDetail {
  question?: string;
}

/** Opens the floating chat from anywhere on the page, optionally asking a question straight away. */
export function openChat(question?: string): void {
  window.dispatchEvent(new CustomEvent<OpenChatDetail>(OPEN_CHAT_EVENT, { detail: { question } }));
}
