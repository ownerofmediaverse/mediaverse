/* =====================================================
   MEDIAVERSE SECURITY
   NETWORK SECURITY CLIENT
   -----------------------------------------------------
   FILE:
   network-security.js

   CONNECTS TO:
   Supabase Edge Function
   /functions/v1/network-security

   RESPONSIBILITIES:
   01. Get authenticated user
   02. Get active Supabase session
   03. Get device fingerprint
   04. Get optional frontend IP information
   05. Send authenticated request to Edge Function
   06. Receive authoritative server-side IP/location
   07. Receive VPN / Proxy / Tor / Hosting detection
   08. Receive risk score
   09. Return a stable result object
   10. Never expose service-role/IPQS secret

   IMPORTANT:
   - NEVER put service_role key here
   - NEVER put IPQS API key here
   - Frontend IP/location is NOT trusted
   - Edge Function is authoritative
   - supabase.js remains responsible for normal IP history RPCs
===================================================== */


/* =====================================================
   01. CONFIG
===================================================== */

const MEDIAVERSE_NETWORK_SECURITY_URL =
    "https://huawivwmygfphbdxdtkw.supabase.co/functions/v1/network-security";


/*
   NOTE:
   Replace the URL above with the exact Supabase project
   URL if your project URL differs.

   The expected format is:

   https://YOUR_PROJECT_REF.supabase.co/functions/v1/network-security
*/


/* =====================================================
   02. COMMON RESULT BUILDER
===================================================== */

function createMediaverseNetworkSecurityResult(
    values = {}
) {

    return {

        success:
            values.success === true,

        authenticated:
            values.authenticated === true,

        disabled:
            values.disabled === true,

        userId:
            values.userId ||
            null,

        vpnDetected:
            values.vpnDetected === true,

        proxyDetected:
            values.proxyDetected === true,

        torDetected:
            values.torDetected === true,

        hostingDetected:
            values.hostingDetected === true,

        securityStatus:
            values.securityStatus ||
            "unknown",

        riskScore:
            Number(
                values.riskScore || 0
            ),

        reason:
            values.reason ||
            null,

        ipAddress:
            values.ipAddress ||
            null,

        country:
            values.country ||
            null,

        countryCode:
            values.countryCode ||
            null,

        region:
            values.region ||
            null,

        city:
            values.city ||
            null,

        isp:
            values.isp ||
            null,

        rpcUpdated:
            values.rpcUpdated === true,

        message:
            values.message ||
            "Network security check completed."

    };

}


/* =====================================================
   03. GET CURRENT USER
===================================================== */

async function getMediaverseNetworkSecurityUser() {

    try {

        if (
            typeof supabaseClient ===
            "undefined"
        ) {

            console.error(
                "MEDIAVERSE: Supabase client unavailable."
            );

            return null;
        }


        /*
           Prefer the existing helper from supabase.js.
        */

        if (
            typeof getMediaverseCurrentUser ===
            "function"
        ) {

            const user =
                await getMediaverseCurrentUser();

            if (user) {

                return user;

            }

        }


        /*
           Direct Supabase fallback.
        */

        const {
            data,
            error
        } =
            await supabaseClient.auth.getUser();


        if (error) {

            console.error(
                "MEDIAVERSE GET USER ERROR:",
                error
            );

            return null;

        }


        return (
            data?.user ||
            null
        );

    }

    catch (error) {

        console.error(
            "MEDIAVERSE NETWORK SECURITY USER ERROR:",
            error
        );

        return null;

    }

}


/* =====================================================
   04. GET ACTIVE SESSION
===================================================== */

async function getMediaverseNetworkSecuritySession() {

    try {

        if (
            typeof supabaseClient ===
            "undefined"
        ) {

            return {

                success:
                    false,

                session:
                    null,

                message:
                    "Supabase client is unavailable."

            };

        }


        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (
            error ||
            !data?.session
        ) {

            return {

                success:
                    false,

                session:
                    null,

                message:
                    error?.message ||
                    "No active Supabase session."

            };

        }


        if (
            !data.session.access_token
        ) {

            return {

                success:
                    false,

                session:
                    null,

                message:
                    "Supabase access token is missing."

            };

        }


        return {

            success:
                true,

            session:
                data.session,

            message:
                "Active Supabase session found."

        };

    }

    catch (error) {

        console.error(
            "MEDIAVERSE SESSION ERROR:",
            error
        );


        return {

            success:
                false,

            session:
                null,

            message:
                error?.message ||
                "Unable to get Supabase session."

        };

    }

}


