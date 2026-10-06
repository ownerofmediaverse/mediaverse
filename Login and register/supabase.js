/* =====================================================
   MEDIAVERSE — SUPABASE.JS
   COMPLETE CORRECTED + SECURITY VERSION

   FIXES:
   ✓ 7-parameter IP-change RPC
   ✓ IP-change check BEFORE current-IP overwrite
   ✓ Current device IP/location save
   ✓ Old → New IP history compatibility
   ✓ Device fingerprint
   ✓ Device account limit
   ✓ Login cooldown
   ✓ OTP IP rate limit
   ✓ Profile/email handling
   ✓ Network security integration
   ✓ No existing database data is deleted
===================================================== */


/* =====================================================
   SUPABASE CONFIG
===================================================== */

const SUPABASE_URL =
    "https://huawivwmygfphbdxdtkw.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_o8xSwy5X02mpSwVNeM8aqA_7wVGHv-N";


/* =====================================================
   CREATE SUPABASE CLIENT
===================================================== */

if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
) {
    console.error("Supabase library is not loaded.");
    throw new Error(
        "Supabase library failed to load."
    );
}

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );


/* =====================================================
   NORMALIZE EMAIL
===================================================== */

function normalizeEmail(email) {

    return String(email || "")
        .trim()
        .toLowerCase();
}


/* =====================================================
   NORMALIZE USERNAME
===================================================== */

function normalizeUsername(username) {

    return String(username || "")
        .trim()
        .toLowerCase();
}


/* =====================================================
   USERNAME VALIDATION
===================================================== */

function validateMediaverseUsername(username) {

    const cleanUsername =
        normalizeUsername(username);

    if (!cleanUsername) {

        return {
            valid: false,
            message:
                "Username is required."
        };
    }

    if (
        cleanUsername.length < 5 ||
        cleanUsername.length > 20
    ) {

        return {
            valid: false,
            message:
                "Username must be 5-20 characters."
        };
    }

    if (!/^[a-z]/.test(cleanUsername)) {

        return {
            valid: false,
            message:
                "Username must start with an English letter."
        };
    }

    if (
        !/^[a-z][a-z0-9_.]{4,19}$/
            .test(cleanUsername)
    ) {

        return {
            valid: false,
            message:
                "Username can contain only letters, numbers, underscore (_) and dot (.)."
        };
    }

    if (/^[0-9]+$/.test(cleanUsername)) {

        return {
            valid: false,
            message:
                "Username cannot contain only numbers."
        };
    }

    /* >>>>>>>>>>>>>>>>>>> NEW CHECK ADDED HERE <<<<<<<<<<<<<<<< */
    if (!/[0-9]/.test(cleanUsername)) {

        return {
            valid: false,
            message:
                "Username must contain at least one number."
        };
    }
    /* ======================================================== */

    if (/(.)\1\1/.test(cleanUsername)) {

        return {
            valid: false,
            message:
                "Same character cannot repeat 3 times."
        };
    }

    if (/[0-9]{5,}/.test(cleanUsername)) {

        return {
            valid: false,
            message:
                "Too many numbers are not allowed."
        };
    }

    const blockedUsernames = [

        "admin",
        "administrator",
        "root",
        "test",
        "user",
        "guest",
        "official",
        "support",
        "moderator",
        "moderation",
        "system",
        "owner",
        "staff",
        "help",
        "security"

    ];

    if (
        blockedUsernames.includes(
            cleanUsername
        )
    ) {

        return {
            valid: false,
            message:
                "This username is reserved."
        };
    }

    const blockedPatterns = [

        /media/i,
        /mediaverse/i,
        /chat/i

    ];

    for (
        const pattern of blockedPatterns
    ) {

        if (pattern.test(cleanUsername)) {

            return {
                valid: false,
                message:
                    "This username is reserved."
            };
        }
    }

    return {
        valid: true,
        message:
            "Username format is valid."
    };
}

/* =====================================================
   SAFE JSONB PARSER
===================================================== */

function parseSupabaseJSON(data) {

    if (typeof data === "string") {

        try {

            return JSON.parse(data);

        } catch {

            return {};
        }
    }

    return data || {};
}


/* =====================================================
   SUPABASE ERROR MESSAGE
===================================================== */

function getSupabaseErrorMessage(
    error,
    fallback
) {

    if (!error) {
        return fallback;
    }

    const message =
        String(
            error.message || ""
        ).trim();

    const details =
        String(
            error.details || ""
        ).trim();

    const hint =
        String(
            error.hint || ""
        ).trim();

    const combined =
        (
            message +
            " " +
            details +
            " " +
            hint
        ).toLowerCase();

    if (
        combined.includes("function") &&
        (
            combined.includes("does not exist") ||
            combined.includes("not found") ||
            combined.includes("schema cache")
        )
    ) {

        return (
            "Required Supabase function is not configured or its parameters do not match."
        );
    }

    if (
        combined.includes("permission denied") ||
        combined.includes("not allowed") ||
        combined.includes("rls")
    ) {

        return (
            "Supabase permission denied."
        );
    }

    if (
        combined.includes("failed to fetch") ||
        combined.includes("network")
    ) {

        return (
            "Network error. Please check your internet connection."
        );
    }

    return (
        message ||
        fallback
    );
}


/* =====================================================
   CHECK USERNAME
===================================================== */

async function checkMediaverseUsername(
    username
) {

    try {

        const cleanUsername =
            normalizeUsername(username);

        const validation =
            validateMediaverseUsername(
                cleanUsername
            );

        if (!validation.valid) {

            return {

                success: false,
                exists: false,
                available: false,

                message:
                    validation.message
            };
        }

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "check_username_available",
                {
                    p_username:
                        cleanUsername
                }
            );

        if (error) {

            console.error(
                "USERNAME RPC ERROR:",
                error
            );

            return {

                success: false,
                exists: false,
                available: false,

                message:
                    getSupabaseErrorMessage(
                        error,
                        "Unable to check username."
                    )
            };
        }

        const result =
            parseSupabaseJSON(data);

        const available =
            result.available === true;

        return {

            success: true,

            available,

            exists:
                !available,

            username:
                cleanUsername,

            message:
                available
                    ? "Username is available."
                    : "Username is already taken."
        };

    } catch (error) {

        console.error(
            "USERNAME CHECK ERROR:",
            error
        );

        return {

            success: false,
            exists: false,
            available: false,

            message:
                getSupabaseErrorMessage(
                    error,
                    "Unable to check username."
                )
        };
    }
}


/* =====================================================
   CHECK EMAIL
===================================================== */

async function checkMediaverseEmail(
    email
) {

    try {

        const cleanEmail =
            normalizeEmail(email);

        if (!cleanEmail) {

            return {

                success: false,
                exists: false,
                available: false,

                message:
                    "Email is required."
            };
        }

        const gmailRegex =
            /^[A-Za-z0-9._%+-]+@gmail\.com$/;

        if (!gmailRegex.test(cleanEmail)) {

            return {

                success: false,
                exists: false,
                available: false,

                message:
                    "Please enter a valid Gmail address."
            };
        }

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "check_email_available",
                {
                    p_email:
                        cleanEmail
                }
            );

        if (error) {

            console.error(
                "EMAIL RPC ERROR:",
                error
            );

            return {

                success: false,
                exists: false,
                available: false,

                message:
                    getSupabaseErrorMessage(
                        error,
                        "Unable to check email."
                    )
            };
        }

        const result =
            parseSupabaseJSON(data);

        const available =
            result.available === true;

        return {

            success: true,

            available,

            exists:
                !available,

            email:
                cleanEmail,

            message:
                available
                    ? "Email is available."
                    : "This email is already registered."
        };

    } catch (error) {

        console.error(
            "EMAIL CHECK ERROR:",
            error
        );

        return {

            success: false,
            exists: false,
            available: false,

            message:
                getSupabaseErrorMessage(
                    error,
                    "Unable to check email."
                )
        };
    }
}


/* =====================================================
   DEVICE FINGERPRINT
===================================================== */

