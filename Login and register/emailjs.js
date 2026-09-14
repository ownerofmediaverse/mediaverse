/* =====================================================
   MEDIAVERSE — EMAILJS OTP ENGINE
   PART 6.8 + SUPABASE IP SECURITY
   -----------------------------------------------------
   EmailJS Browser SDK v4

   FEATURES:
   - 6 Digit OTP
   - 5 Minute Expiry
   - Maximum 5 Wrong Attempts
   - OTP Lock After 5 Wrong Attempts
   - 60 Second Resend Cooldown
   - Email Change Protection
   - Verified Email State Protection
   - Supabase IP Rate Limit
   - Maximum 5 OTP Requests / IP
   - 3 Day IP Lock
===================================================== */


/* =====================================================
   01. EMAILJS CONFIG
===================================================== */

const EMAILJS_PUBLIC_KEY =
    "HcG1Ae0LUYzYb-s6v";

const EMAILJS_SERVICE_ID =
    "service_5uqde6e";

const EMAILJS_TEMPLATE_ID =
    "template_ojruibs";


/* =====================================================
   02. SUPABASE CONFIG
   -----------------------------------------------------
   IMPORTANT:
   Supabase configuration is taken from the same
   project used by supabase.js.

   NEVER use service_role key here.
===================================================== */

const MEDIAVERSE_SUPABASE_URL =
    "https://huawivwmygfphbdxdtkw.supabase.co";


/*
   supabase.js exposes the public key globally.

   If emailjs.js is loaded before supabase.js,
   this value will be read later when needed.
*/

function getMediaverseSupabaseAnonKey(){

    if(
        typeof window !== "undefined" &&
        window.MEDIAVERSE_SUPABASE_ANON_KEY
    ){

        return String(
            window.MEDIAVERSE_SUPABASE_ANON_KEY
        ).trim();

    }


    if(
        typeof SUPABASE_ANON_KEY !==
        "undefined"
    ){

        return String(
            SUPABASE_ANON_KEY
        ).trim();

    }


    return "";

}


/* =====================================================
   03. OTP SETTINGS
===================================================== */

const OTP_LENGTH =
    6;

const OTP_EXPIRY_MINUTES =
    5;

const OTP_RESEND_COOLDOWN =
    60;

const OTP_MAX_ATTEMPTS =
    5;

const OTP_LOCK_MINUTES =
    10;


/* =====================================================
   04. OTP STATE
===================================================== */

let currentSignupOTP =
    "";

let otpExpiresAt =
    null;

let verifiedSignupEmail =
    "";

let otpCooldownInterval =
    null;

let otpCooldownRemaining =
    0;

let otpWrongAttempts =
    0;

let otpLockedUntil =
    null;


/* =====================================================
   05. EMAIL STATE
===================================================== */

let otpSentEmail =
    "";

let otpVerified =
    false;


/* =====================================================
   06. IP SECURITY STATE
===================================================== */

let otpIPSecurityState = {

    checked:
        false,

    allowed:
        false,

    blocked:
        false,

    sendCount:
        0,

    remaining:
        0,

    blockedUntil:
        null,

    retryAfterSeconds:
        null,

    message:
        ""

};


/* =====================================================
   07. EMAILJS INITIALIZE
===================================================== */

(function(){

    try{

        if(
            typeof emailjs ===
            "undefined"
        ){

            console.error(
                "EmailJS v4 library is not loaded."
            );

            return;

        }


        emailjs.init({

            publicKey:
                EMAILJS_PUBLIC_KEY

        });


        console.log(
            "✓ MEDIAVERSE EmailJS v4 initialized."
        );

    }

    catch(error){

        console.error(
            "EMAILJS INITIALIZATION ERROR:",
            error
        );

    }

})();


/* =====================================================
   08. GENERATE OTP
===================================================== */

