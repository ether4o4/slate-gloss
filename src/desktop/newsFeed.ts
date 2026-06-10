/**
 * newsFeed — the user-curated feed shown in the left-page glass wall.
 *
 * Posts are plain text that may contain embedded links (any http/https URL in
 * the text is detected and rendered tappable). Module-level store with the same
 * subscribe() seam as ThemeStore / ActionRegistry so the wall re-renders on add
 * or delete. In-memory for now (survives navigation, not a full app restart).
 */

export interface NewsPost {
  id: string;
  text: string;
  /** URLs detected in the text, surfaced as tappable chips. */
  links: string[];
  createdAt: number;
}

type Listener = () => void;

const URL_RE = /(https?:\/\/[^\s]+)/gi;

export function extractLinks(text: string): string[] {
  const found = text.match(URL_RE);
  return found ? Array.from(new Set(found)) : [];
}

let counter = 1;
const posts: NewsPost[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach(fn => fn());
}

export const NewsFeed = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Newest first. */
  all(): NewsPost[] {
    return [...posts].sort((a, b) => b.createdAt - a.createdAt);
  },

  add(text: string): NewsPost | null {
    const clean = text.trim();
    if (!clean) return null;
    const post: NewsPost = {
      id: `post-${counter++}`,
      text: clean,
      links: extractLinks(clean),
      createdAt: Date.now(),
    };
    posts.push(post);
    emit();
    return post;
  },

  remove(id: string) {
    const i = posts.findIndex(p => p.id === id);
    if (i >= 0) {
      posts.splice(i, 1);
      emit();
    }
  },
};
