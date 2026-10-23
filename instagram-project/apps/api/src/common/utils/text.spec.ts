import { extractHashtags, extractMentions, normalizeSearchQuery, preview } from './text';

describe('text utils', () => {
  describe('extractHashtags', () => {
    it('finds latin, cyrillic and tajik hashtags, lowercases and deduplicates them', () => {
      expect(extractHashtags('Hi #SoftClub #душанбе #Тоҷикистон #softclub')).toEqual(['softclub', 'душанбе', 'тоҷикистон']);
    });

    it('ignores # inside words and urls', () => {
      expect(extractHashtags('mail#notatag http://x.com/#anchor')).toEqual([]);
    });

    it('returns an empty list for empty input', () => {
      expect(extractHashtags(undefined)).toEqual([]);
      expect(extractHashtags('')).toEqual([]);
    });
  });

  describe('extractMentions', () => {
    it('finds usernames and ignores emails', () => {
      expect(extractMentions('hello @Madina.Dev and @bob_1, write to me@mail.com')).toEqual(['madina.dev', 'bob_1']);
    });

    it('drops a trailing dot from sentence punctuation', () => {
      expect(extractMentions('Thanks @alice.')).toEqual(['alice']);
    });
  });

  describe('preview', () => {
    it('collapses whitespace and truncates', () => {
      expect(preview('a   b\n c')).toBe('a b c');
      expect(preview('x'.repeat(100), 10)).toBe(`${'x'.repeat(9)}…`);
      expect(preview(null)).toBeNull();
    });
  });

  describe('normalizeSearchQuery', () => {
    it('strips @ and # prefixes and trims', () => {
      expect(normalizeSearchQuery('  @madina ')).toBe('madina');
      expect(normalizeSearchQuery('##tag')).toBe('tag');
    });
  });
});