function generateSignupOTP(){

    let otp = "";

    for(
        let i = 0;
        i < OTP_LENGTH;
        i++
    ){

        otp += Math.floor(
            Math.random() * 10
        );

    }

    return otp;

}


/* =====================================================
   09. GET FULL NAME
===================================================== */

function getSignupFullName(){

    const fullNameInput =
        document.getElementById(
            "fullName"
        );


    if(
        fullNameInput &&
        fullNameInput.value.trim()
    ){

        return fullNameInput.value.trim();

    }


    const firstName =
        document
        .getElementById(
            "firstName"
        )
        ?.value
        .trim() ||
        "";


    const lastName =
        document
        .getElementById(
            "lastName"
        )
        ?.value
        .trim() ||
        "";


    return (
        firstName +
        " " +
        lastName
    ).trim() ||
    "MEDIAVERSE User";

}


/* =====================================================
   10. STATUS ELEMENTS
===================================================== */

function getOTPStatusElement(){

    return document.getElementById(
        "otpStatus"
    );

}


function getEmailStatusElement(){

    return document.getElementById(
        "emailStatus"
    );

}


/* =====================================================
   11. CLEAR OTP INPUTS
===================================================== */

function clearOTPInputs(){

    const boxes =
        document.querySelectorAll(
            ".otp-digit"
        );


    boxes.forEach(
        box => {

            box.value =
                "";

            box.disabled =
                false;

        }
    );

}


/* =====================================================
   12. ENABLE OTP INPUTS
===================================================== */

function enableOTPInputs(){

    const boxes =
        document.querySelectorAll(
            ".otp-digit"
        );


    boxes.forEach(
        box => {

            box.disabled =
                false;

        }
    );

}


/* =====================================================
   13. DISABLE OTP INPUTS
===================================================== */

function disableOTPInputs(){

    const boxes =
        document.querySelectorAll(
            ".otp-digit"
        );


    boxes.forEach(
        box => {

            box.disabled =
                true;

        }
    );

}


/* =====================================================
   14. START RESEND COOLDOWN
===================================================== */

function startOTPCooldown(){

    const button =
        document.querySelector(
            ".get-code"
        );


    if(!button){

        return;

    }


    clearInterval(
        otpCooldownInterval
    );


    otpCooldownRemaining =
        OTP_RESEND_COOLDOWN;


    button.disabled =
        true;


    button.innerHTML =
        `Resend (${otpCooldownRemaining}s)`;


    otpCooldownInterval =
        setInterval(

            function(){

                otpCooldownRemaining--;


                if(
                    otpCooldownRemaining <=
                    0
                ){

                    clearInterval(
                        otpCooldownInterval
                    );


                    otpCooldownInterval =
                        null;


                    otpCooldownRemaining =
                        0;


                    button.disabled =
                        false;


                    button.innerHTML =
                        "Get Code";


                    return;

                }


                button.innerHTML =
                    `Resend (${otpCooldownRemaining}s)`;

            },

            1000

        );

}


/* =====================================================
   15. CHECK OTP LOCK
===================================================== */

function isOTPLocked(){

    if(!otpLockedUntil){

        return false;

    }


    if(
        Date.now() <
        otpLockedUntil
    ){

        return true;

    }


    otpLockedUntil =
        null;

    otpWrongAttempts =
        0;

    enableOTPInputs();

    return false;

}


/* =====================================================
   16. LOCK OTP
===================================================== */

function lockOTP(){

    otpLockedUntil =
        Date.now() +
        OTP_LOCK_MINUTES *
        60 *
        1000;


    currentSignupOTP =
        "";

    otpExpiresAt =
        null;

    verifiedSignupEmail =
        "";

    otpVerified =
        false;


    disableOTPInputs();

}


/* =====================================================
   17. RESET OTP STATE
===================================================== */

function resetOTPState(){

    currentSignupOTP =
        "";

    otpExpiresAt =
        null;

    verifiedSignupEmail =
        "";

    otpSentEmail =
        "";

    otpVerified =
        false;

    otpWrongAttempts =
        0;

    otpLockedUntil =
        null;


    clearOTPInputs();

}


