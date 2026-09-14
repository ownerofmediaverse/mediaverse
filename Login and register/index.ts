/* ============================================================
   MEDIAVERSE
   NETWORK SECURITY EDGE FUNCTION
   ============================================================

   FUNCTION:
   network-security

   PURPOSE:
   - Authenticate Supabase user
   - Detect real client IP
   - Query IPQualityScore
   - Detect:
       VPN
       Proxy
       TOR
       Hosting / Data Center
   - Calculate security status
   - Return IP/location/network information
   - Optionally update Mediaverse device security
   - Optionally log security events

   IMPORTANT:
   - IPQS API key NEVER goes to browser
   - Supabase secret key NEVER goes to browser
   - user_id from request body is NOT trusted
   - authenticated JWT identity is authoritative

============================================================ */


/* ============================================================
   IMPORTS
============================================================ */

import {
    createClient
} from "npm:@supabase/supabase-js@2";


/* ============================================================
   ENVIRONMENT
============================================================ */

const SUPABASE_URL =
    Deno.env.get(
        "SUPABASE_URL"
    ) ?? "";


/*
   Current Supabase secret key model.

   We support the current SUPABASE_SECRET_KEY first,
   then older SUPABASE_SERVICE_ROLE_KEY as fallback.

   This key MUST remain server-side.
*/

const SUPABASE_SECRET_KEY =
    Deno.env.get(
        "SUPABASE_SECRET_KEY"
    ) ||
    Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
    ) ||
    "";


/*
   IPQualityScore API key.

   Set this in Supabase Edge Function secrets.
*/

const IPQS_API_KEY =
    Deno.env.get(
        "IPQS_API_KEY"
    ) ?? "";


/*
   Security configuration.

   Default high-risk threshold:
   90

   IPQS itself describes 90+ as high risk.
*/

const RISK_BLOCK_THRESHOLD =
    Number(
        Deno.env.get(
            "MEDIAVERSE_RISK_BLOCK_THRESHOLD"
        ) || "90"
    );


/*
   Whether hosting/data-center connections should
   automatically be considered blocking.

   Default:
   false

   This avoids blocking legitimate users who use
   corporate/cloud/data-center networks.

   VPN/TOR/proxy can still trigger security status.
*/

const BLOCK_HOSTING =
    String(
        Deno.env.get(
            "MEDIAVERSE_BLOCK_HOSTING"
        ) || "false"
    ).toLowerCase() === "true";


/*
   Whether detected VPN should block.

   Default:
   false

   Recommended initial production behavior:
   detect + log, but do not automatically ban
   every VPN user.
*/

const BLOCK_VPN =
    String(
        Deno.env.get(
            "MEDIAVERSE_BLOCK_VPN"
        ) || "false"
    ).toLowerCase() === "true";


/*
   Whether proxy should block.
*/

const BLOCK_PROXY =
    String(
        Deno.env.get(
            "MEDIAVERSE_BLOCK_PROXY"
        ) || "true"
    ).toLowerCase() === "true";


/*
   Whether TOR should block.
*/

const BLOCK_TOR =
    String(
        Deno.env.get(
            "MEDIAVERSE_BLOCK_TOR"
        ) || "true"
    ).toLowerCase() === "true";


/* ============================================================
   CORS
============================================================ */

const corsHeaders = {

    "Access-Control-Allow-Origin":
        "*",

    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
        "POST, OPTIONS"

};


/* ============================================================
   RESPONSE HELPER
============================================================ */

function jsonResponse(
    body: Record<string, unknown>,
    status = 200
) {

    return new Response(

        JSON.stringify(
            body
        ),

        {
            status,

            headers: {

                ...corsHeaders,

                "Content-Type":
                    "application/json"

            }

        }

    );

}


/* ============================================================
   BOOLEAN HELPER
============================================================ */

function asBoolean(
    value: unknown
): boolean {

    return value === true;

}


/* ============================================================
   NUMBER HELPER
============================================================ */

function asNumber(
    value: unknown,
    fallback = 0
): number {

    const number =
        Number(
            value
        );


    if (
        Number.isFinite(
            number
        )
    ) {

        return number;

    }


    return fallback;

}


