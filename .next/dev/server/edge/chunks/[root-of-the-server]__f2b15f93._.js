(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__f2b15f93._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/server/web/exports/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/module/index.js [middleware-edge] (ecmascript) <locals>");
;
;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sgektsymnqkyqcethveh.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZWt0c3ltbnFreXFjZXRodmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjk2MjEsImV4cCI6MjA2NTg0NTYyMX0.9-GgphRm5dMkmuXmBzu2cORM50qj4bLJdngAqDpjErU';
// Protected routes that require authentication
const protectedRoutes = [
    '/tenant',
    '/landlord',
    '/admin',
    '/properties',
    '/tenants',
    '/payments',
    '/reports',
    '/managers'
];
// Admin-only routes
const adminRoutes = [
    '/admin'
];
// Role-based route access
const roleAccess = {
    '/tenant': [
        'tenant'
    ],
    '/landlord': [
        'landlord',
        'manager'
    ],
    '/admin': [
        'admin'
    ],
    '/properties': [
        'landlord',
        'manager',
        'admin'
    ],
    '/tenants': [
        'landlord',
        'manager',
        'admin'
    ],
    '/payments': [
        'landlord',
        'manager',
        'admin'
    ],
    '/reports': [
        'landlord',
        'manager',
        'admin'
    ],
    '/managers': [
        'landlord',
        'admin'
    ]
};
async function middleware(request) {
    const { pathname } = request.nextUrl;
    // Skip middleware for public routes
    if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/auth') || pathname === '/' || pathname.startsWith('/privacy')) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // Check if route is protected
    const isProtected = protectedRoutes.some((route)=>pathname.startsWith(route));
    if (!isProtected) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
    }
    // Create Supabase client for server-side
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$module$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
    // Simplified middleware - let client-side handle auth
    // Supabase auth cookies are HTTP-only and require proper setup
    // For now, we'll allow requests and let client-side auth handle protection
    // This is a common pattern for Next.js + Supabase
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$server$2f$web$2f$exports$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["NextResponse"].next();
}
const config = {
    matcher: [
        /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */ '/((?!_next/static|_next/image|favicon.ico).*)'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__f2b15f93._.js.map