/* =====================================================
   18. FORMAT REMAINING TIME
===================================================== */

function formatOTPBlockTime(
    seconds
){

    seconds =
        Math.max(
            0,
            Number(seconds) || 0
        );


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const secs =
        seconds % 60;


    if(hours > 0){

        return (
            `${hours}h ` +
            `${minutes}m`
        );

    }


    if(minutes > 0){

        return (
            `${minutes}m ` +
            `${secs}s`
        );

    }


    return `${secs}s`;

}


/* =====================================================
   19. SUPABASE OTP IP RATE LIMIT CHECK
   -----------------------------------------------------
   IMPORTANT FIX:

   OLD SYSTEM:
   emailjs.js
       ↓
   /functions/v1/otp-security
       ↓
   fetch()

   NEW COMPATIBLE SYSTEM:
   emailjs.js
       ↓
   supabase.js
       ↓
   checkMediaverseOTPIpRateLimit()
       ↓
   check_otp_ip_rate_limit
       ↓
   IP ALLOW / BLOCK

   This keeps OTP security in the existing
   supabase.js security layer.
===================================================== */

async function checkMediaverseOTPRateLimit(
    email
){

    try{

        /* ---------------------------------------------
           EMAIL NORMALIZATION
        --------------------------------------------- */

        const cleanEmail =
            String(
                email || ""
            )
            .trim()
            .toLowerCase();


        /* ---------------------------------------------
           SUPABASE SECURITY FUNCTION
        --------------------------------------------- */

        if(
            typeof window.checkMediaverseOTPIpRateLimit !==
            "function"
        ){

            console.error(
                "SUPABASE OTP SECURITY FUNCTION NOT FOUND."
            );


            otpIPSecurityState = {

                checked:
                    true,

                allowed:
                    false,

                blocked:
                    false,

                sendCount:
                    0,

                remaining:
                    0,

                blockedUntil:
                    null,

                retryAfterSeconds:
                    null,

                message:
                    "Supabase OTP security is not loaded yet."

            };


            return {

                success:
                    false,

                allowed:
                    false,

                blocked:
                    false,

                sendCount:
                    0,

                remaining:
                    0,

                blockedUntil:
                    null,

                retryAfterSeconds:
                    null,

                message:
                    "Supabase OTP security is not loaded yet."

            };

        }


        /* ---------------------------------------------
           CALL SUPABASE.JS SECURITY FUNCTION

           IP is detected by supabase.js.
           Browser does NOT send its own IP.
        --------------------------------------------- */

        const result =
            await window
            .checkMediaverseOTPIpRateLimit();


        /* ---------------------------------------------
           NORMALIZE RESULT
        --------------------------------------------- */

        const allowed =
            result?.allowed === true;


        const blocked =
            result?.blocked === true ||
            result?.locked === true;


        const sendCount =
            Number(
                result?.sendCount ??
                result?.requestCount ??
                0
            );


        const remaining =
            Number(
                result?.remaining ??
                result?.remainingRequests ??
                0
            );


        const retryAfterSeconds =
            Number(
                result?.retryAfterSeconds ??
                result?.remainingSeconds ??
                0
            );


        const blockedUntil =
            result?.blockedUntil ||
            result?.lockedUntil ||
            null;


        const message =
            result?.message ||
            (
                allowed
                    ? "OTP request allowed."
                    : "OTP security check failed."
            );


        /* ---------------------------------------------
           SAVE STATE
        --------------------------------------------- */

        otpIPSecurityState = {

            checked:
                true,

            allowed:
                allowed,

            blocked:
                blocked,

            sendCount:
                sendCount,

            remaining:
                remaining,

            blockedUntil:
                blockedUntil,

            retryAfterSeconds:
                retryAfterSeconds,

            message:
                message

        };


        /* ---------------------------------------------
           BLOCKED
        --------------------------------------------- */

        if(!allowed){

            return {

                success:
                    result?.success !== false,

                allowed:
                    false,

                blocked:
                    blocked,

                sendCount:
                    sendCount,

                remaining:
                    remaining,

                blockedUntil:
                    blockedUntil,

                retryAfterSeconds:
                    retryAfterSeconds,

                message:
                    message

            };

        }


        /* ---------------------------------------------
           ALLOWED
        --------------------------------------------- */

        return {

            success:
                result?.success !== false,

            allowed:
                true,

            blocked:
                false,

            sendCount:
                sendCount,

            remaining:
                remaining,

            blockedUntil:
                null,

            retryAfterSeconds:
                0,

            message:
                message

        };

    }

    catch(error){

        console.error(
            "MEDIAVERSE OTP IP SECURITY ERROR:",
            error
        );


        otpIPSecurityState = {

            checked:
                true,

            allowed:
                false,

            blocked:
                false,

            sendCount:
                0,

            remaining:
                0,

            blockedUntil:
                null,

            retryAfterSeconds:
                null,

            message:
                error?.message ||
                "Unable to verify OTP security."

        };


        return {

            success:
                false,

            allowed:
                false,

            blocked:
                false,

            sendCount:
                0,

            remaining:
                0,

            blockedUntil:
                null,

            retryAfterSeconds:
                null,

            message:
                error?.message ||
                "Unable to verify OTP security."

        };

    }

}