async function generateMediaverseDeviceFingerprint() {

    try {

        const data = [

            navigator.userAgent || "",
            navigator.language || "",
            navigator.platform || "",
            navigator.hardwareConcurrency || "",
            navigator.deviceMemory || "",
            screen.width || "",
            screen.height || "",
            screen.colorDepth || "",

            Intl
                .DateTimeFormat()
                .resolvedOptions()
                .timeZone || ""

        ].join("|");


        if (
            window.crypto &&
            window.crypto.subtle &&
            typeof TextEncoder !== "undefined"
        ) {

            const hashBuffer =
                await window.crypto.subtle.digest(
                    "SHA-256",
                    new TextEncoder().encode(data)
                );

            return Array
                .from(
                    new Uint8Array(hashBuffer)
                )
                .map(
                    byte =>
                        byte
                            .toString(16)
                            .padStart(2, "0")
                )
                .join("");
        }


        let hash = 0;

        for (
            let i = 0;
            i < data.length;
            i++
        ) {

            hash =
                ((hash << 5) - hash) +
                data.charCodeAt(i);

            hash =
                hash & hash;
        }

        return (

            "mv_" +

            Math.abs(hash)
                .toString(16)
                .padStart(16, "0") +

            "_" +

            data.length
                .toString(16)
        );

    } catch (error) {

        console.error(
            "DEVICE FINGERPRINT ERROR:",
            error
        );

        try {

            const fallbackData = [

                navigator.userAgent || "",
                navigator.language || "",
                screen.width || "",
                screen.height || ""

            ].join("|");

            let hash = 5381;

            for (
                let i = 0;
                i < fallbackData.length;
                i++
            ) {

                hash =
                    (
                        (hash * 33) ^
                        fallbackData.charCodeAt(i)
                    );
            }

            return (

                "mv_" +

                (hash >>> 0)
                    .toString(16)

            );

        } catch (fallbackError) {

            console.error(
                "FALLBACK FINGERPRINT ERROR:",
                fallbackError
            );

            return null;
        }
    }
}


/* =====================================================
   MEDIAVERSE — DEVICE INFORMATION
   ===================================================== */

function getMediaverseDeviceInfo() {

    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";

    let deviceName = "Unknown Device";
    let deviceType = "Unknown";
    let browserName = "Unknown";
    let osName = "Unknown";
    let osVersion = "";


    /* =================================================
       ANDROID
    ================================================= */

    if (/Android/i.test(ua)) {

        deviceType = "Android";

        osName = "Android";

        const androidVersion =
            ua.match(/Android\s([0-9.]+)/i);

        if (androidVersion) {
            osVersion = androidVersion[1];
        }


        /* Try to detect Android model */

        const modelMatch =
            ua.match(
                /Android[^;]*;\s*(?:[^;]*;\s*)?([^;)]+?)(?:\s+Build\/|;|\))/i
            );

        if (
            modelMatch &&
            modelMatch[1]
        ) {

            let model =
                modelMatch[1]
                    .replace(/Build\/.*$/i, "")
                    .trim();

            if (
                model &&
                model.length < 100 &&
                !/wv|mobile/i.test(model)
            ) {
                deviceName = model;
            }
        }


        if (deviceName === "Unknown Device") {
            deviceName = "Android Phone";
        }
    }


    /* =================================================
       IPHONE
    ================================================= */

    else if (/iPhone/i.test(ua)) {

        deviceType = "iPhone";

        deviceName = "iPhone";

        osName = "iOS";

        const iosVersion =
            ua.match(/OS\s([0-9_]+)/i);

        if (iosVersion) {
            osVersion =
                iosVersion[1]
                    .replace(/_/g, ".");
        }
    }


    /* =================================================
       IPAD
    ================================================= */

    else if (/iPad/i.test(ua)) {

        deviceType = "iPad";

        deviceName = "iPad";

        osName = "iPadOS";

        const ipadVersion =
            ua.match(/OS\s([0-9_]+)/i);

        if (ipadVersion) {
            osVersion =
                ipadVersion[1]
                    .replace(/_/g, ".");
        }
    }


    /* =================================================
       WINDOWS
    ================================================= */

    else if (/Windows/i.test(ua)) {

        deviceType = "Windows PC";

        deviceName = "Windows PC";

        osName = "Windows";

        if (/Windows NT 10.0/i.test(ua)) {

            osVersion = "10/11";

        }

        else if (/Windows NT 6.3/i.test(ua)) {

            osVersion = "8.1";

        }

        else if (/Windows NT 6.2/i.test(ua)) {

            osVersion = "8";

        }

        else if (/Windows NT 6.1/i.test(ua)) {

            osVersion = "7";

        }
    }


    /* =================================================
       MAC
    ================================================= */

    else if (
        /Macintosh|Mac OS X/i.test(ua)
    ) {

        deviceType = "Mac";

        deviceName = "Mac";

        osName = "macOS";

        const macVersion =
            ua.match(/Mac OS X\s([0-9_]+)/i);

        if (macVersion) {

            osVersion =
                macVersion[1]
                    .replace(/_/g, ".");
        }
    }


    /* =================================================
       LINUX
    ================================================= */

    else if (/Linux/i.test(ua)) {

        deviceType = "Linux PC";

        deviceName = "Linux PC";

        osName = "Linux";
    }


    /* =================================================
       BROWSER
    ================================================= */

    if (/Edg\//i.test(ua)) {

        browserName = "Microsoft Edge";

    }

    else if (/OPR\//i.test(ua)) {

        browserName = "Opera";

    }

    else if (
        /Chrome\//i.test(ua) &&
        !/Edg\//i.test(ua) &&
        !/OPR\//i.test(ua)
    ) {

        browserName = "Google Chrome";

    }

    else if (/Firefox\//i.test(ua)) {

        browserName = "Mozilla Firefox";

    }

    else if (
        /Safari\//i.test(ua) &&
        /Version\//i.test(ua)
    ) {

        browserName = "Safari";
    }


    /* =================================================
       RETURN
    ================================================= */

    return {

        deviceName: deviceName,

        deviceType: deviceType,

        browserName: browserName,

        osName: osName,

        osVersion: osVersion,

        userAgent: ua,

        platform: platform
    };
}

/* ============================================================
   MEDIAVERSE — DEVICE INFORMATION DETECTION
   ============================================================ */