/* ============================================================
   STRING HELPER
============================================================ */

function cleanString(
    value: unknown
): string | null {

    if (
        typeof value !==
        "string"
    ) {

        return null;

    }


    const valueClean =
        value.trim();


    if (
        !valueClean ||
        valueClean ===
            "N/A"
    ) {

        return null;

    }


    return valueClean;

}


/* ============================================================
   CLIENT IP EXTRACTION
============================================================ */

function getClientIP(
    req: Request
): string | null {

    /*
       Supabase / edge infrastructure may provide
       the original client IP through forwarded headers.

       We prefer:
       x-forwarded-for

       Then:
       x-real-ip
    */


    const forwardedFor =
        req.headers.get(
            "x-forwarded-for"
        );


    if (
        forwardedFor
    ) {

        /*
           Example:
           1.2.3.4, 10.0.0.1
        */

        const firstIP =
            forwardedFor
                .split(",")[0]
                ?.trim();


        if (
            firstIP
        ) {

            return firstIP;

        }

    }


    const realIP =
        req.headers.get(
            "x-real-ip"
        );


    if (
        realIP
    ) {

        return realIP.trim();

    }


    return null;

}


/* ============================================================
   BASIC IP VALIDATION
============================================================ */

function isValidIP(
    ip: string | null
): boolean {

    if (
        !ip
    ) {

        return false;

    }


    /*
       IPv4
    */

    const ipv4 =
        /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;


    if (
        ipv4.test(ip)
    ) {

        return true;

    }


    /*
       Basic IPv6 validation.
    */

    const ipv6 =
        /^[0-9a-fA-F:]+$/;


    return (
        ipv6.test(ip) &&
        ip.includes(":")
    );

}


/* ============================================================
   IPQS LOOKUP
============================================================ */

async function lookupIPQS(
    ip: string,
    userAgent: string | null,
    userLanguage: string | null
) {

    if (
        !IPQS_API_KEY
    ) {

        throw new Error(
            "IPQS_API_KEY is not configured."
        );

    }


    /*
       IPQS Proxy Detection API.
    */

    const url =
        new URL(
            `https://ipqualityscore.com/api/json/ip/${encodeURIComponent(IPQS_API_KEY)}/${encodeURIComponent(ip)}`
        );


    /*
       Strictness 1 is a reasonable balance
       according to IPQS documentation.
    */

    url.searchParams.set(
        "strictness",
        "1"
    );


    /*
       Public access points are allowed.
       This reduces false positives for schools,
       research institutions and some corporations.
    */

    url.searchParams.set(
        "allow_public_access_points",
        "true"
    );


    /*
       User agent improves IPQS scoring.
    */

    if (
        userAgent
    ) {

        url.searchParams.set(
            "user_agent",
            userAgent
        );

    }


    /*
       User language can improve scoring.
    */

    if (
        userLanguage
    ) {

        url.searchParams.set(
            "user_language",
            userLanguage
        );

    }


    const response =
        await fetch(
            url.toString(),
            {

                method:
                    "GET",

                headers: {

                    "Accept":
                        "application/json"

                }

            }
        );


    let data:
        Record<string, unknown>;


    try {

        data =
            await response.json();

    }

    catch {

        throw new Error(
            "IPQS returned an invalid response."
        );

    }


    if (
        !response.ok
    ) {

        throw new Error(
            String(
                data?.message ||
                "IPQS request failed."
            )
        );

    }


    if (
        data?.success !== true
    ) {

        throw new Error(
            String(
                data?.message ||
                "IPQS security lookup failed."
            )
        );

    }


    return data;

}


/* ============================================================
   SECURITY DECISION
============================================================ */

