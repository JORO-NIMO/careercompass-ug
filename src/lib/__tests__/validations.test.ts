/**
 * Unit tests for Zod validation schemas
 */
import { describe, it, expect } from 'vitest';
import {
    signInSchema,
    signUpSchema,
    feedbackSchema,
    placementSchema,
    paymentIntentSchema,
    companyRegistrationSchema,
} from '../validations';

describe('signInSchema', () => {
    it('should validate correct sign-in data', () => {
        const result = signInSchema.safeParse({
            email: 'test@example.com',
            password: 'password123',
        });
        expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
        const result = signInSchema.safeParse({
            email: 'invalid-email',
            password: 'password123',
        });
        expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
        const result = signInSchema.safeParse({
            email: 'test@example.com',
            password: '12345',
        });
        expect(result.success).toBe(false);
    });
});

describe('signUpSchema', () => {
    it('should validate correct sign-up data', () => {
        const result = signUpSchema.safeParse({
            email: 'test@example.com',
            password: 'password123',
            fullName: 'John Doe',
        });
        expect(result.success).toBe(true);
    });

    it('should reject missing full name', () => {
        const result = signUpSchema.safeParse({
            email: 'test@example.com',
            password: 'password123',
        });
        expect(result.success).toBe(false);
    });

    it('should reject short full name', () => {
        const result = signUpSchema.safeParse({
            email: 'test@example.com',
            password: 'password123',
            fullName: 'J',
        });
        expect(result.success).toBe(false);
    });
});

describe('feedbackSchema', () => {
    it('should validate feedback with message only', () => {
        const result = feedbackSchema.safeParse({
            message: 'This is my feedback message.',
        });
        expect(result.success).toBe(true);
    });

    it('should validate feedback with all fields', () => {
        const result = feedbackSchema.safeParse({
            rating: 5,
            category: 'idea',
            message: 'Great feature idea here!',
            anonymous: true,
        });
        expect(result.success).toBe(true);
    });

    it('should reject rating out of range', () => {
        const result = feedbackSchema.safeParse({
            rating: 6,
            message: 'Some feedback message.',
        });
        expect(result.success).toBe(false);
    });

    it('should reject short message', () => {
        const result = feedbackSchema.safeParse({
            message: 'Short',
        });
        expect(result.success).toBe(false);
    });
});

describe('placementSchema', () => {
    it('should validate correct placement data', () => {
        const result = placementSchema.safeParse({
            position_title: 'Software Developer Intern',
            company_name: 'Tech Corp',
            description: 'This is a description of the internship position.',
            region: 'Kampala',
            industry: 'Technology',
            available_slots: 5,
        });
        expect(result.success).toBe(true);
    });

    it('should reject negative slots', () => {
        const result = placementSchema.safeParse({
            position_title: 'Software Developer Intern',
            company_name: 'Tech Corp',
            description: 'This is a description of the internship position.',
            region: 'Kampala',
            industry: 'Technology',
            available_slots: -1,
        });
        expect(result.success).toBe(false);
    });
});

describe('paymentIntentSchema', () => {
    it('should validate correct payment data', () => {
        const result = paymentIntentSchema.safeParse({
            amount_cents: 5000,
            currency: 'UGX',
            entity_id: '123e4567-e89b-12d3-a456-426614174000',
            entity_type: 'listing',
            boost_duration_days: 7,
        });
        expect(result.success).toBe(true);
    });

    it('should reject invalid currency length', () => {
        const result = paymentIntentSchema.safeParse({
            amount_cents: 5000,
            currency: 'UGXX',
            entity_id: '123e4567-e89b-12d3-a456-426614174000',
            boost_duration_days: 7,
        });
        expect(result.success).toBe(false);
    });

    it('should reject boost duration over 90 days', () => {
        const result = paymentIntentSchema.safeParse({
            amount_cents: 5000,
            currency: 'UGX',
            entity_id: '123e4567-e89b-12d3-a456-426614174000',
            boost_duration_days: 91,
        });
        expect(result.success).toBe(false);
    });
});

describe('companyRegistrationSchema', () => {
    it('should validate correct company data', () => {
        const result = companyRegistrationSchema.safeParse({
            name: 'Acme Corp',
            location: '123 Main Street, Kampala',
            website_url: 'https://acme.com',
            contact_email: 'info@acme.com',
        });
        expect(result.success).toBe(true);
    });

    it('should reject short company name', () => {
        const result = companyRegistrationSchema.safeParse({
            name: 'A',
            location: '123 Main Street',
            website_url: 'https://acme.com',
        });
        expect(result.success).toBe(false);
    });
});