function getMediaverseDeviceInfo() {

    const ua = navigator.userAgent || "";
    const platform = navigator.platform || "";

    let deviceType = "Unknown";
    let deviceName = "Unknown Device";
    let browserName = "Unknown";
    let osName = "Unknown";
    let osVersion = "";

    /* =========================
       OPERATING SYSTEM
       ========================= */

    if (/Android/i.test(ua)) {

        osName = "Android";

        const androidMatch =
            ua.match(/Android\s([0-9.]+)/i);

        if (androidMatch) {
            osVersion = androidMatch[1];
        }

        deviceType = "Android";

        const modelMatch =
            ua.match(/Android[^;]*;\s*(?:[^;]*;\s*)?([^;)]+?)(?:\s+Build\/|;|\))/i);

        if (modelMatch && modelMatch[1]) {

            let model =
                modelMatch[1]
                    .replace(/Build\/.*$/i, "")
                    .trim();

            if (model && model.length < 80) {
                deviceName = model;
            }
        }

        if (deviceName === "Unknown Device") {
            deviceName = "Android Phone";
        }

    } else if (/iPhone/i.test(ua)) {

        deviceType = "iPhone";
        deviceName = "iPhone";
        osName = "iOS";

        const iosMatch =
            ua.match(/OS\s([0-9_]+)/i);

        if (iosMatch) {
            osVersion =
                iosMatch[1].replace(/_/g, ".");
        }

    } else if (/iPad/i.test(ua)) {

        deviceType = "iPad";
        deviceName = "iPad";
        osName = "iPadOS";

        const ipadMatch =
            ua.match(/OS\s([0-9_]+)/i);

        if (ipadMatch) {
            osVersion =
                ipadMatch[1].replace(/_/g, ".");
        }

    } else if (/Windows/i.test(ua)) {

        deviceType = "Windows PC";
        deviceName = "Windows PC";
        osName = "Windows";

        if (/Windows NT 10.0/i.test(ua)) {
            osVersion = "10/11";
        } else if (/Windows NT 6.3/i.test(ua)) {
            osVersion = "8.1";
        } else if (/Windows NT 6.2/i.test(ua)) {
            osVersion = "8";
        } else if (/Windows NT 6.1/i.test(ua)) {
            osVersion = "7";
        }

    } else if (/Macintosh|Mac OS X/i.test(ua)) {

        deviceType = "Mac";
        deviceName = "Mac";
        osName = "macOS";

        const macMatch =
            ua.match(/Mac OS X\s([0-9_]+)/i);

        if (macMatch) {
            osVersion =
                macMatch[1].replace(/_/g, ".");
        }

    } else if (/Linux/i.test(ua)) {

        deviceType = "Linux PC";
        deviceName = "Linux PC";
        osName = "Linux";
    }


    /* =========================
       BROWSER
       ========================= */

    if (/Edg\//i.test(ua)) {

        browserName = "Microsoft Edge";

    } else if (/OPR\//i.test(ua)) {

        browserName = "Opera";

    } else if (/Chrome\//i.test(ua) &&
               !/Edg\//i.test(ua)) {

        browserName = "Google Chrome";

    } else if (/Firefox\//i.test(ua)) {

        browserName = "Mozilla Firefox";

    } else if (/Safari\//i.test(ua) &&
               /Version\//i.test(ua)) {

        browserName = "Safari";

    }


    /* =========================
       FINAL RESULT
       ========================= */

    return {
        deviceName,
        deviceType,
        browserName,
        osName,
        osVersion,
        userAgent: ua
    };
}

/* =====================================================
   DEVICE INFORMATION
===================================================== */

function getMediaverseDeviceInfo() {

    const userAgent =
        navigator.userAgent || "";

    const deviceType =
        /Android|iPhone|iPad|iPod/i
            .test(userAgent)
            ? "mobile"
            : "desktop";

    let osName =
        "Unknown";

    if (/Windows/i.test(userAgent)) {

        osName = "Windows";

    } else if (/Android/i.test(userAgent)) {

        osName = "Android";

    } else if (
        /iPhone|iPad|iPod/i.test(
            userAgent
        )
    ) {

        osName = "iOS";

    } else if (/Mac OS/i.test(userAgent)) {

        osName = "macOS";

    } else if (/Linux/i.test(userAgent)) {

        osName = "Linux";
    }


    let browserName =
        "Unknown";

    if (/Edg/i.test(userAgent)) {

        browserName =
            "Microsoft Edge";

    } else if (
        /Chrome/i.test(userAgent) &&
        !/Edg/i.test(userAgent)
    ) {

        browserName =
            "Google Chrome";

    } else if (/Firefox/i.test(userAgent)) {

        browserName =
            "Mozilla Firefox";

    } else if (
        /Safari/i.test(userAgent) &&
        !/Chrome/i.test(userAgent)
    ) {

        browserName =
            "Safari";
    }


    return {

        deviceName:
            navigator.platform ||
            "Unknown Device",

        deviceType,

        osName,

        browserName
    };
}


async function updateMediaverseDeviceInfoToDatabase(deviceFingerprint) {

    try {

        /* ============================================
           GET DEVICE INFORMATION
           ============================================ */

        const deviceInfo = getMediaverseDeviceInfo();

        if (!deviceFingerprint) {
            console.warn(
                "MEDIAVERSE: Device fingerprint missing."
            );
            return;
        }


        /* ============================================
           SAVE DEVICE INFORMATION
           ============================================ */

        const { data, error } = await supabase.rpc(
            "update_mediaverse_device_info",
            {
                p_device_fingerprint: deviceFingerprint,

                p_device_name:
                    deviceInfo.deviceName || "Unknown Device",

                p_device_type:
                    deviceInfo.deviceType || "Unknown",

                p_browser_name:
                    deviceInfo.browserName || "Unknown",

                p_os_name:
                    deviceInfo.osName || "Unknown",

                p_os_version:
                    deviceInfo.osVersion || "",

                p_user_agent:
                    deviceInfo.userAgent || ""
            }
        );


        /* ============================================
           ERROR
           ============================================ */

        if (error) {

            console.warn(
                "MEDIAVERSE: Device info save failed:",
                error
            );

            return;
        }


        /* ============================================
           SUCCESS
           ============================================ */

        console.log(
            "MEDIAVERSE: Device information saved.",
            data
        );

    }

    catch (error) {

        console.warn(
            "MEDIAVERSE: Device info error:",
            error
        );
    }
}

/* =====================================================
   DEVICE ACCOUNT LIMIT
===================================================== */

async function checkMediaverseDeviceLimit() {

    try {

        const fingerprint =
            await generateMediaverseDeviceFingerprint();

        if (!fingerprint) {

            return {

                success: false,
                allowed: false,

                message:
                    "Unable to identify this device."
            };
        }

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "check_device_account_limit",
                {
                    p_device_fingerprint:
                        fingerprint
                }
            );

        if (error) {

            console.error(
                "DEVICE LIMIT CHECK ERROR:",
                error
            );

            return {

                success: false,
                allowed: false,

                message:
                    getSupabaseErrorMessage(
                        error,
                        "Unable to check device limit."
                    )
            };
        }

        const result =
            parseSupabaseJSON(data);

        return {

            success: true,

            allowed:
                result.allowed === true,

            currentCount:
                Number(
                    result.count ?? 0
                ),

            maximumLimit:
                Number(
                    result.limit ?? 3
                ),

            remaining:
                Number(
                    result.remaining ?? 0
                ),

            fingerprint,

            message:
                result.message ||
                "Device limit checked."
        };

    } catch (error) {

        console.error(
            "DEVICE LIMIT ERROR:",
            error
        );

        return {

            success: false,
            allowed: false,

            message:
                error.message ||
                "Device security check failed."
        };
    }
}


/* =====================================================
   LINK ACCOUNT TO DEVICE
===================================================== */

async function linkMediaverseAccountToDevice(
    userId
) {

    try {

        if (!userId) {

            return {

                success: false,
                linked: false,

                message:
                    "User ID is required."
            };
        }

        const fingerprint =
            await generateMediaverseDeviceFingerprint();

        if (!fingerprint) {

            return {

                success: false,
                linked: false,

                message:
                    "Unable to identify this device."
            };
        }

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "link_mediaverse_account_to_device",
                {
                    p_device_fingerprint:
                        fingerprint,

                    p_user_id:
                        userId
                }
            );

        if (error) {

            console.error(
                "DEVICE LINK RPC ERROR:",
                error
            );

            return {

                success: false,
                linked: false,

                message:
                    getSupabaseErrorMessage(
                        error,
                        "Unable to link account to device."
                    )
            };
        }

        const result =
            parseSupabaseJSON(data);

        return {

            success:
                result.success === true,

            linked:
                result.already_linked === true ||
                result.success === true,

            alreadyLinked:
                result.already_linked === true,

            currentCount:
                Number(
                    result.count ?? 0
                ),

            maximumLimit:
                Number(
                    result.limit ?? 3
                ),

            remaining:
                Number(
                    result.remaining ?? 0
                ),

            message:
                result.message ||
                "Device linked successfully."
        };

    } catch (error) {

        console.error(
            "DEVICE LINK ERROR:",
            error
        );

        return {

            success: false,
            linked: false,

            message:
                error.message ||
                "Unable to link account to device."
        };
    }
}


/* =====================================================
   PUBLIC IP CONFIGURATION

   NOTE:
   Client-side API tokens are visible to users.
   The network-security Edge Function should remain
   the authoritative security check.
===================================================== */

const MEDIAVERSE_IPINFO_TOKEN =
    "fea188c82f1c63";


