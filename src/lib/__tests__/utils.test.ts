/**
 * Unit tests for utility functions
 */
import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (class name utility)', () => {
    it('should merge class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
        expect(cn('base', true && 'included', false && 'excluded')).toBe('base included');
    });

    it('should handle undefined and null', () => {
        expect(cn('base', undefined, null, 'end')).toBe('base end');
    });

    it('should merge tailwind classes correctly', () => {
        // tailwind-merge should dedupe conflicting classes
        expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });

    it('should handle empty input', () => {
        expect(cn()).toBe('');
    });

    it('should handle array of classes', () => {
        expect(cn(['foo', 'bar'])).toBe('foo bar');
    });
});
