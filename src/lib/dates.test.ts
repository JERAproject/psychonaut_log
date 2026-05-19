import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDatesArray, DAYS_BACK } from './dates';

describe('dates', () => {
  describe('getDatesArray', () => {
    it('should return an array with DAYS_BACK elements', () => {
      const dates = getDatesArray();
      expect(dates).toHaveLength(DAYS_BACK);
    });

    it('should return dates in YYYY-MM-DD format', () => {
      const dates = getDatesArray();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      dates.forEach(date => {
        expect(date).toMatch(dateRegex);
      });
    });

    it('should include today in the array', () => {
      const dates = getDatesArray();
      const today = new Date().toISOString().split('T')[0];
      expect(dates).toContain(today);
    });

    it('should return dates in chronological order', () => {
      const dates = getDatesArray();
      for (let i = 1; i < dates.length; i++) {
        expect(new Date(dates[i]).getTime()).toBeGreaterThanOrEqual(
          new Date(dates[i - 1]).getTime()
        );
      }
    });

    it('should have the correct number of days between first and last date', () => {
      const dates = getDatesArray();
      const first = new Date(dates[0]);
      const last = new Date(dates[dates.length - 1]);
      const diffDays = Math.floor(
        (last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(DAYS_BACK - 1);
    });
  });
});