/* =====================================================
   MEDIAVERSE — REAL PUBLIC IP + COUNTRY DETECTION
   PART 4 FIX

   Returns:
   - IP
   - Country name
   - Country code
   - Region
   - City
   - ISP

   IMPORTANT:
   Do NOT accept an IP-only provider as the final result
   when country information is missing.
===================================================== */

async function getMediaverseRealIPInfo() {

    const providers = [

        /* =================================================
           1. IPAPI
        ================================================= */
        async function () {

            const response = await fetch(
                "https://ipapi.co/json/",
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    cache: "no-store"
                }
            );

            if (!response.ok) {
                throw new Error(
                    "IPAPI HTTP " + response.status
                );
            }

            const data = await response.json();

            const ip =
                data?.ip
                    ? String(data.ip).trim()
                    : null;

            const country =
                data?.country_name
                    ? String(data.country_name).trim()
                    : null;

            const countryCode =
                data?.country_code
                    ? String(data.country_code)
                        .trim()
                        .toUpperCase()
                    : null;

            if (!ip) {
                throw new Error(
                    "IPAPI returned no public IP."
                );
            }

            /*
             * Country is important for MEDIAVERSE.
             * If IPAPI gives only IP, try next provider.
             */
            if (!country || !countryCode) {
                throw new Error(
                    "IPAPI returned IP but no country information."
                );
            }

            return {
                success: true,

                ip,

                country,

                countryCode,

                region:
                    data?.region
                        ? String(data.region).trim()
                        : null,

                city:
                    data?.city
                        ? String(data.city).trim()
                        : null,

                asn:
                    data?.asn
                        ? String(data.asn).trim()
                        : null,

                asName:
                    data?.org
                        ? String(data.org).trim()
                        : null,

                asDomain: null
            };
        },


        /* =================================================
           2. IPINFO
           Country + country code + location
        ================================================= */
        async function () {

            const response = await fetch(
                "https://ipinfo.io/json",
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    cache: "no-store"
                }
            );

            if (!response.ok) {
                throw new Error(
                    "IPINFO HTTP " + response.status
                );
            }

            const data = await response.json();

            const ip =
                data?.ip
                    ? String(data.ip).trim()
                    : null;

            const countryCode =
                data?.country
                    ? String(data.country)
                        .trim()
                        .toUpperCase()
                    : null;

            if (!ip) {
                throw new Error(
                    "IPINFO returned no public IP."
                );
            }

            if (!countryCode) {
                throw new Error(
                    "IPINFO returned no country code."
                );
            }

            /*
             * ipinfo gives country code.
             * Use code as fallback country value only
             * if a readable country name is unavailable.
             *
             * Country-name enrichment is handled below.
             */

            let country = null;

            if (data?.country_name) {
                country =
                    String(
                        data.country_name
                    ).trim();
            }

            return {
                success: true,

                ip,

                country,

                countryCode,

                region:
                    data?.region
                        ? String(data.region).trim()
                        : null,

                city:
                    data?.city
                        ? String(data.city).trim()
                        : null,

                asn: null,

                asName:
                    data?.org
                        ? String(data.org).trim()
                        : null,

                asDomain: null
            };
        },


        /* =================================================
           3. IPWHO
           Country name + country code + region + city
        ================================================= */
        async function () {

            const response = await fetch(
                "https://ipwho.is/",
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    cache: "no-store"
                }
            );

            if (!response.ok) {
                throw new Error(
                    "IPWHO HTTP " + response.status
                );
            }

            const data = await response.json();

            if (data?.success === false) {
                throw new Error(
                    "IPWHO returned unsuccessful response."
                );
            }

            const ip =
                data?.ip
                    ? String(data.ip).trim()
                    : null;

            const country =
                data?.country
                    ? String(data.country).trim()
                    : null;

            const countryCode =
                data?.country_code
                    ? String(data.country_code)
                        .trim()
                        .toUpperCase()
                    : null;

            if (!ip) {
                throw new Error(
                    "IPWHO returned no public IP."
                );
            }

            if (!country || !countryCode) {
                throw new Error(
                    "IPWHO returned incomplete country information."
                );
            }

            return {
                success: true,

                ip,

                country,

                countryCode,

                region:
                    data?.region
                        ? String(data.region).trim()
                        : null,

                city:
                    data?.city
                        ? String(data.city).trim()
                        : null,

                asn:
                    data?.connection?.asn
                        ? String(
                            data.connection.asn
                        ).trim()
                        : null,

                asName:
                    data?.connection?.org
                        ? String(
                            data.connection.org
                        ).trim()
                        : null,

                asDomain:
                    data?.connection?.domain
                        ? String(
                            data.connection.domain
                        ).trim()
                        : null
            };
        },


        /* =================================================
           4. IPIFY — IP ONLY LAST RESORT
        ================================================= */
        async function () {

            const response = await fetch(
                "https://api64.ipify.org?format=json",
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    cache: "no-store"
                }
            );

            if (!response.ok) {
                throw new Error(
                    "IPIFY HTTP " + response.status
                );
            }

            const data = await response.json();

            const ip =
                data?.ip
                    ? String(data.ip).trim()
                    : null;

            if (!ip) {
                throw new Error(
                    "IPIFY returned no public IP."
                );
            }

            /*
             * IPIFY DOES NOT PROVIDE COUNTRY.
             *
             * We return the IP as a last-resort result,
             * but country remains null.
             *
             * This prevents fake country information.
             */

            return {
                success: true,

                ip,

                country: null,
                countryCode: null,

                region: null,
                city: null,

                asn: null,
                asName: null,
                asDomain: null
            };
        }
    ];


    const errors = [];


    /* =====================================================
       TRY PROVIDERS
    ===================================================== */

    for (
        let i = 0;
        i < providers.length;
        i++
    ) {

        try {

            const result =
                await providers[i]();


            if (
                result &&
                result.success &&
                result.ip
            ) {

                console.log(
                    "✓ MEDIAVERSE PUBLIC IP DETECTED:",
                    result.ip
                );

                console.log(
                    "✓ MEDIAVERSE COUNTRY:",
                    result.country
                );

                console.log(
                    "✓ MEDIAVERSE COUNTRY CODE:",
                    result.countryCode
                );


                return {

                    success: true,

                    ip:
                        result.ip,

                    country:
                        result.country || null,

                    countryCode:
                        result.countryCode || null,

                    region:
                        result.region || null,

                    city:
                        result.city || null,

                    asn:
                        result.asn || null,

                    asName:
                        result.asName || null,

                    asDomain:
                        result.asDomain || null,

                    message:
                        "Public IP and location detected successfully."
                };
            }

        }
        catch (error) {

            const errorMessage =
                error?.message ||
                "Unknown IP provider error.";

            errors.push(errorMessage);

            console.warn(
                "MEDIAVERSE IP PROVIDER " +
                (i + 1) +
                " FAILED:",
                errorMessage
            );
        }
    }


    console.error(
        "REAL IP DETECTION ERROR:",
        errors
    );


    return {

        success: false,

        ip: null,

        country: null,
        countryCode: null,

        region: null,
        city: null,

        asn: null,
        asName: null,
        asDomain: null,

        message:
            "Unable to detect public IP/location."
    };
}

/* =====================================================
   UPDATE DEVICE IP SECURITY
===================================================== */

