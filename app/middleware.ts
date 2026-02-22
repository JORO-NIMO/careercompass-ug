import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_PATHS = [
	'/',
	'/api/waitlist',
	'/api/recruiters',
	'/favicon.ico',
];

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Allow Next.js internals
	if (pathname.startsWith('/_next')) return NextResponse.next();

	// Allow exact matches
	if (ALLOWED_PATHS.includes(pathname)) return NextResponse.next();

	// Redirect all other routes to homepage
	return NextResponse.redirect(new URL('/', request.url));
}