/* =====================================================
   05. GET DEVICE FINGERPRINT
===================================================== */

async function getMediaverseSecurityFingerprint() {

    try {

        if (
            typeof generateMediaverseDeviceFingerprint !==
            "function"
        ) {

            console.error(
                "MEDIAVERSE DEVICE FINGERPRINT FUNCTION NOT FOUND."
            );

            return null;

        }


        const fingerprint =
            await generateMediaverseDeviceFingerprint();


        if (
            !fingerprint ||
            typeof fingerprint !==
            "string"
        ) {

            return null;

        }


        const cleanFingerprint =
            fingerprint.trim();


        if (
            !cleanFingerprint
        ) {

            return null;

        }


        return cleanFingerprint;

    }

    catch (error) {

        console.error(
            "MEDIAVERSE DEVICE FINGERPRINT ERROR:",
            error
        );

        return null;

    }

}


/* =====================================================
   06. OPTIONAL FRONTEND IP INFORMATION
   -----------------------------------------------------
   This information is ONLY context.

   It is NOT trusted for security decisions.
   The Edge Function must determine the authoritative IP.
===================================================== */

async function getMediaverseOptionalIPInfo() {

    try {

        if (
            typeof getMediaverseRealIPInfo !==
            "function"
        ) {

            return {

                success:
                    false,

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
                    null

            };

        }


        const result =
            await getMediaverseRealIPInfo();


        if (
            !result ||
            !result.success ||
            !result.ip
        ) {

            return {

                success:
                    false,

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
                    null

            };

        }


        return {

            success:
                true,

            ip:
                result.ip ||
                null,

            country:
                result.country ||
                null,

            countryCode:
                result.countryCode ||
                null,

            region:
                result.region ||
                null,

            city:
                result.city ||
                null,

            isp:
                result.asName ||
                result.isp ||
                null

        };

    }

    catch (error) {

        console.warn(
            "MEDIAVERSE OPTIONAL IP INFO FAILED:",
            error
        );


        return {

            success:
                false,

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
                null

        };

    }

}


/* =====================================================
   07. MAIN NETWORK SECURITY
===================================================== */