/* =====================================================
   20. SEND SIGNUP OTP
===================================================== */

async function sendSignupOTP(){

    const emailInput =
        document.getElementById(
            "email"
        );


    const status =
        getOTPStatusElement();


    const emailStatus =
        getEmailStatusElement();


    const button =
        document.querySelector(
            ".get-code"
        );


    if(
        !emailInput ||
        !status
    ){

        console.error(
            "Required OTP elements not found."
        );

        return;

    }


    const email =
        emailInput.value
        .trim()
        .toLowerCase();


    const gmailRegex =
        /^[A-Za-z0-9._%+-]+@gmail\.com$/;


    /* =================================================
       EMPTY EMAIL
    ================================================= */

    if(!email){

        status.innerHTML =
            "❌ Please enter your Gmail address.";

        status.classList.remove(
            "success"
        );

        return;

    }


    /* =================================================
       GMAIL FORMAT
    ================================================= */

    if(
        !gmailRegex.test(email)
    ){

        status.innerHTML =
            "❌ Please enter a valid Gmail address.";

        status.classList.remove(
            "success"
        );

        return;

    }


    /* =================================================
       EMAIL AVAILABILITY
    ================================================= */

    if(
        typeof emailIsAvailable ===
        "undefined" ||
        emailIsAvailable !== true
    ){

        status.innerHTML =
            "❌ Please wait until Gmail availability checking is completed.";

        status.classList.remove(
            "success"
        );

        return;

    }


    /* =================================================
       CONFIRMED EMAIL
    ================================================= */

    if(
        typeof checkedEmail ===
        "undefined" ||
        checkedEmail !== email
    ){

        status.innerHTML =
            "❌ Please confirm that this Gmail is available first.";

        status.classList.remove(
            "success"
        );

        return;

    }


    /* =================================================
       LOCAL OTP LOCK
    ================================================= */

    if(isOTPLocked()){

        const remaining =
            Math.ceil(

                (
                    otpLockedUntil -
                    Date.now()

                ) / 1000

            );


        status.innerHTML =
            `❌ Too many incorrect attempts. Try again in ${formatOTPBlockTime(remaining)}.`;

        status.classList.remove(
            "success"
        );

        return;

    }


    /* =================================================
       EMAILJS CHECK
    ================================================= */

    if(
        typeof emailjs ===
        "undefined"
    ){

        status.innerHTML =
            "❌ Email service failed to load.";

        status.classList.remove(
            "success"
        );

        return;

    }


    /* =================================================
       BUTTON LOCK
    ================================================= */

    if(button){

        button.disabled =
            true;

        button.innerHTML =
            '<i class="fa-solid fa-spinner fa-spin"></i>';

    }


    status.innerHTML =
        "Checking OTP security...";


    status.classList.remove(
        "success"
    );


    /* =================================================
       SUPABASE IP SECURITY CHECK

       IMPORTANT:
       This happens BEFORE OTP generation
       and BEFORE EmailJS send.
    ================================================= */

    const securityResult =
        await checkMediaverseOTPRateLimit(
            email
        );


    /* =================================================
       IP BLOCKED / SECURITY FAILURE
    ================================================= */

    if(
        !securityResult.allowed
    ){

        if(
            securityResult.blocked
        ){

            const seconds =
                securityResult.retryAfterSeconds ||
                0;


            if(seconds > 0){

                status.innerHTML =
                    `❌ Too many OTP requests from this IP. Please try again after ${formatOTPBlockTime(seconds)}.`;

            }

            else{

                status.innerHTML =
                    "❌ Too many OTP requests from this IP. Please try again later.";

            }

        }

        else{

            status.innerHTML =
                "❌ " +
                (
                    securityResult.message ||
                    "OTP security check failed."
                );

        }


        status.classList.remove(
            "success"
        );


        if(button){

            button.disabled =
                false;

            button.innerHTML =
                "Get Code";

        }


        return;

    }


    /* =================================================
       IP ALLOWED
    ================================================= */

    const otp =
        generateSignupOTP();


    const fullName =
        getSignupFullName();


    const currentYear =
        new Date()
        .getFullYear();


    const expiresAt =
        new Date(

            Date.now() +
            OTP_EXPIRY_MINUTES *
            60 *
            1000

        );


    /* =================================================
       EMAILJS TEMPLATE DATA
    ================================================= */

    const templateParams = {

        FULL_NAME:
            fullName,

        OTP_CODE:
            otp,

        OTP_EXPIRY:
            `${OTP_EXPIRY_MINUTES} minutes`,

        email:
            email,

        SUPPORT_URL:
            "https://yourwebsite.com/support",

        CURRENT_YEAR:
            currentYear

    };


    status.innerHTML =
        "Sending verification code...";


    /* =================================================
       EMAILJS SEND
    ================================================= */

    try{

        await emailjs.send(

            EMAILJS_SERVICE_ID,

            EMAILJS_TEMPLATE_ID,

            templateParams,

            EMAILJS_PUBLIC_KEY

        );


        /* =================================================
           SAVE OTP STATE ONLY AFTER EMAIL SUCCESS
        ================================================= */

        currentSignupOTP =
            otp;

        otpExpiresAt =
            expiresAt;

        otpSentEmail =
            email;

        verifiedSignupEmail =
            "";

        otpVerified =
            false;

        otpWrongAttempts =
            0;

        otpLockedUntil =
            null;


        clearOTPInputs();


        /* =================================================
           SUCCESS
        ================================================= */

        status.innerHTML =
            `✓ Verification code sent to ${email}`;

        status.classList.add(
            "success"
        );


        if(emailStatus){

            emailStatus.innerHTML =
                '<i class="fa-solid fa-circle-check"></i> Gmail is available and OTP sent';

            emailStatus.className =
                "email-available";

        }


        /* =================================================
           START 60 SECOND COOLDOWN
        ================================================= */

        startOTPCooldown();


        /* =================================================
           FOCUS FIRST OTP BOX
        ================================================= */

        const firstBox =
            document.querySelector(
                ".otp-digit"
            );


        if(firstBox){

            setTimeout(

                () =>
                    firstBox.focus(),

                200

            );

        }

    }

    catch(error){

        console.error(
            "SEND OTP ERROR:",
            error
        );


        let message =
            "Unable to send verification code.";


        if(
            error &&
            error.text
        ){

            message =
                error.text;

        }

        else if(
            error &&
            error.message
        ){

            message =
                error.message;

        }


        status.innerHTML =
            "❌ " +
            message;


        status.classList.remove(
            "success"
        );


        if(button){

            button.disabled =
                false;

            button.innerHTML =
                "Get Code";

        }

    }

}