async function updateMediaverseDeviceIPInfo(
    providedIPInfo = null
) {

    try {

        const user =
            await getMediaverseCurrentUser();

        if (!user) {

            return {

                success: false,

                message:
                    "User is not logged in."
            };
        }

        const fingerprint =
            await generateMediaverseDeviceFingerprint();

        if (!fingerprint) {

            return {

                success: false,

                message:
                    "Unable to identify device."
            };
        }

        const ipInfo =
            providedIPInfo &&
            providedIPInfo.success
                ? providedIPInfo
                : await getMediaverseRealIPInfo();

        if (!ipInfo.success) {

            return {

                success: false,

                message:
                    ipInfo.message
            };
        }

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "update_device_security_info",
                {

                    p_device_fingerprint:
                        fingerprint,

                    p_ip:
                        ipInfo.ip,

                    p_country:
                        ipInfo.country,

                    p_country_code:
                        ipInfo.countryCode,

                    p_region:
                        ipInfo.region,

                    p_city:
                        ipInfo.city,

                    p_isp:
                        ipInfo.asName
                }
            );

        if (error) {

            console.error(
                "DEVICE IP RPC ERROR:",
                error
            );

            return {

                success: false,

                message:
                    getSupabaseErrorMessage(
                        error,
                        "Unable to save device IP information."
                    )
            };
        }

        const result =
            parseSupabaseJSON(data);

        return {

            success:
                result.success === true,

            ip:
                ipInfo.ip,

            country:
                ipInfo.country,

            countryCode:
                ipInfo.countryCode,

            region:
                ipInfo.region,

            city:
                ipInfo.city,

            asn:
                ipInfo.asn,

            isp:
                ipInfo.asName,

            message:
                result.message ||
                "Device IP information updated."
        };

    } catch (error) {

        console.error(
            "DEVICE IP UPDATE ERROR:",
            error
        );

        return {

            success: false,

            message:
                error.message ||
                "Unable to update device IP information."
        };
    }
}


/* =====================================================
   IP CHANGE DETECTION
   IMPORTANT:
   This MUST run BEFORE current IP is overwritten.
===================================================== */

async function checkMediaverseIPChange(
    providedIPInfo = null
) {

    try {

        const fingerprint =
            await generateMediaverseDeviceFingerprint();

        if (!fingerprint) {

            return {

                success: false,
                ipChanged: false,

                message:
                    "Unable to identify device."
            };
        }

        const ipInfo =
            providedIPInfo &&
            providedIPInfo.success
                ? providedIPInfo
                : await getMediaverseRealIPInfo();

        if (!ipInfo.success) {

            return {

                success: false,
                ipChanged: false,

                message:
                    ipInfo.message
            };
        }


        /* =================================================
           IMPORTANT:
           EXACT 7 PARAMETERS REQUIRED BY SUPABASE RPC
        ================================================= */

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "check_mediaverse_ip_change",
                {

                    p_device_fingerprint:
                        fingerprint,

                    p_ip:
                        ipInfo.ip,

                    p_country:
                        ipInfo.country,

                    p_country_code:
                        ipInfo.countryCode,

                    p_region:
                        ipInfo.region,

                    p_city:
                        ipInfo.city,

                    p_isp:
                        ipInfo.asName
                }
            );

        if (error) {

            console.error(
                "IP CHANGE RPC ERROR:",
                error
            );

            return {

                success: false,
                ipChanged: false,

                message:
                    getSupabaseErrorMessage(
                        error,
                        "Unable to check IP change."
                    )
            };
        }

        const result =
            parseSupabaseJSON(data);

        return {

            success:
                result.success === true,

            ipChanged:
                result.ip_changed === true,

            oldIP:
                result.old_ip ||
                null,

            newIP:
                result.new_ip ||
                ipInfo.ip,

            changeCount:
                Number(
                    result.change_count ?? 0
                ),

            message:
                result.message ||
                "IP security check completed."
        };

    } catch (error) {

        console.error(
            "IP CHANGE CHECK ERROR:",
            error
        );

        return {

            success: false,
            ipChanged: false,

            message:
                error.message ||
                "Unable to check IP change."
        };
    }
}


/* =====================================================
   OTP IP RATE LIMIT
===================================================== */

const MEDIAVERSE_OTP_MAX_IP_REQUESTS =
    5;

const MEDIAVERSE_OTP_IP_LOCK_DAYS =
    3;


/* =====================================================
   CHECK OTP IP RATE LIMIT
===================================================== */

async function checkMediaverseOTPIpRateLimit() {

    try {

        const ipInfo =
            await getMediaverseRealIPInfo();

        if (!ipInfo.success) {

            return {

                success: false,
                allowed: false,
                locked: false,
                blocked: false,

                ip: null,

                requestCount: 0,
                sendCount: 0,

                maximumRequests:
                    MEDIAVERSE_OTP_MAX_IP_REQUESTS,

                remainingRequests: 0,
                remaining: 0,

                remainingSeconds: 0,
                retryAfterSeconds: 0,

                lockedUntil: null,

                message:
                    ipInfo.message ||
                    "Unable to detect your IP address."
            };
        }

        const {
            data,
            error
        } =
            await supabaseClient.rpc(
                "check_otp_ip_rate_limit",
                {

                    p_ip:
                        ipInfo.ip
                }
            );

        if (error) {

            console.error(
                "OTP IP RATE LIMIT RPC ERROR:",
                error
            );

            return {

                success: false,
                allowed: false,
                locked: false,
                blocked: false,

                ip:
                    ipInfo.ip,

                requestCount: 0,
                sendCount: 0,

                maximumRequests:
                    MEDIAVERSE_OTP_MAX_IP_REQUESTS,

                remainingRequests: 0,
                remaining: 0,

                remainingSeconds: 0,
                retryAfterSeconds: 0,

                lockedUntil: null,

                message:
                    getSupabaseErrorMessage(
                        error,
                        "Unable to check OTP security."
                    )
            };
        }

        const result =
            parseSupabaseJSON(data);

        const requestCount =
            Number(
                result.request_count ??
                result.sendCount ??
                0
            );

        const maximumRequests =
            Number(
                result.maximum_requests ??
                result.maximumRequests ??
                MEDIAVERSE_OTP_MAX_IP_REQUESTS
            );

        const remainingRequests =
            Math.max(
                0,
                Number(
                    result.remaining_requests ??
                    result.remaining ??
                    0
                )
            );

        const remainingSeconds =
            Math.max(
                0,
                Number(
                    result.remaining_seconds ??
                    result.retryAfterSeconds ??
                    0
                )
            );

        const locked =
            result.locked === true;

        const allowed =
            result.allowed === true;

        return {

            success:
                result.success !== false,

            allowed,

            locked,

            blocked:
                locked ||
                result.blocked === true,

            ip:
                ipInfo.ip,

            country:
                ipInfo.country,

            countryCode:
                ipInfo.countryCode,

            requestCount,

            sendCount:
                requestCount,

            maximumRequests,

            remainingRequests,

            remaining:
                remainingRequests,

            remainingSeconds,

            retryAfterSeconds:
                remainingSeconds,

            lockedUntil:
                result.locked_until ||
                result.lockedUntil ||
                null,

            message:
                result.message ||
                (
                    allowed
                        ? "OTP request allowed."
                        : "OTP request blocked."
                )
        };

    } catch (error) {

        console.error(
            "OTP IP RATE LIMIT ERROR:",
            error
        );

        return {

            success: false,
            allowed: false,
            locked: false,
            blocked: false,

            ip: null,

            requestCount: 0,
            sendCount: 0,

            maximumRequests:
                MEDIAVERSE_OTP_MAX_IP_REQUESTS,

            remainingRequests: 0,
            remaining: 0,

            remainingSeconds: 0,
            retryAfterSeconds: 0,

            lockedUntil: null,

            message:
                error.message ||
                "OTP security check failed."
        };
    }
}


/* =====================================================
   OTP IP LOCK STATUS
===================================================== */

async function getMediaverseOTPIpLockStatus() {

    try {

        const result =
            await checkMediaverseOTPIpRateLimit();

        return {

            success:
                result.success,

            locked:
                result.locked,

            allowed:
                result.allowed,

            ip:
                result.ip,

            requestCount:
                result.requestCount,

            maximumRequests:
                result.maximumRequests,

            remainingRequests:
                result.remainingRequests,

            remainingSeconds:
                result.remainingSeconds,

            lockedUntil:
                result.lockedUntil,

            message:
                result.message
        };

    } catch (error) {

        console.error(
            "OTP LOCK STATUS ERROR:",
            error
        );

        return {

            success: false,

            locked: false,

            allowed: false,

            ip: null,

            requestCount: 0,

            maximumRequests:
                MEDIAVERSE_OTP_MAX_IP_REQUESTS,

            remainingRequests: 0,

            remainingSeconds: 0,

            lockedUntil: null,

            message:
                error.message ||
                "Unable to check OTP lock status."
        };
    }
}