function determineSecurity(
    data: Record<string, unknown>
) {

    const proxyDetected =
        asBoolean(
            data.proxy
        );


    const vpnDetected =
        asBoolean(
            data.vpn
        ) ||
        asBoolean(
            data.active_vpn
        );


    const torDetected =
        asBoolean(
            data.tor
        ) ||
        asBoolean(
            data.active_tor
        );


    /*
       IPQS's current API uses connection_type:
       "Data Center"

       This is our hosting/data-center signal.
    */

    const connectionType =
        String(
            data.connection_type ||
            ""
        ).toLowerCase();


    const hostingDetected =
        connectionType.includes(
            "data center"
        ) ||
        connectionType.includes(
            "datacenter"
        );


    const riskScore =
        Math.max(
            0,
            Math.min(
                100,
                asNumber(
                    data.fraud_score,
                    0
                )
            )
        );


    /*
       Determine block status.

       High risk >= configured threshold
       OR explicitly enabled network blocks.
    */

    const highRisk =
        riskScore >=
        RISK_BLOCK_THRESHOLD;


    const blockedByVPN =
        BLOCK_VPN &&
        vpnDetected;


    const blockedByProxy =
        BLOCK_PROXY &&
        proxyDetected;


    const blockedByTOR =
        BLOCK_TOR &&
        torDetected;


    const blockedByHosting =
        BLOCK_HOSTING &&
        hostingDetected;


    const disabled =
        highRisk ||
        blockedByVPN ||
        blockedByProxy ||
        blockedByTOR ||
        blockedByHosting;


    let securityStatus =
        "normal";


    if (
        disabled
    ) {

        securityStatus =
            "critical";

    }

    else if (
        highRisk
    ) {

        securityStatus =
            "high_risk";

    }

    else if (
        vpnDetected ||
        proxyDetected ||
        torDetected ||
        hostingDetected
    ) {

        securityStatus =
            "suspicious";

    }


    const reasons:
        string[] = [];


    if (
        vpnDetected
    ) {

        reasons.push(
            "VPN detected"
        );

    }


    if (
        proxyDetected
    ) {

        reasons.push(
            "Proxy detected"
        );

    }


    if (
        torDetected
    ) {

        reasons.push(
            "TOR detected"
        );

    }


    if (
        hostingDetected
    ) {

        reasons.push(
            "Hosting/data-center connection detected"
        );

    }


    if (
        highRisk
    ) {

        reasons.push(
            `High IP risk score: ${riskScore}`
        );

    }


    return {

        vpnDetected,

        proxyDetected,

        torDetected,

        hostingDetected,

        riskScore,

        highRisk,

        disabled,

        securityStatus,

        reason:
            reasons.length
                ? reasons.join("; ")
                : null

    };

}


/* ============================================================
   DATABASE LOGGING
============================================================ */

async function logSecurityEvent(
    adminClient: ReturnType<typeof createClient>,
    values: {
        userId: string,
        deviceFingerprint: string | null,
        eventType: string,
        ip: string | null,
        country: string | null,
        countryCode: string | null,
        region: string | null,
        city: string | null,
        isp: string | null,
        metadata: Record<string, unknown>
    }
) {

    try {

        /*
           This table exists in your Mediaverse SQL:
           public.mediaverse_security_events
        */

        const {
            error
        } =
            await adminClient
                .from(
                    "mediaverse_security_events"
                )
                .insert({

                    user_id:
                        values.userId,

                    device_fingerprint:
                        values.deviceFingerprint,

                    event_type:
                        values.eventType,

                    ip:
                        values.ip,

                    country:
                        values.country,

                    country_code:
                        values.countryCode,

                    region:
                        values.region,

                    city:
                        values.city,

                    isp:
                        values.isp,

                    metadata:
                        values.metadata

                });


        if (
            error
        ) {

            console.error(
                "MEDIAVERSE SECURITY EVENT LOG ERROR:",
                error
            );

            return false;

        }


        return true;

    }

    catch (
        error
    ) {

        console.error(
            "MEDIAVERSE SECURITY EVENT EXCEPTION:",
            error
        );

        return false;

    }

}


/* ============================================================
   UPDATE DEVICE SECURITY
============================================================ */