async function runMediaverseNetworkSecurity() {

    try {

        /* ---------------------------------------------
           USER
        --------------------------------------------- */

        const user =
            await getMediaverseNetworkSecurityUser();


        if (!user) {

            return createMediaverseNetworkSecurityResult({

                success:
                    false,

                authenticated:
                    false,

                disabled:
                    false,

                securityStatus:
                    "unauthenticated",

                message:
                    "User is not logged in."

            });

        }


        /* ---------------------------------------------
           SESSION
        --------------------------------------------- */

        const sessionResult =
            await getMediaverseNetworkSecuritySession();


        if (
            !sessionResult.success ||
            !sessionResult.session?.access_token
        ) {

            return createMediaverseNetworkSecurityResult({

                success:
                    false,

                authenticated:
                    false,

                disabled:
                    false,

                userId:
                    user.id,

                securityStatus:
                    "unauthenticated",

                message:
                    sessionResult.message ||
                    "No active Supabase session."

            });

        }


        const accessToken =
            sessionResult.session.access_token;


        /* ---------------------------------------------
           DEVICE FINGERPRINT
        --------------------------------------------- */

        const fingerprint =
            await getMediaverseSecurityFingerprint();


        if (!fingerprint) {

            return createMediaverseNetworkSecurityResult({

                success:
                    false,

                authenticated:
                    true,

                disabled:
                    false,

                userId:
                    user.id,

                securityStatus:
                    "unknown",

                message:
                    "Unable to identify this device."

            });

        }


        /* ---------------------------------------------
           OPTIONAL FRONTEND IP
        --------------------------------------------- */

        const ipInfo =
            await getMediaverseOptionalIPInfo();


        /* ---------------------------------------------
           REQUEST BODY
        --------------------------------------------- */

        const requestBody = {

            /*
               Compatibility only.

               Edge Function MUST use the authenticated
               JWT user identity instead of trusting this.
            */

            user_id:
                user.id,

            device_fingerprint:
                fingerprint,

            /*
               Optional context only.
            */

            ip_address:
                ipInfo.ip ||
                null,

            country:
                ipInfo.country ||
                null,

            country_code:
                ipInfo.countryCode ||
                null,

            region:
                ipInfo.region ||
                null,

            city:
                ipInfo.city ||
                null,

            isp:
                ipInfo.isp ||
                null

        };


        /* ---------------------------------------------
           SUPABASE ANON KEY
        --------------------------------------------- */

        let anonKey = "";


        try {

            if (
                typeof window !==
                "undefined" &&
                window.MEDIAVERSE_SUPABASE_ANON_KEY
            ) {

                anonKey =
                    String(
                        window.MEDIAVERSE_SUPABASE_ANON_KEY
                    ).trim();

            }

        }

        catch (keyError) {

            console.warn(
                "MEDIAVERSE ANON KEY READ ERROR:",
                keyError
            );

        }


        /*
           Fallback for existing supabase.js setup.
        */

        if (
            !anonKey &&
            typeof SUPABASE_ANON_KEY !==
            "undefined"
        ) {

            anonKey =
                String(
                    SUPABASE_ANON_KEY
                ).trim();

        }


        /* ---------------------------------------------
           CALL EDGE FUNCTION
        --------------------------------------------- */

        let response;


        try {

            response =
                await fetch(
                    MEDIAVERSE_NETWORK_SECURITY_URL,
                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                "Bearer " +
                                accessToken,

                            "apikey":
                                anonKey

                        },

                        body:
                            JSON.stringify(
                                requestBody
                            ),

                        cache:
                            "no-store"

                    }
                );

        }

        catch (fetchError) {

            console.error(
                "MEDIAVERSE NETWORK SECURITY FETCH ERROR:",
                fetchError
            );


            return createMediaverseNetworkSecurityResult({

                success:
                    false,

                authenticated:
                    true,

                disabled:
                    false,

                userId:
                    user.id,

                securityStatus:
                    "service_unavailable",

                message:
                    "Network security service is unavailable."

            });

        }


        /* ---------------------------------------------
           READ RESPONSE
        --------------------------------------------- */

        let result =
            null;


        try {

            result =
                await response.json();

        }

        catch (jsonError) {

            console.error(
                "MEDIAVERSE NETWORK SECURITY JSON ERROR:",
                jsonError
            );

            result =
                null;

        }


        /* ---------------------------------------------
           HTTP ERROR
        --------------------------------------------- */

        if (!response.ok) {

            console.error(
                "MEDIAVERSE NETWORK SECURITY HTTP ERROR:",
                {

                    status:
                        response.status,

                    result

                }
            );


            return createMediaverseNetworkSecurityResult({

                success:
                    false,

                authenticated:
                    true,

                disabled:
                    false,

                userId:
                    user.id,

                vpnDetected:
                    result?.vpnDetected === true,

                proxyDetected:
                    result?.proxyDetected === true,

                torDetected:
                    result?.torDetected === true,

                hostingDetected:
                    result?.hostingDetected === true,

                securityStatus:
                    result?.securityStatus ||
                    "service_error",

                riskScore:
                    Number(
                        result?.riskScore || 0
                    ),

                reason:
                    result?.reason ||
                    null,

                ipAddress:
                    result?.ipAddress ||
                    null,

                country:
                    result?.country ||
                    null,

                countryCode:
                    result?.countryCode ||
                    null,

                region:
                    result?.region ||
                    null,

                city:
                    result?.city ||
                    null,

                isp:
                    result?.isp ||
                    null,

                rpcUpdated:
                    result?.rpcUpdated === true,

                message:
                    result?.message ||
                    "Network security service failed."

            });

        }


        /* ---------------------------------------------
           NORMALIZE SECURITY RESULT
        --------------------------------------------- */

        const securityResult =
            createMediaverseNetworkSecurityResult({

                success:
                    result?.success === true,

                authenticated:
                    true,

                disabled:
                    result?.disabled === true,

                userId:
                    result?.userId ||
                    user.id,

                vpnDetected:
                    result?.vpnDetected === true,

                proxyDetected:
                    result?.proxyDetected === true,

                torDetected:
                    result?.torDetected === true,

                hostingDetected:
                    result?.hostingDetected === true,

                securityStatus:
                    result?.securityStatus ||
                    "normal",

                riskScore:
                    Number(
                        result?.riskScore || 0
                    ),

                reason:
                    result?.reason ||
                    null,

                ipAddress:
                    result?.ipAddress ||
                    null,

                country:
                    result?.country ||
                    null,

                countryCode:
                    result?.countryCode ||
                    null,

                region:
                    result?.region ||
                    null,

                city:
                    result?.city ||
                    null,

                isp:
                    result?.isp ||
                    null,

                rpcUpdated:
                    result?.rpcUpdated === true,

                message:
                    result?.message ||
                    "Network security check completed."

            });


        /* ---------------------------------------------
           SECURITY THREAT LOG
        --------------------------------------------- */

        if (

            securityResult.vpnDetected ||
            securityResult.proxyDetected ||
            securityResult.torDetected ||
            securityResult.hostingDetected

        ) {

            console.warn(
                "MEDIAVERSE NETWORK THREAT DETECTED:",
                securityResult
            );


            /*
               Dispatch an event so the UI can optionally
               show a security warning.
            */

            try {

                window.dispatchEvent(

                    new CustomEvent(
                        "mediaverse-network-threat",
                        {
                            detail:
                                securityResult
                        }
                    )

                );

            }

            catch (eventError) {

                console.warn(
                    "NETWORK THREAT EVENT ERROR:",
                    eventError
                );

            }

        }


        /* ---------------------------------------------
           DISABLED
        --------------------------------------------- */

        if (
            securityResult.disabled === true
        ) {

            console.error(
                "MEDIAVERSE ACCOUNT SECURITY BLOCK:",
                securityResult
            );


            try {

                window.dispatchEvent(

                    new CustomEvent(
                        "mediaverse-security-disabled",
                        {
                            detail:
                                securityResult
                        }
                    )

                );

            }

            catch (eventError) {

                console.warn(
                    "SECURITY DISABLED EVENT ERROR:",
                    eventError
                );

            }


            return securityResult;

        }


        /* ---------------------------------------------
           SUCCESS
        --------------------------------------------- */

        return securityResult;

    }

    catch (error) {

        console.error(
            "MEDIAVERSE NETWORK SECURITY FATAL ERROR:",
            error
        );


        return createMediaverseNetworkSecurityResult({

            success:
                false,

            authenticated:
                false,

            disabled:
                false,

            securityStatus:
                "unknown",

            riskScore:
                0,

            message:
                error?.message ||
                "Network security check failed."

        });

    }

}


/* =====================================================
   08. SECURITY ENFORCEMENT HELPER
===================================================== */

async function enforceMediaverseNetworkSecurity() {

    const result =
        await runMediaverseNetworkSecurity();


    if (
        result?.disabled === true
    ) {

        try {

            window.dispatchEvent(

                new CustomEvent(
                    "mediaverse-security-disabled",
                    {
                        detail:
                            result
                    }
                )

            );

        }

        catch (error) {

            console.warn(
                "MEDIAVERSE ENFORCEMENT EVENT ERROR:",
                error
            );

        }

    }


    return result;

}


/* =====================================================
   09. GLOBAL EXPORTS
===================================================== */

window.runMediaverseNetworkSecurity =
    runMediaverseNetworkSecurity;

window.enforceMediaverseNetworkSecurity =
    enforceMediaverseNetworkSecurity;


/* =====================================================
   10. LOADED
===================================================== */

console.log(
    "✓ MEDIAVERSE Network Security Client loaded."
);