/* =====================================================
   CREATE ACCOUNT
===================================================== */

async function createMediaverseAccount(
    signupData
) {

    try {

        if (
            !signupData ||
            typeof signupData !== "object"
        ) {

            throw new Error(
                "Invalid signup data."
            );
        }

        const firstName =
            String(
                signupData.firstName || ""
            ).trim();

        const lastName =
            String(
                signupData.lastName || ""
            ).trim();

        const fullName =
            String(
                signupData.fullName || ""
            ).trim();

        const dob =
            String(
                signupData.dob || ""
            ).trim();

        const email =
            normalizeEmail(
                signupData.email
            );

        const username =
            normalizeUsername(
                signupData.username
            );

        const password =
            String(
                signupData.password || ""
            );


        if (!firstName)
            throw new Error(
                "First name is required."
            );

        if (!lastName)
            throw new Error(
                "Last name is required."
            );

        if (!fullName)
            throw new Error(
                "Full name is required."
            );

        if (!dob)
            throw new Error(
                "Date of birth is required."
            );

        if (!email)
            throw new Error(
                "Email is required."
            );

        if (!username)
            throw new Error(
                "Username is required."
            );

        if (!password)
            throw new Error(
                "Password is required."
            );


        const gmailRegex =
            /^[A-Za-z0-9._%+-]+@gmail\.com$/;

        if (!gmailRegex.test(email)) {

            throw new Error(
                "Please enter a valid Gmail address."
            );
        }


        const usernameValidation =
            validateMediaverseUsername(
                username
            );

        if (!usernameValidation.valid) {

            throw new Error(
                usernameValidation.message
            );
        }


        const usernameResult =
            await checkMediaverseUsername(
                username
            );

        if (!usernameResult.success) {

            throw new Error(
                usernameResult.message
            );
        }

        if (!usernameResult.available) {

            throw new Error(
                "This username is already taken."
            );
        }


        const emailResult =
            await checkMediaverseEmail(
                email
            );

        if (!emailResult.success) {

            throw new Error(
                emailResult.message
            );
        }

        if (!emailResult.available) {

            throw new Error(
                "This email is already registered."
            );
        }


        /* DEVICE LIMIT */

        const deviceCheck =
            await checkMediaverseDeviceLimit();

        if (!deviceCheck.success) {

            throw new Error(
                deviceCheck.message
            );
        }

        if (!deviceCheck.allowed) {

            throw new Error(

                "This device has already reached the maximum limit of " +
                deviceCheck.maximumLimit +
                " MEDIAVERSE accounts."

            );
        }


        /* AUTH USER */

        const {
            data: authData,
            error: authError
        } =
            await supabaseClient.auth.signUp({

                email,

                password,

                options: {

                    data: {

                        first_name:
                            firstName,

                        last_name:
                            lastName,

                        full_name:
                            fullName,

                        username,

                        date_of_birth:
                            dob
                    }
                }
            });


        if (authError) {

            console.error(
                "SUPABASE AUTH ERROR:",
                authError
            );

            const authMessage =
                String(
                    authError.message || ""
                ).toLowerCase();

            if (
                authMessage.includes(
                    "already registered"
                ) ||
                authMessage.includes(
                    "already exists"
                ) ||
                authMessage.includes(
                    "user already registered"
                )
            ) {

                throw new Error(
                    "This email is already registered."
                );
            }

            throw new Error(
                authError.message ||
                "Account creation failed."
            );
        }


        if (
            !authData ||
            !authData.user
        ) {

            throw new Error(
                "Supabase did not create the account."
            );
        }


        /* =================================================
           DEVICE LINK
        ================================================= */

        let deviceLinkResult =
            null;

        if (authData.session) {

            deviceLinkResult =
                await linkMediaverseAccountToDevice(
                    authData.user.id
                );

            if (!deviceLinkResult.success) {

                console.error(
                    "DEVICE LINK FAILED:",
                    deviceLinkResult.message
                );

                await supabaseClient.auth.signOut();

                return {

                    success: false,

                    user:
                        authData.user,

                    session:
                        null,

                    emailConfirmationRequired:
                        false,

                    device:
                        deviceLinkResult,

                    ip: null,

                    networkSecurity: null,

                    message:
                        "Account was created, but device security could not be completed. Please contact support."
                };
            }
        }


        /* =================================================
           DEVICE IP + NETWORK SECURITY
           Only possible immediately when a session exists.
        ================================================= */

        let deviceIPResult =
            null;

        let networkSecurityResult =
            null;

        if (authData.session) {

            const ipInfo =
                await getMediaverseRealIPInfo();

            if (ipInfo.success) {

                /* First establish/check IP history. */

                const ipChangeResult =
                    await checkMediaverseIPChange(
                        ipInfo
                    );

                if (!ipChangeResult.success) {

                    console.warn(
                        "SIGNUP IP CHANGE CHECK FAILED:",
                        ipChangeResult.message
                    );
                }

                /*
                   Ensure current device-security row exists
                   even if IP-change function did not create it.
                */

                deviceIPResult =
                    await updateMediaverseDeviceIPInfo(
                        ipInfo
                    );

                if (!deviceIPResult.success) {

                    console.error(
                        "SIGNUP DEVICE IP UPDATE FAILED:",
                        deviceIPResult.message
                    );
                }
            }


            if (
                typeof window.runMediaverseNetworkSecurity ===
                    "function"
            ) {

                networkSecurityResult =
                    await window.runMediaverseNetworkSecurity();

                if (
                    networkSecurityResult &&
                    networkSecurityResult.disabled
                ) {

                    await supabaseClient.auth.signOut();

                    throw new Error(
                        networkSecurityResult.message ||
                        "This account has been disabled due to a security risk."
                    );
                }
            }

            /* >>>>>>>>>>>>>>>>>>> FIX ADDED HERE <<<<<<<<<<<<<<<< */
            /* =================================================
               SAVE DEVICE INFO (NAME, BROWSER, OS ETC) ON SIGNUP
            ================================================= */
            const deviceInfoFingerprint =
                await generateMediaverseDeviceFingerprint();

            if (deviceInfoFingerprint) {
                await updateMediaverseDeviceInfoToDatabase(
                    deviceInfoFingerprint
                );
            }
            /* =================================================
               END OF FIX
            ================================================= */
        }


        return {

            success: true,

            user:
                authData.user,

            session:
                authData.session || null,

            emailConfirmationRequired:
                !authData.session,

            device:
                deviceLinkResult,

            ip:
                deviceIPResult,

            networkSecurity:
                networkSecurityResult,

            message:
                authData.session
                    ? "MEDIAVERSE account created successfully."
                    : "Account created successfully. Please check your email for verification."
        };

    } catch (error) {

        console.error(
            "MEDIAVERSE ACCOUNT CREATION ERROR:",
            error
        );

        return {

            success: false,

            user: null,

            session: null,

            message:
                error.message ||
                "Something went wrong."
        };
    }
}


/* =====================================================
   LOGIN
===================================================== */