async function updateDeviceSecurity(
    adminClient: ReturnType<typeof createClient>,
    values: {
        deviceFingerprint: string,
        userId: string,
        ip: string | null,
        country: string | null,
        countryCode: string | null,
        region: string | null,
        city: string | null,
        isp: string | null
    }
) {

    try {

        /*
           Your existing Mediaverse SQL function:
           update_device_security_info(
               fingerprint,
               user_id,
               ip,
               country,
               country_code,
               region,
               city,
               isp
           )

           IMPORTANT:
           If your SQL function has a different signature,
           use that exact SQL signature.
        */

        const {
            error
        } =
            await adminClient.rpc(
                "update_device_security_info",
                {

                    p_device_fingerprint:
                        values.deviceFingerprint,

                    p_user_id:
                        values.userId,

                    p_current_ip:
                        values.ip,

                    p_country:
                        values.country,

                    p_country_code:
                        values.countryCode,

                    p_region:
                        values.region,

                    p_city:
                        values.city,

                    p_isp:
                        values.isp

                }
            );


        /*
           Some versions of the Mediaverse SQL use a
           positional 7-argument contract.

           If this returns a function-signature error,
           use the exact parameter names from your
           installed SQL function.
        */

        if (
            error
        ) {

            console.warn(
                "DEVICE SECURITY RPC WARNING:",
                error
            );

            return false;

        }


        return true;

    }

    catch (
        error
    ) {

        console.warn(
            "DEVICE SECURITY UPDATE EXCEPTION:",
            error
        );

        return false;

    }

}


/* ============================================================
   MAIN FUNCTION
============================================================ */

