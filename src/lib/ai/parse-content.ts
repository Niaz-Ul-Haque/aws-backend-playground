/**
 * Content Parsing Utilities
 * Extracts card markers and structured data from LLM responses
 */

import type { Card, CardType } from '../../types';

/**
 * Card marker pattern
 * Format: <<<CARD:card-type:{"json":"data"}>>>
 */
const CARD_PATTERN = /<<<CARD:([a-z-]+):([\s\S]*?)>>>/g;

/**
 * Parsed content segment - either text or a card
 */
export interface ContentSegment {
  type: 'text' | 'card';
  content: string;
  card?: Card;
}

/**
 * Parse response containing card markers
 */
export interface ParsedResponse {
  segments: ContentSegment[];
  cards: Card[];
  plainText: string;
}

/**
 * Extract JSON from a string, handling nested braces
 */
function extractJson(str: string): string {
  let depth = 0;
  let start = -1;
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '{') {
      if (depth === 0) {
        start = i;
      }
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        result = str.slice(start, i + 1);
        break;
      }
    }
  }

  return result;
}

/**
 * Parse a single card marker
 */
function parseCardMarker(cardType: string, jsonStr: string): Card | null {
  try {
    // Extract and parse JSON
    const jsonContent = extractJson(jsonStr) || jsonStr;
    const data = JSON.parse(jsonContent);

    // Validate card type
    const validTypes: CardType[] = [
      'task-list',
      'task',
      'client',
      'client-list',
      'policy',
      'policy-list',
      'review',
      'confirmation',
    ];

    if (!validTypes.includes(cardType as CardType)) {
      console.warn(`Unknown card type: ${cardType}`);
      return null;
    }

    return {
      type: cardType as CardType,
      data,
    } as Card;
  } catch (error) {
    console.error('Error parsing card JSON:', error);
    console.error('JSON string:', jsonStr);
    return null;
  }
}

/**
 * Parse LLM response content and extract cards
 */
export function parseContent(content: string): ParsedResponse {
  const segments: ContentSegment[] = [];
  const cards: Card[] = [];
  let lastIndex = 0;

  // Reset regex
  CARD_PATTERN.lastIndex = 0;

  let match;
  while ((match = CARD_PATTERN.exec(content)) !== null) {
    // Add text before this card
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) {
        segments.push({ type: 'text', content: text });
      }
    }

    // Parse the card
    const [fullMatch, cardType, jsonStr] = match;
    const card = parseCardMarker(cardType, jsonStr);

    if (card) {
      segments.push({
        type: 'card',
        content: fullMatch,
        card,
      });
      cards.push(card);
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text after last card
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) {
      segments.push({ type: 'text', content: text });
    }
  }

  // Generate plain text (without card markers)
  const plainText = segments
    .filter((s) => s.type === 'text')
    .map((s) => s.content)
    .join('\n\n')
    .trim();

  return {
    segments,
    cards,
    plainText,
  };
}

/**
 * Strip card markers from content, leaving only plain text
 */
export function stripCardMarkers(content: string): string {
  return content.replace(CARD_PATTERN, '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Check if content contains any card markers
 */
export function hasCardMarkers(content: string): boolean {
  CARD_PATTERN.lastIndex = 0;
  return CARD_PATTERN.test(content);
}

/**
 * Extract just the cards from content
 */
export function extractCards(content: string): Card[] {
  const { cards } = parseContent(content);
  return cards;
}

/**
 * Build a card marker string
 */
export function buildCardMarker(type: CardType, data: unknown): string {
  return `<<<CARD:${type}:${JSON.stringify(data)}>>>`;
}

/**
 * Escape JSON for embedding in prompt
 */
export function escapeJsonForPrompt(data: unknown): string {
  return JSON.stringify(data).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