/* =====================================================
   21. OTP INPUT
===================================================== */

function otpInput(
    input,
    index
){

    if(!input){

        return;

    }


    input.value =
        input.value.replace(
            /[^0-9]/g,
            ""
        );


    const boxes =
        document.querySelectorAll(
            ".otp-digit"
        );


    if(
        input.value.length === 1 &&
        boxes[index + 1]
    ){

        boxes[
            index + 1
        ].focus();

    }


    const enteredOTP =
        Array
        .from(boxes)
        .map(
            box =>
                box.value
        )
        .join("");


    if(
        enteredOTP.length ===
        OTP_LENGTH
    ){

        verifySignupOTP();

    }

}


/* =====================================================
   22. VERIFY OTP
===================================================== */

function verifySignupOTP(){

    const boxes =
        document.querySelectorAll(
            ".otp-digit"
        );


    const status =
        getOTPStatusElement();


    const emailInput =
        document.getElementById(
            "email"
        );


    if(
        !status ||
        !emailInput
    ){

        return false;

    }


    const email =
        emailInput.value
        .trim()
        .toLowerCase();


    const enteredOTP =
        Array
        .from(boxes)
        .map(
            box =>
                box.value
        )
        .join("");


    /* =================================================
       ALREADY VERIFIED
    ================================================= */

    if(
        otpVerified &&
        verifiedSignupEmail === email
    ){

        return true;

    }


    /* =================================================
       LOCK
    ================================================= */

    if(isOTPLocked()){

        status.innerHTML =
            "❌ Too many incorrect attempts. Please request a new code later.";

        status.classList.remove(
            "success"
        );

        return false;

    }


    /* =================================================
       NO OTP
    ================================================= */

    if(
        !currentSignupOTP ||
        !otpExpiresAt
    ){

        status.innerHTML =
            "❌ Please request a verification code first.";

        status.classList.remove(
            "success"
        );

        return false;

    }


    /* =================================================
       EMAIL MUST MATCH OTP EMAIL
    ================================================= */

    if(
        email !==
        otpSentEmail
    ){

        status.innerHTML =
            "❌ This OTP belongs to another Gmail address.";

        status.classList.remove(
            "success"
        );

        return false;

    }


    /* =================================================
       EMAIL AVAILABILITY
    ================================================= */

    if(
        typeof checkedEmail !==
        "undefined" &&
        checkedEmail !== email
    ){

        status.innerHTML =
            "❌ Please confirm this Gmail is available.";

        status.classList.remove(
            "success"
        );

        return false;

    }


    /* =================================================
       EXPIRY
    ================================================= */

    if(
        Date.now() >
        otpExpiresAt.getTime()
    ){

        currentSignupOTP =
            "";

        otpExpiresAt =
            null;

        otpSentEmail =
            "";

        verifiedSignupEmail =
            "";

        otpVerified =
            false;


        status.innerHTML =
            "❌ Verification code has expired. Please request a new code.";

        status.classList.remove(
            "success"
        );


        enableOTPInputs();


        return false;

    }


    /* =================================================
       OTP LENGTH
    ================================================= */

    if(
        enteredOTP.length !==
        OTP_LENGTH
    ){

        return false;

    }


    /* =================================================
       WRONG OTP
    ================================================= */

    if(
        enteredOTP !==
        currentSignupOTP
    ){

        otpWrongAttempts++;


        const remaining =
            OTP_MAX_ATTEMPTS -
            otpWrongAttempts;


        if(
            otpWrongAttempts >=
            OTP_MAX_ATTEMPTS
        ){

            lockOTP();


            status.innerHTML =
                "❌ Too many incorrect OTP attempts. Please try again later.";

            status.classList.remove(
                "success"
            );


            return false;

        }


        status.innerHTML =
            `❌ Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`;

        status.classList.remove(
            "success"
        );


        return false;

    }


    /* =================================================
       SUCCESS
    ================================================= */

    verifiedSignupEmail =
        email;

    otpVerified =
        true;


    otpWrongAttempts =
        0;


    status.innerHTML =
        "✓ Gmail verified successfully!";


    status.classList.add(
        "success"
    );


    disableOTPInputs();


    return true;

}