async function loginMediaverseAccount(
    email,
    password
) {

    try {

        const cleanEmail =
            normalizeEmail(email);

        const cleanPassword =
            String(password || "");


        if (!cleanEmail)
            throw new Error(
                "Email is required."
            );

        if (!cleanPassword)
            throw new Error(
                "Password is required."
            );


        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(cleanEmail)
        ) {

            throw new Error(
                "Please enter a valid email address."
            );
        }


        /* =================================================
           LOGIN COOLDOWN
        ================================================= */

        const cooldownCheck =
            await supabaseClient.rpc(
                "mediaverse_check_login_cooldown",
                {

                    p_email:
                        cleanEmail
                }
            );


        if (cooldownCheck.error) {

            console.error(
                "LOGIN COOLDOWN CHECK ERROR:",
                cooldownCheck.error
            );

            return {

                success: false,

                cooldownActive: false,

                cooldownError: true,

                remainingSeconds: 0,

                failedAttempts: 0,

                loginSecurity: {

                    cooldownActive: false,

                    remainingSeconds: 0,

                    failedAttempts: 0
                },

                user: null,

                profile: null,

                session: null,

                message:
                    "Unable to verify login security."
            };
        }


        const cooldownData =
            parseSupabaseJSON(
                cooldownCheck.data
            );


        const cooldownActive =
            cooldownData.cooldown === true ||
            cooldownData.active === true;


        const remainingSeconds =
            Math.max(

                0,

                Number(
                    cooldownData.remaining_seconds ??
                    0
                )

            );


        const currentFailedAttempts =
            Number(
                cooldownData.failed_attempts ??
                0
            );


        if (
            cooldownActive &&
            remainingSeconds > 0
        ) {

            return {

                success: false,

                cooldownActive: true,

                cooldownError: false,

                remainingSeconds,

                failedAttempts:
                    currentFailedAttempts,

                loginSecurity: {

                    cooldownActive: true,

                    remainingSeconds,

                    failedAttempts:
                        currentFailedAttempts
                },

                user: null,

                profile: null,

                session: null,

                message:
                    "Too many failed login attempts."
            };
        }


        /* =================================================
           AUTH LOGIN
        ================================================= */

        const {
            data: loginData,
            error: loginError
        } =
            await supabaseClient.auth.signInWithPassword({

                email:
                    cleanEmail,

                password:
                    cleanPassword
            });


        /* =================================================
           FAILED LOGIN
        ================================================= */

        if (loginError) {

            console.error(
                "LOGIN ERROR:",
                loginError
            );


            const failedLoginResult =
                await supabaseClient.rpc(
                    "mediaverse_record_failed_login",
                    {

                        p_email:
                            cleanEmail
                    }
                );


            if (failedLoginResult.error) {

                console.error(
                    "FAILED LOGIN SECURITY ERROR:",
                    failedLoginResult.error
                );

                return {

                    success: false,

                    cooldownActive: false,

                    cooldownError: true,

                    remainingSeconds: 0,

                    failedAttempts:
                        currentFailedAttempts,

                    loginSecurity: {

                        cooldownActive: false,

                        remainingSeconds: 0,

                        failedAttempts:
                            currentFailedAttempts
                    },

                    user: null,

                    profile: null,

                    session: null,

                    message:
                        "Login failed, but login security could not be updated."
                };
            }


            const securityData =
                parseSupabaseJSON(
                    failedLoginResult.data
                );


            const failedAttempts =
                Number(
                    securityData.failed_attempts ??
                    0
                );


            const failedRemainingSeconds =
                Math.max(

                    0,

                    Number(
                        securityData.remaining_seconds ??
                        0
                    )

                );


            const failedCooldownActive =
                securityData.cooldown === true &&
                failedRemainingSeconds > 0;


            const loginSecurity = {

                cooldownActive:
                    failedCooldownActive,

                remainingSeconds:
                    failedRemainingSeconds,

                failedAttempts
            };


            if (failedCooldownActive) {

                return {

                    success: false,

                    cooldownActive: true,

                    cooldownError: false,

                    remainingSeconds:
                        failedRemainingSeconds,

                    failedAttempts,

                    loginSecurity,

                    user: null,

                    profile: null,

                    session: null,

                    message:
                        "Too many failed login attempts."
                };
            }


            const errorMessage =
                String(
                    loginError.message || ""
                ).toLowerCase();


            let userMessage =
                "Login failed.";


if (
    errorMessage.includes(
        "invalid login credentials"
    )
) {

    const emailCheck =
        await checkMediaverseEmail(cleanEmail);

    if (
        emailCheck.success &&
        !emailCheck.exists
    ) {

        userMessage =
            "No account found with this email.";

    } else {

        userMessage =
            "Incorrect email or password.";
    }

} else if (
                errorMessage.includes(
                    "email not confirmed"
                )
            ) {

                userMessage =
                    "Please verify your email before logging in.";

            } else {

                userMessage =
                    loginError.message ||
                    "Login failed.";
            }


            return {

                success: false,

                cooldownActive: false,

                cooldownError: false,

                remainingSeconds: 0,

                failedAttempts,

                loginSecurity,

                user: null,

                profile: null,

                session: null,

                message:
                    userMessage
            };
        }


        /* =================================================
           SESSION
        ================================================= */

        if (
            !loginData ||
            !loginData.user ||
            !loginData.session
        ) {

            throw new Error(
                "Login session could not be created."
            );
        }


        const user =
            loginData.user;


        /* =================================================
           EMAIL CONFIRMATION
        ================================================= */

        if (
            !user.email_confirmed_at
        ) {

            await supabaseClient.auth.signOut();

            throw new Error(
                "Please verify your email before logging in."
            );
        }


        /* =================================================
           PROFILE
        ================================================= */

        const {
            data: profile,
            error: profileError
        } =
            await supabaseClient
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();


        if (profileError) {

            console.error(
                "PROFILE LOGIN CHECK ERROR:",
                profileError
            );

            await supabaseClient.auth.signOut();

            throw new Error(
                "Unable to verify your account profile."
            );
        }


        if (!profile) {

            await supabaseClient.auth.signOut();

            throw new Error(
                "Account profile was not found."
            );
        }


        /* =================================================
           ACCOUNT STATUS
        ================================================= */

        const accountStatus =
            String(
                profile.account_status ||
                profile.status ||
                "active"
            ).toLowerCase();


        const isBlocked =
            profile.blocked === true ||
            profile.is_blocked === true ||
            [
                "blocked",
                "banned",
                "disabled"
            ].includes(
                accountStatus
            );


        if (isBlocked) {

            await supabaseClient.auth.signOut();

            return {

                success: false,

                banned: true,

                blocked: true,

                user: null,

                profile,

                session: null,

                message:
                    "This MEDIAVERSE account has been restricted."
            };
        }


        /* =================================================
           DEVICE LINK
        ================================================= */

        const deviceLinkResult =
            await linkMediaverseAccountToDevice(
                user.id
            );


        if (!deviceLinkResult.success) {

            /*
             * Security-sensitive device-link failure:
             * Do NOT silently continue.
             */

            await supabaseClient.auth.signOut();

            return {

                success: false,

                banned: false,

                blocked: false,

                deviceSecurityError: true,

                user: null,

                profile: null,

                session: null,

                message:
                    deviceLinkResult.message ||
                    "Unable to complete device security."
            };
        }


        /* =================================================
           GET IP ONCE
           Reuse the same IP data for both checks.
        ================================================= */

        const ipInfo =
            await getMediaverseRealIPInfo();


        if (!ipInfo.success) {

            await supabaseClient.auth.signOut();

            return {

                success: false,

                banned: false,

                blocked: false,

                ipSecurityError: true,

                user: null,

                profile: null,

                session: null,

                message:
                    ipInfo.message ||
                    "Unable to verify your network security."
            };
        }


        /* =================================================
           IP CHANGE CHECK — FIRST

           IMPORTANT:
           Old current_ip must be read before it is
           overwritten with the new IP.
        ================================================= */

        const ipChangeResult =
            await checkMediaverseIPChange(
                ipInfo
            );


        if (!ipChangeResult.success) {

            console.error(
                "IP CHANGE CHECK FAILED:",
                ipChangeResult.message
            );

            /*
             * Fail closed for this security check.
             * User is signed out instead of continuing
             * with an unverified IP state.
             */

            await supabaseClient.auth.signOut();

            return {

                success: false,

                banned: false,

                blocked: false,

                ipSecurityError: true,

                user: null,

                profile: null,

                session: null,

                message:
                    ipChangeResult.message ||
                    "Unable to complete IP security verification."
            };
        }


        /* =================================================
           CURRENT DEVICE IP SAVE

           The IP-change RPC should normally already
           upsert current device security. This second
           call guarantees the current IP/location data
           is present and updated.
        ================================================= */

        const deviceIPResult =
            await updateMediaverseDeviceIPInfo(
                ipInfo
            );


        if (!deviceIPResult.success) {

            console.error(
                "LOGIN DEVICE IP UPDATE FAILED:",
                deviceIPResult.message
            );

            await supabaseClient.auth.signOut();

            return {

                success: false,

                banned: false,

                blocked: false,

                ipSecurityError: true,

                user: null,

                profile: null,

                session: null,

                message:
                    deviceIPResult.message ||
                    "Unable to save device security information."
            };
        }


        /* =================================================
           NETWORK SECURITY
        ================================================= */

        let networkSecurityResult =
            null;


        if (
            typeof window.runMediaverseNetworkSecurity ===
                "function"
        ) {

            networkSecurityResult =
                await window.runMediaverseNetworkSecurity();


            if (
                networkSecurityResult &&
                networkSecurityResult.disabled
            ) {

                await supabaseClient.auth.signOut();

                throw new Error(

                    networkSecurityResult.message ||
                    "Your account has been disabled due to a security risk."

                );
            }
        }

        /* >>>>>>>>>>>>>>>>>>> FIX ADDED HERE <<<<<<<<<<<<<<<< */
        /* =================================================
           SAVE DEVICE INFO (NAME, BROWSER, OS ETC) ON LOGIN
        ================================================= */
        const deviceInfoFingerprint =
            await generateMediaverseDeviceFingerprint();

        if (deviceInfoFingerprint) {
            await updateMediaverseDeviceInfoToDatabase(
                deviceInfoFingerprint
            );
        }
        /* =================================================
           END OF FIX
        ================================================= */

        /* =================================================
           SUCCESS
        ================================================= */

        return {

            success: true,

            banned: false,

            blocked: false,

            user,

            profile,

            session:
                loginData.session,

            device:
                deviceLinkResult,

            ip:
                deviceIPResult,

            ipChange:
                ipChangeResult,

            networkSecurity:
                networkSecurityResult,

            loginSecurity: {

                cooldownActive: false,

                remainingSeconds: 0,

                failedAttempts: 0
            },

            message:
                "Login successful."
        };

    } catch (error) {

        console.error(
            "MEDIAVERSE LOGIN ERROR:",
            error
        );

        return {

            success: false,

            banned: false,

            blocked: false,

            cooldownActive: false,

            cooldownError: false,

            remainingSeconds: 0,

            failedAttempts: 0,

            loginSecurity: {

                cooldownActive: false,

                remainingSeconds: 0,

                failedAttempts: 0
            },

            user: null,

            profile: null,

            session: null,

            message:
                error.message ||
                "Unable to login."
        };
    }
}