Deno.serve(
    async (
        req: Request
    ) => {

        /* ----------------------------------------------------
           CORS
        ---------------------------------------------------- */

        if (
            req.method ===
            "OPTIONS"
        ) {

            return new Response(
                "ok",
                {
                    headers:
                        corsHeaders
                }
            );

        }


        /* ----------------------------------------------------
           METHOD
        ---------------------------------------------------- */

        if (
            req.method !==
            "POST"
        ) {

            return jsonResponse(
                {

                    success:
                        false,

                    authenticated:
                        false,

                    disabled:
                        false,

                    securityStatus:
                        "method_not_allowed",

                    riskScore:
                        0,

                    message:
                        "Only POST requests are allowed."

                },
                405
            );

        }


        /* ----------------------------------------------------
           CONFIGURATION CHECK
        ---------------------------------------------------- */

        if (
            !SUPABASE_URL ||
            !SUPABASE_SECRET_KEY
        ) {

            console.error(
                "Supabase server configuration missing."
            );


            return jsonResponse(
                {

                    success:
                        false,

                    authenticated:
                        false,

                    disabled:
                        false,

                    securityStatus:
                        "configuration_error",

                    riskScore:
                        0,

                    message:
                        "Server security configuration is incomplete."

                },
                500
            );

        }


        if (
            !IPQS_API_KEY
        ) {

            console.error(
                "IPQS_API_KEY is missing."
            );


            return jsonResponse(
                {

                    success:
                        false,

                    authenticated:
                        false,

                    disabled:
                        false,

                    securityStatus:
                        "configuration_error",

                    riskScore:
                        0,

                    message:
                        "Network security provider is not configured."

                },
                500
            );

        }


        /* ----------------------------------------------------
           AUTHORIZATION
        ---------------------------------------------------- */

        const authorization =
            req.headers.get(
                "Authorization"
            );


        if (
            !authorization ||
            !authorization.startsWith(
                "Bearer "
            )
        ) {

            return jsonResponse(
                {

                    success:
                        false,

                    authenticated:
                        false,

                    disabled:
                        false,

                    securityStatus:
                        "unauthenticated",

                    riskScore:
                        0,

                    message:
                        "Authentication is required."

                },
                401
            );

        }


        const accessToken =
            authorization.substring(
                "Bearer ".length
            ).trim();


        if (
            !accessToken
        ) {

            return jsonResponse(
                {

                    success:
                        false,

                    authenticated:
                        false,

                    disabled:
                        false,

                    securityStatus:
                        "unauthenticated",

                    riskScore:
                        0,

                    message:
                        "Invalid authentication token."

                },
                401
            );

        }


        /* ----------------------------------------------------
           SUPABASE ADMIN CLIENT
        ---------------------------------------------------- */

        const adminClient =
            createClient(
                SUPABASE_URL,
                SUPABASE_SECRET_KEY,
                {

                    auth: {

                        autoRefreshToken:
                            false,

                        persistSession:
                            false

                    }

                }
            );


        /* ----------------------------------------------------
           VERIFY USER
        ---------------------------------------------------- */

        const {
            data:
                userData,

            error:
                userError

        } =
            await adminClient.auth.getUser(
                accessToken
            );


        if (
            userError ||
            !userData?.user
        ) {

            console.error(
                "NETWORK SECURITY AUTH ERROR:",
                userError
            );


            return jsonResponse(
                {

                    success:
                        false,

                    authenticated:
                        false,

                    disabled:
                        false,

                    securityStatus:
                        "unauthenticated",

                    riskScore:
                        0,

                    message:
                        "Invalid or expired session."

                },
                401
            );

        }


        const user =
            userData.user;


        /* ----------------------------------------------------
           REQUEST BODY
        ---------------------------------------------------- */

        let body:
            Record<string, unknown> = {};


        try {

            body =
                await req.json();

        }

        catch {

            body = {};

        }


        /*
           IMPORTANT:

           body.user_id is NOT trusted.

           Authenticated JWT user.id is authoritative.
        */

        const userId =
            user.id;


        const deviceFingerprint =
            cleanString(
                body.device_fingerprint
            );


        /* ----------------------------------------------------
           REAL IP
        ---------------------------------------------------- */

        const realIP =
            getClientIP(
                req
            );


        /*
           Never trust browser supplied IP.

           If the edge does not expose the client IP,
           we fail closed for the network-security lookup
           instead of analyzing a spoofable browser value.
        */

        if (
            !realIP ||
            !isValidIP(
                realIP
            )
        ) {

            console.error(
                "Unable to determine valid client IP.",
                {
                    realIP
                }
            );


            await logSecurityEvent(
                adminClient,
                {

                    userId,

                    deviceFingerprint,

                    eventType:
                        "network_security_ip_unavailable",

                    ip:
                        null,

                    country:
                        null,

                    countryCode:
                        null,

                    region:
                        null,

                    city:
                        null,

                    isp:
                        null,

                    metadata: {

                        source:
                            "network-security-edge-function"

                    }

                }
            );


            return jsonResponse(
                {

                    success:
                        false,

                    authenticated:
                        true,

                    disabled:
                        false,

                    userId,

                    securityStatus:
                        "ip_unavailable",

                    riskScore:
                        0,

                    message:
                        "Unable to determine your public IP address."

                },
                503
            );

        }


        /* ----------------------------------------------------
           USER AGENT
        ---------------------------------------------------- */

        const userAgent =
            req.headers.get(
                "user-agent"
            );


        const userLanguage =
            req.headers.get(
                "accept-language"
            );


        /* ----------------------------------------------------
           IPQS
        ---------------------------------------------------- */

        let ipqs:
            Record<string, unknown>;


        try {

            ipqs =
                await lookupIPQS(
                    realIP,
                    userAgent,
                    userLanguage
                );

        }

        catch (
            error
        ) {

            console.error(
                "IPQS ERROR:",
                error
            );


            await logSecurityEvent(
                adminClient,
                {

                    userId,

                    deviceFingerprint,

                    eventType:
                        "network_security_provider_error",

                    ip:
                        realIP,

                    country:
                        null,

                    countryCode:
                        null,

                    region:
                        null,

                    city:
                        null,

                    isp:
                        null,

                    metadata: {

                        provider:
                            "ipqualityscore",

                        error:
                            String(
                                error
                            )

                    }

                }
            );


            return jsonResponse(
                {

                    success:
                        false,

                    authenticated:
                        true,

                    disabled:
                        false,

                    userId,

                    ipAddress:
                        realIP,

                    securityStatus:
                        "provider_unavailable",

                    riskScore:
                        0,

                    message:
                        "Network security provider is temporarily unavailable."

                },
                503
            );

        }


        /* ----------------------------------------------------
           SECURITY DECISION
        ---------------------------------------------------- */

        const security =
            determineSecurity(
                ipqs
            );


        /* ----------------------------------------------------
           LOCATION / NETWORK
        ---------------------------------------------------- */

        const country =
            cleanString(
                ipqs.country
            ) ||
            cleanString(
                ipqs.country_name
            );


        const countryCode =
            cleanString(
                ipqs.country_code
            );


        const region =
            cleanString(
                ipqs.region
            );


        const city =
            cleanString(
                ipqs.city
            );


        const isp =
            cleanString(
                ipqs.ISP
            ) ||
            cleanString(
                ipqs.isp
            );


        const connectionType =
            cleanString(
                ipqs.connection_type
            );


        const organization =
            cleanString(
                ipqs.organization
            );


        /* ----------------------------------------------------
           DEVICE SECURITY UPDATE
        ---------------------------------------------------- */

        let rpcUpdated =
            false;


        if (
            deviceFingerprint
        ) {

            rpcUpdated =
                await updateDeviceSecurity(
                    adminClient,
                    {

                        deviceFingerprint,

                        userId,

                        ip:
                            realIP,

                        country,

                        countryCode,

                        region,

                        city,

                        isp

                    }
                );

        }


        /* ----------------------------------------------------
           EVENT TYPE
        ---------------------------------------------------- */

        let eventType =
            "network_security_check";


        if (
            security.disabled
        ) {

            eventType =
                "network_security_block";

        }

        else if (
            security.vpnDetected ||
            security.proxyDetected ||
            security.torDetected ||
            security.hostingDetected
        ) {

            eventType =
                "network_security_suspicious";

        }


        /* ----------------------------------------------------
           SECURITY EVENT
        ---------------------------------------------------- */

        await logSecurityEvent(
            adminClient,
            {

                userId,

                deviceFingerprint,

                eventType,

                ip:
                    realIP,

                country,

                countryCode,

                region,

                city,

                isp,

                metadata: {

                    securityStatus:
                        security.securityStatus,

                    riskScore:
                        security.riskScore,

                    vpnDetected:
                        security.vpnDetected,

                    proxyDetected:
                        security.proxyDetected,

                    torDetected:
                        security.torDetected,

                    hostingDetected:
                        security.hostingDetected,

                    connectionType,

                    organization,

                    recentAbuse:
                        asBoolean(
                            ipqs.recent_abuse
                        ),

                    botStatus:
                        asBoolean(
                            ipqs.bot_status
                        ),

                    frequentAbuser:
                        asBoolean(
                            ipqs.frequent_abuser
                        ),

                    highRiskAttacks:
                        asBoolean(
                            ipqs.high_risk_attacks
                        ),

                    trustedNetwork:
                        asBoolean(
                            ipqs.trusted_network
                        ),

                    requestId:
                        cleanString(
                            ipqs.request_id
                        )

                }

            }
        );


        /* ----------------------------------------------------
           FINAL MESSAGE
        ---------------------------------------------------- */

        let message =
            "Network security check completed.";


        if (
            security.disabled
        ) {

            message =
                security.reason ||
                "Network security restriction detected.";

        }

        else if (
            security.securityStatus ===
            "suspicious"
        ) {

            message =
                security.reason ||
                "Suspicious network detected.";

        }


        /* ----------------------------------------------------
           FINAL RESPONSE
        ---------------------------------------------------- */

        return jsonResponse(
            {

                success:
                    true,

                authenticated:
                    true,

                disabled:
                    security.disabled,

                userId,

                vpnDetected:
                    security.vpnDetected,

                proxyDetected:
                    security.proxyDetected,

                torDetected:
                    security.torDetected,

                hostingDetected:
                    security.hostingDetected,

                securityStatus:
                    security.securityStatus,

                riskScore:
                    security.riskScore,

                reason:
                    security.reason,

                ipAddress:
                    realIP,

                country,

                countryCode,

                region,

                city,

                isp,

                rpcUpdated,

                message

            },
            200
        );

    }
);