/* =====================================================
   23. IS EMAIL VERIFIED
===================================================== */

function isEmailVerified(){

    const emailInput =
        document.getElementById(
            "email"
        );


    if(!emailInput){

        return false;

    }


    const email =
        emailInput.value
        .trim()
        .toLowerCase();


    /* =================================================
       STATE CHECK
    ================================================= */

    if(
        !otpVerified ||
        !verifiedSignupEmail
    ){

        return false;

    }


    /* =================================================
       EMAIL MATCH
    ================================================= */

    if(
        email !==
        verifiedSignupEmail
    ){

        return false;

    }


    /* =================================================
       OTP SENT EMAIL MATCH
    ================================================= */

    if(
        email !==
        otpSentEmail
    ){

        return false;

    }


    /* =================================================
       EXPIRY
    ================================================= */

    if(
        !otpExpiresAt ||
        Date.now() >
        otpExpiresAt.getTime()
    ){

        otpVerified =
            false;

        verifiedSignupEmail =
            "";

        return false;

    }


    return true;

}


/* =====================================================
   24. HANDLE VERIFIED EMAIL CHANGE
===================================================== */

function handleVerifiedEmailChange(){

    const input =
        document.getElementById(
            "email"
        );


    if(!input){

        return;

    }


    const email =
        input.value
        .trim()
        .toLowerCase();


    /* =================================================
       ONLY RESET IF EMAIL REALLY CHANGED
    ================================================= */

    if(
        otpSentEmail &&
        email !== otpSentEmail
    ){

        otpVerified =
            false;

        verifiedSignupEmail =
            "";

        currentSignupOTP =
            "";

        otpExpiresAt =
            null;

        otpSentEmail =
            "";

        otpWrongAttempts =
            0;

        otpLockedUntil =
            null;


        clearOTPInputs();


        const boxes =
            document.querySelectorAll(
                ".otp-digit"
            );


        boxes.forEach(
            box => {

                box.disabled =
                    false;

            }
        );


        const status =
            getOTPStatusElement();


        if(status){

            status.innerHTML =
                "Gmail changed. Please verify the new Gmail.";

            status.classList.remove(
                "success"
            );

        }

    }

}


/* =====================================================
   25. GLOBAL ACCESS
===================================================== */

window.generateSignupOTP =
    generateSignupOTP;


window.sendSignupOTP =
    sendSignupOTP;


window.verifySignupOTP =
    verifySignupOTP;


window.isEmailVerified =
    isEmailVerified;


window.handleVerifiedEmailChange =
    handleVerifiedEmailChange;


window.otpInput =
    otpInput;


/*
   Keep compatibility with any existing page code
   that may call this function.
*/

window.checkMediaverseOTPRateLimit =
    checkMediaverseOTPRateLimit;


/* =====================================================
   26. READY
===================================================== */

console.log(
    "✓ MEDIAVERSE EmailJS OTP Engine loaded successfully."
);

console.log(
    "✓ Supabase OTP IP security bridge enabled."
);

console.log(
    "✓ OTP limit: 5 requests per IP."
);

console.log(
    "✓ OTP IP lock: 3 days."
);

console.log(
    "✓ OTP expiry: 5 minutes."
);

console.log(
    "✓ OTP resend cooldown: 60 seconds."
);

console.log(
    "✓ OTP wrong-attempt limit: 5."
);