/* =====================================================
   CURRENT USER
===================================================== */

async function getMediaverseCurrentUser() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getUser();

        if (error) {

            console.error(
                "GET USER ERROR:",
                error
            );

            return null;
        }

        return (
            data &&
            data.user
        )
            ? data.user
            : null;

    } catch (error) {

        console.error(
            "CURRENT USER ERROR:",
            error
        );

        return null;
    }
}


/* =====================================================
   CURRENT PROFILE
===================================================== */

async function getMediaverseProfile() {

    try {

        const user =
            await getMediaverseCurrentUser();

        if (!user) {

            return {

                success: false,

                profile: null,

                message:
                    "User is not logged in."
            };
        }


        const {
            data,
            error
        } =
            await supabaseClient
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .maybeSingle();


        if (error) {

            console.error(
                "PROFILE FETCH ERROR:",
                error
            );

            return {

                success: false,

                profile: null,

                message:
                    error.message ||
                    "Unable to load profile."
            };
        }


        return {

            success: true,

            profile:
                data || null,

            message:
                data
                    ? "Profile loaded successfully."
                    : "Profile is not available yet."
        };

    } catch (error) {

        console.error(
            "GET PROFILE ERROR:",
            error
        );

        return {

            success: false,

            profile: null,

            message:
                error.message ||
                "Unable to load profile."
        };
    }
}


/* =====================================================
   SIGN OUT
===================================================== */

async function signOutMediaverse() {

    try {

        const {
            error
        } =
            await supabaseClient.auth.signOut();


        if (error) {

            console.error(
                "SIGN OUT ERROR:",
                error
            );

            return {

                success: false,

                message:
                    error.message ||
                    "Sign out failed."
            };
        }


        return {

            success: true,

            message:
                "Signed out successfully."
        };

    } catch (error) {

        console.error(
            "SIGN OUT ERROR:",
            error
        );

        return {

            success: false,

            message:
                error.message ||
                "Sign out failed."
        };
    }
}


/* =====================================================
   AUTH STATE CHANGE
===================================================== */

function onMediaverseAuthStateChange(
    callback
) {

    return supabaseClient
        .auth
        .onAuthStateChange(

            (
                event,
                session
            ) => {

                try {

                    if (
                        typeof callback ===
                        "function"
                    ) {

                        callback(
                            event,
                            session
                        );
                    }

                } catch (error) {

                    console.error(
                        "AUTH STATE CALLBACK ERROR:",
                        error
                    );
                }
            }
        );
}


/* =====================================================
   GLOBAL ACCESS
===================================================== */

window.supabaseClient =
    supabaseClient;

window.MEDIAVERSE_SUPABASE_URL =
    SUPABASE_URL;

window.MEDIAVERSE_SUPABASE_ANON_KEY =
    SUPABASE_ANON_KEY;

window.SUPABASE_ANON_KEY =
    SUPABASE_ANON_KEY;


window.normalizeEmail =
    normalizeEmail;

window.normalizeUsername =
    normalizeUsername;

window.validateMediaverseUsername =
    validateMediaverseUsername;


window.checkMediaverseUsername =
    checkMediaverseUsername;

window.checkMediaverseEmail =
    checkMediaverseEmail;


window.createMediaverseAccount =
    createMediaverseAccount;

window.loginMediaverseAccount =
    loginMediaverseAccount;


window.getMediaverseCurrentUser =
    getMediaverseCurrentUser;

window.getMediaverseProfile =
    getMediaverseProfile;

window.signOutMediaverse =
    signOutMediaverse;

window.onMediaverseAuthStateChange =
    onMediaverseAuthStateChange;


window.generateMediaverseDeviceFingerprint =
    generateMediaverseDeviceFingerprint;

window.getMediaverseDeviceInfo =
    getMediaverseDeviceInfo;


window.checkMediaverseDeviceLimit =
    checkMediaverseDeviceLimit;

window.linkMediaverseAccountToDevice =
    linkMediaverseAccountToDevice;


window.getMediaverseRealIPInfo =
    getMediaverseRealIPInfo;

window.updateMediaverseDeviceIPInfo =
    updateMediaverseDeviceIPInfo;

window.checkMediaverseIPChange =
    checkMediaverseIPChange;


window.checkMediaverseOTPIpRateLimit =
    checkMediaverseOTPIpRateLimit;

window.getMediaverseOTPIpLockStatus =
    getMediaverseOTPIpLockStatus;


/* =====================================================
   SECURITY CONSTANTS
===================================================== */

window.MEDIAVERSE_OTP_MAX_IP_REQUESTS =
    MEDIAVERSE_OTP_MAX_IP_REQUESTS;

window.MEDIAVERSE_OTP_IP_LOCK_DAYS =
    MEDIAVERSE_OTP_IP_LOCK_DAYS;


/* =====================================================
   READY
===================================================== */

console.log(
    "✓ MEDIAVERSE Supabase initialized successfully."
);

console.log(
    "✓ Username checker supports: a-z, 0-9, _, ."
);

console.log(
    "✓ Device fingerprint security loaded."
);

console.log(
    "✓ Real public IP security loaded."
);

console.log(
    "✓ IP change detection loaded."
);

console.log(
    "✓ IP-change RPC uses 7 parameters."
);

console.log(
    "✓ Current IP is checked before overwrite."
);

console.log(
    "✓ OTP IP rate-limit system loaded."
);

console.log(
    "✓ OTP limit: 5 requests per IP."
);

console.log(
    "✓ OTP IP lock: 3 days."
);