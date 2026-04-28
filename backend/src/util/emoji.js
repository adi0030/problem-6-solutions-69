// Emoji-only validator (Phase 5).
// Accept: extended pictographic, ZWJ, variation selectors,
// regional indicators, skin-tone modifiers, whitespace.
// Reject: anything else (letters, digits, punctuation, etc.).

const EMOJI_ONLY_RE =
  /^(?:\s|\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Emoji_Component}|\p{Regional_Indicator}|‍|️|︎)+$/u;

export function isEmojiOnly(s) {
  if (typeof s !== 'string' || s.length === 0) return false;
  if (s.trim().length === 0) return false; // disallow whitespace-only
  return EMOJI_ONLY_RE.test(s);
}
