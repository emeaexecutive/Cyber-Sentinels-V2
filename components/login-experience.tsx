"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TurnstileField } from "@/components/turnstile-field";
import {
  classifyAuthFailure,
  getLoginTurnstileAction,
  maskEmailAddress,
  rateLimitedMessage,
  type LoginAuthMode,
  type LoginExperienceState,
} from "@/lib/auth/login-experience";
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RESET_GENERIC_MESSAGE,
  validateNewPassword,
  isPasswordRecoverySession,
  PASSWORD_RECOVERY_PATH,
} from "@/lib/auth/password-recovery";
import { resolveSafeInternalRedirect } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/client";
import { shouldUsePreviewTurnstileFallback } from "@/components/turnstile-field";
import type { PublicLocale } from "@/lib/i18n/public-locales";
import { localizedPublicHref } from "@/lib/i18n/public-locales";

const loginCopy = {
  en: {
    connectionFailure: "We couldn't connect. Please try again shortly.",
    securityFailure: "We couldn't complete the security check. Please try again.",
    sessionExpired: "Session expired for security. Please sign in again.",
    verificationMissing: "The verification link was missing a setup code. Please request a new sign-in link.",
    verificationFailed: "We could not complete email verification. Please request a new link or sign in with your password.",
    passwordUpdated: "Password updated successfully. Sign in with your new password.",
    resetLinkExpired: "Reset link expired or invalid. Request a new password reset email.",
    emailRequired: "Please enter your email address.",
    passwordRequired: "Please enter your password.",
    passwordTooShort: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
    passwordMismatch: "Passwords do not match.",
    signInFailed: "We couldn't sign you in. Please try again.",
    createAccountFailed: "We couldn't create your account. Please try again.",
    resendFailed: "We couldn't resend the email. Please try again.",
    magicLinkFailed: "We couldn't send the sign-in link. Please try again.",
    resetFailed: "We couldn't send the reset email. Please try again.",
    tooManyReset: "Too many reset emails have been requested. Please wait and try again.",
    emailForAccount: "Please enter the email address you used to create your account.",
    emailSentAgain: "Email sent again.",
    magicLinkSent: "Check your email for your sign-in link.",
    resetSent: PASSWORD_RESET_GENERIC_MESSAGE,
    descriptor: "Operational Trust Control Plane",
    checkEmail: "Check your email",
    verificationSent: "We've sent a verification link to:",
    sending: "Sending...",
    resendEmail: "Resend email",
    alreadyVerified: "Already verified?",
    continueSignIn: "Continue to sign in",
    createAccountTitle: "Create your Cyber Sentinels account",
    resetTitle: "Reset your password",
    signInTitle: "Sign in",
    createAccountDescription: "Set up your workspace access.",
    resetDescription: "We'll email you instructions to choose a new password.",
    signInDescription: "Access your Cyber Sentinels workspace.",
    workEmail: "Work email",
    email: "Email",
    emailPlaceholder: "name@company.com",
    password: "Password",
    confirmPassword: "Confirm password",
    hidePassword: "Hide password",
    showPassword: "Show password",
    hide: "Hide",
    show: "Show",
    hideConfirmationPassword: "Hide confirmation password",
    showConfirmationPassword: "Show confirmation password",
    securityCheckFailed: "We couldn't complete the security check. Please try again.",
    signingIn: "Signing in...",
    signIn: "Sign in",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    or: "or",
    useMagicLink: "Use magic link",
    newToCyberSentinels: "New to Cyber Sentinels?",
    createAccount: "Create account",
    creating: "Creating...",
    alreadyHaveAccount: "Already have an account? Sign in",
    sendResetLink: "Send reset link",
    backToSignIn: "Back to sign in",
    localDevelopmentOnly: "Local development only",
    continueAsDevTester: "Continue as Dev Tester",
    rateLimited: rateLimitedMessage,
    invalidCredentials: "Email or password is incorrect.",
    verifyEmail: "Please verify your email to continue.",
    accountExists: "An account already exists for this email. Sign in or reset your password.",
  },
  es: {
    connectionFailure: "No pudimos conectar. Inténtalo de nuevo en breve.",
    securityFailure: "No se pudo completar la comprobación de seguridad. Inténtalo de nuevo.",
    sessionExpired: "La sesión ha caducado por seguridad. Inicia sesión de nuevo.",
    verificationMissing: "Falta el código de configuración en el enlace de verificación. Solicita un nuevo enlace de inicio de sesión.",
    verificationFailed: "No se pudo verificar el correo electrónico. Solicita un enlace nuevo o inicia sesión con tu contraseña.",
    passwordUpdated: "La contraseña se actualizó correctamente. Inicia sesión con la nueva contraseña.",
    resetLinkExpired: "El enlace para restablecer la contraseña ha caducado o no es válido. Solicita otro.",
    emailRequired: "Introduce tu correo electrónico.",
    passwordRequired: "Introduce tu contraseña.",
    passwordTooShort: `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    passwordMismatch: "Las contraseñas no coinciden.",
    signInFailed: "No se pudo iniciar sesión. Inténtalo de nuevo.",
    createAccountFailed: "No se pudo crear la cuenta. Inténtalo de nuevo.",
    resendFailed: "No se pudo volver a enviar el correo. Inténtalo de nuevo.",
    magicLinkFailed: "No se pudo enviar el enlace de inicio de sesión. Inténtalo de nuevo.",
    resetFailed: "No se pudo enviar el correo para restablecer la contraseña. Inténtalo de nuevo.",
    tooManyReset: "Se han solicitado demasiados correos para restablecer la contraseña. Espera e inténtalo de nuevo.",
    emailForAccount: "Introduce el correo electrónico que usaste para crear la cuenta.",
    emailSentAgain: "Correo enviado de nuevo.",
    magicLinkSent: "Revisa tu correo electrónico para encontrar el enlace de inicio de sesión.",
    resetSent: "Si existe una cuenta con ese correo, hemos enviado instrucciones para restablecer la contraseña.",
    descriptor: "Plano de control de confianza operativa",
    checkEmail: "Revisa tu correo electrónico",
    verificationSent: "Hemos enviado un enlace de verificación a:",
    sending: "Enviando...",
    resendEmail: "Volver a enviar el correo",
    alreadyVerified: "¿Ya verificaste tu correo?",
    continueSignIn: "Continuar al inicio de sesión",
    createAccountTitle: "Crear tu cuenta de Cyber Sentinels",
    resetTitle: "Restablecer tu contraseña",
    signInTitle: "Iniciar sesión",
    createAccountDescription: "Configura el acceso a tu espacio de trabajo.",
    resetDescription: "Te enviaremos instrucciones para elegir una contraseña nueva.",
    signInDescription: "Accede a tu espacio de trabajo de Cyber Sentinels.",
    workEmail: "Correo electrónico de trabajo",
    email: "Correo electrónico",
    emailPlaceholder: "nombre@empresa.com",
    password: "Contraseña",
    confirmPassword: "Confirmar contraseña",
    hidePassword: "Ocultar contraseña",
    showPassword: "Mostrar contraseña",
    hide: "Ocultar",
    show: "Mostrar",
    hideConfirmationPassword: "Ocultar confirmación de contraseña",
    showConfirmationPassword: "Mostrar confirmación de contraseña",
    securityCheckFailed: "No se pudo completar la comprobación de seguridad. Inténtalo de nuevo.",
    signingIn: "Iniciando sesión...",
    signIn: "Iniciar sesión",
    rememberMe: "Recordarme",
    forgotPassword: "¿Olvidaste la contraseña?",
    or: "o",
    useMagicLink: "Usar enlace de acceso",
    newToCyberSentinels: "¿Es tu primera vez en Cyber Sentinels?",
    createAccount: "Crear cuenta",
    creating: "Creando...",
    alreadyHaveAccount: "¿Ya tienes una cuenta? Inicia sesión",
    sendResetLink: "Enviar enlace para restablecer",
    backToSignIn: "Volver al inicio de sesión",
    localDevelopmentOnly: "Solo para desarrollo local",
    continueAsDevTester: "Continuar como usuario de pruebas",
    rateLimited: "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
    invalidCredentials: "El correo electrónico o la contraseña no son correctos.",
    verifyEmail: "Verifica tu correo electrónico para continuar.",
    accountExists: "Ya existe una cuenta con este correo. Inicia sesión o restablece la contraseña.",
  },
} satisfies Record<PublicLocale, Record<string, string>>;

function localizeAuthFailure(message: string, locale: PublicLocale, copy: (typeof loginCopy)[PublicLocale]) {
  if (locale !== "es") return message;
  const translations: Record<string, string> = {
    [rateLimitedMessage]: copy.rateLimited,
    "Email or password is incorrect.": copy.invalidCredentials,
    "Please verify your email to continue.": copy.verifyEmail,
    "An account already exists for this email. Sign in or reset your password.": copy.accountExists,
  };
  return translations[message] ?? message;
}

const SESSION_START_KEY = "cyber_sentinels_session_started_at";
const REMEMBER_SESSION_KEY = "cyber_sentinels_remember_session";
const authTimeoutMs = 8000;
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function shouldRequireTurnstile() {
  return process.env.NODE_ENV === "production" && !shouldUsePreviewTurnstileFallback();
}
const authAttemptWindowMs = 60_000;
const authAttemptLimit = 8;

async function withAuthTimeout<T>(task: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Supabase auth timed out after ${authTimeoutMs / 1000} seconds.`)),
          authTimeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function recordAuthEvent(
  eventType: string,
  nextPath: string,
  rememberSession: boolean,
  context: Record<string, unknown> = {}
) {
  try {
    await fetch("/api/auth/replay-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: eventType,
        decision: "allow",
        context: {
          next_path: nextPath,
          remember_session: rememberSession,
          ...context,
        },
      }),
    });
  } catch (error) {
    console.warn("Auth replay event could not be recorded.", error);
  }
}

export default function LoginExperience({ locale }: { locale: PublicLocale }) {
  const copy = loginCopy[locale];
  const router = useRouter();
  const navigationVersion = useRef(0);
  const [authMode, setAuthMode] = useState<LoginAuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [message, setMessage] = useState("");
  const [experienceState, setExperienceState] = useState<LoginExperienceState>("SIGNED_OUT");
  const [signupSucceeded, setSignupSucceeded] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [nextPath, setNextPath] = useState("/operational-entities");
  const [loadingAction, setLoadingAction] = useState<
    "password" | "create-account" | "magic-link" | "reset" | null
  >(null);
  const [showDevAuth, setShowDevAuth] = useState(false);
  const trimmedEmail = email.trim();
  const turnstileAction = getLoginTurnstileAction(authMode);
  const passwordsMismatch =
    authMode === "create-account" && Boolean(confirmPassword) && password !== confirmPassword;
  const canCreateAccount =
    Boolean(trimmedEmail) &&
    password.length >= PASSWORD_MIN_LENGTH &&
    Boolean(confirmPassword) &&
    password === confirmPassword &&
    loadingAction === null;
  const canSendEmailOnlyAction = Boolean(trimmedEmail) && loadingAction === null;
  const maskedEmail = maskEmailAddress(trimmedEmail);

  const getSupabaseClient = useCallback(() => {
    try { return createClient(); }
    catch {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage(copy.connectionFailure);
      return null;
    }
  }, [copy]);

  useEffect(() => () => { navigationVersion.current += 1; }, []);

  function switchAuthMode(mode: LoginAuthMode) {
    navigationVersion.current += 1;
    setLoadingAction(null);
    setAuthMode(mode);
    setMessage("");
    setExperienceState("SIGNED_OUT");
    setSignupSucceeded(false);
    setPassword("");
    setConfirmPassword("");
    setTurnstileToken("");
    setTurnstileResetKey((current) => current + 1);
  }

  function showAuthFailure(error: unknown, fallback: string) {
    const code = (error as { code?: string } | null)?.code;
    if (code && ["invalid_token", "missing_token", "action_mismatch", "hostname_mismatch", "provider_error", "provider_unavailable", "turnstile_not_configured", "turnstile_configuration_invalid", "security_transport_error"].includes(code)) {
      showSecurityFailure(); return;
    }
    const failure = classifyAuthFailure(error, fallback);
    setExperienceState(failure.state);
    setMessage(localizeAuthFailure(failure.message, locale, copy));
  }

  function showSecurityFailure(message = copy.securityFailure) {
    setExperienceState("SECURITY_VERIFICATION_FAILED");
    setMessage(message);
  }

  function handleTurnstileToken(token: string) {
    setTurnstileToken(token);
    // Empty callbacks also occur during initialization/reset; only a fresh token
    // clears a security failure, and other authentication messages remain intact.
    if (token && experienceState === "SECURITY_VERIFICATION_FAILED") {
      setMessage("");
      setExperienceState(signupSucceeded ? "EMAIL_VERIFICATION_REQUIRED" : "SIGNED_OUT");
    }
  }

  useEffect(() => {
    setShowDevAuth(
      process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true" &&
        window.location.hostname === "localhost"
    );

    const searchParams = new URLSearchParams(window.location.search);
    const resolvedNextPath = resolveSafeInternalRedirect(
      searchParams.get("next"),
      window.location.origin,
    );

    const restoresSession =
      window.localStorage.getItem(REMEMBER_SESSION_KEY) !== "false";
    setNextPath(resolvedNextPath);
    setRememberSession(restoresSession);

    if (searchParams.get("expired") === "1") {
      window.localStorage.removeItem(SESSION_START_KEY);
      setMessage(copy.sessionExpired);
      setExperienceState("SIGNED_OUT");
      return;
    }

    if (searchParams.get("error") === "missing_verification_code") {
      setMessage(copy.verificationMissing);
    }

    if (searchParams.get("error") === "verification_failed") {
      setMessage(copy.verificationFailed);
    }

    if (searchParams.get("mode") === "forgot-password" || searchParams.get("error") === "recovery_link_invalid") {
      setAuthMode("forgot-password");
      setTurnstileToken("");
      setTurnstileResetKey((current) => current + 1);
    }

    if (searchParams.get("password_updated") === "1") {
      setMessage(copy.passwordUpdated);
    }

    if (searchParams.get("error") === "recovery_link_invalid") {
      setMessage(copy.resetLinkExpired);
    }

    // Recovery/error/completion screens own navigation even with an old session.
    if (searchParams.get("mode") === "forgot-password" || searchParams.has("error")
      || searchParams.get("password_updated") === "1") {
      setExperienceState("SIGNED_OUT");
      return;
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      return;
    }

    let active = true;
    const version = ++navigationVersion.current;
    const current = () => active && version === navigationVersion.current;

    withAuthTimeout(supabase.auth.getUser())
      .then(async ({ data }) => {
        if (!current()) return;

        if (data.user) {
          const verified = await supabase.auth.getClaims();
          if (!current()) return;
          if (!verified.error && isPasswordRecoverySession(verified.data?.claims)) {
            setExperienceState("SIGNED_OUT");
            if (searchParams.get("mode") !== "forgot-password" && searchParams.get("error") !== "recovery_link_invalid") {
              window.location.replace(PASSWORD_RECOVERY_PATH);
            }
            return;
          }
          setExperienceState("AUTHENTICATED");
          window.localStorage.setItem(SESSION_START_KEY, Date.now().toString());
          await recordAuthEvent(
            "session_restoration",
            resolvedNextPath,
            restoresSession,
            { restored_to: resolvedNextPath }
          );
          if (current()) window.location.replace(resolvedNextPath);
          return;
        }

        setExperienceState("SIGNED_OUT");
      })
      .catch((error) => {
        console.error("Supabase session restoration failed.", error);
        if (current()) setExperienceState("SIGNED_OUT");
      });

    return () => {
      active = false;
    };
  }, [copy, getSupabaseClient, router]);


  function allowAuthAttempt(action: string) {
    if (shouldRequireTurnstile() && !turnstileSiteKey) {
      showSecurityFailure();
      return false;
    }
    if (turnstileSiteKey && !turnstileToken) {
      showSecurityFailure();
      return false;
    }

    const now = Date.now();
    const key = `cyber_sentinels_auth_attempts_${action}`;
    const stored = window.localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) as { count?: number; resetAt?: number } : null;

    if (!parsed || !parsed.resetAt || parsed.resetAt < now) {
      window.localStorage.setItem(key, JSON.stringify({ count: 1, resetAt: now + authAttemptWindowMs }));
      return true;
    }

    const count = Number(parsed.count ?? 0) + 1;
    window.localStorage.setItem(key, JSON.stringify({ count, resetAt: parsed.resetAt }));

    if (count > authAttemptLimit) {
      setExperienceState("RATE_LIMITED");
      setMessage(rateLimitedMessage);
      return false;
    }

    return true;
  }

  async function performProtectedAuth(operation: "password" | "signup" | "resend" | "magic-link") {
    try {
      const response = await fetch("/api/auth/submit", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ operation, email: email.trim(), password: operation === "password" || operation === "signup" ? password : undefined, turnstileToken }),
      });
      const result = await response.json();
      if (result.data?.session) {
        const client = getSupabaseClient();
        if (!client) throw new Error("Authentication unavailable");
        const restored = await client.auth.setSession(result.data.session);
        if (restored.error) return { data: {}, error: restored.error };
      }
      return { data: result.data ?? {}, error: result.error ?? (!response.ok ? { code: response.status === 429 ? "over_request_rate_limit" : "invalid_token", message: "Authentication failed." } : null) };
    } catch { return { data: {}, error: { code: "security_transport_error", message: "Security verification could not complete." } }; }
    finally { setTurnstileToken(""); setTurnstileResetKey(value => value + 1); }
  }

  async function signInWithPassword() {
    const version = ++navigationVersion.current;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage(copy.emailRequired);
      return;
    }

    if (!password) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage(copy.passwordRequired);
      return;
    }

    if (!allowAuthAttempt("password")) return;

    setMessage("");
    setExperienceState("SIGNING_IN");
    setLoadingAction("password");


    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    try {
      const { error } = await withAuthTimeout(
        performProtectedAuth("password")
      );
      if (version !== navigationVersion.current) return;

      if (error) {
        showAuthFailure(error, copy.signInFailed);
        return;
      }

      window.localStorage.setItem(SESSION_START_KEY, Date.now().toString());
      window.localStorage.setItem(REMEMBER_SESSION_KEY, rememberSession ? "true" : "false");
      await recordAuthEvent("login", nextPath, rememberSession, {
        method: "password",
      });
      if (version !== navigationVersion.current) return;
      setExperienceState("AUTHENTICATED");
      // Refresh the server-rendered shell after changing authentication.
      window.location.replace(nextPath);
    } catch (error) {
      if (version !== navigationVersion.current) return;
      console.error("Supabase password sign-in failed.", error);
      showAuthFailure(error, copy.signInFailed);
    } finally {
      if (version === navigationVersion.current) setLoadingAction(null);
    }
  }

  async function createAccountWithPassword() {
    const version = ++navigationVersion.current;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage(copy.emailRequired);
      return;
    }

    const passwordPolicyError = validateNewPassword(password);
    if (passwordPolicyError) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage(locale === "es" ? copy.passwordTooShort : passwordPolicyError);
      return;
    }

    if (password !== confirmPassword) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage(copy.passwordMismatch);
      return;
    }

    if (!allowAuthAttempt("create-account")) return;

    setMessage("");
    setExperienceState("SIGNING_IN");
    setLoadingAction("create-account");


    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    try {
      const { data, error } = await withAuthTimeout(
        performProtectedAuth("signup")
      );
      if (version !== navigationVersion.current) return;

      if (error) {
        showAuthFailure(error, copy.createAccountFailed);
        return;
      }

      if (data.session?.user) {
        window.localStorage.setItem(SESSION_START_KEY, Date.now().toString());
        await recordAuthEvent("signup_session_created", nextPath, true, {
          authenticated_to: nextPath,
        });
        if (version !== navigationVersion.current) return;
        setExperienceState("AUTHENTICATED");
        window.location.replace(nextPath);
        return;
      }

      setSignupSucceeded(true);
      setExperienceState("EMAIL_VERIFICATION_REQUIRED");
      setMessage("");
    } catch (error) {
      if (version !== navigationVersion.current) return;
      console.error("Supabase account creation failed.", error);
      showAuthFailure(error, copy.createAccountFailed);
    } finally {
      if (version === navigationVersion.current) setLoadingAction(null);
    }
  }

  async function resendVerificationEmail() {
    const version = ++navigationVersion.current;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMessage(copy.emailForAccount);
      return;
    }

    if (!allowAuthAttempt("create-account")) return;

    setMessage("");
    setExperienceState("SIGNING_IN");
    setLoadingAction("create-account");


    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    try {
      const { error } = await withAuthTimeout(
        performProtectedAuth("resend")
      );
      if (version !== navigationVersion.current) return;

      if (error) {
        showAuthFailure(error, copy.resendFailed);
        return;
      }

      setExperienceState("EMAIL_VERIFICATION_REQUIRED");
      setMessage(copy.emailSentAgain);
    } catch (error) {
      if (version !== navigationVersion.current) return;
      console.error("Supabase verification resend failed.", error);
      showAuthFailure(error, copy.resendFailed);
    } finally {
      if (version === navigationVersion.current) setLoadingAction(null);
    }
  }

  async function signInWithMagicLink() {
    const version = ++navigationVersion.current;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage(copy.emailRequired);
      return;
    }

    if (!allowAuthAttempt("magic-link")) return;

    setMessage("");
    setExperienceState("SIGNING_IN");
    setLoadingAction("magic-link");


    const supabase = getSupabaseClient();

    if (!supabase) {
      setLoadingAction(null);
      return;
    }

    try {
      const { error } = await withAuthTimeout(
        performProtectedAuth("magic-link")
      );
      if (version !== navigationVersion.current) return;

      if (error) {
        showAuthFailure(error, copy.magicLinkFailed);
        return;
      }

      setExperienceState("SIGNED_OUT");
      setMessage(copy.magicLinkSent);
    } catch (error) {
      if (version !== navigationVersion.current) return;
      console.error("Supabase magic-link sign-in failed.", error);
      showAuthFailure(error, copy.magicLinkFailed);
    } finally {
      if (version === navigationVersion.current) setLoadingAction(null);
    }
  }

  async function sendPasswordResetEmail() {
    const version = ++navigationVersion.current;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage(copy.emailRequired);
      return;
    }

    if (!allowAuthAttempt("reset")) return;

    setMessage("");
    setExperienceState("SIGNING_IN");
    setLoadingAction("reset");

    try {
      const correlationId = crypto.randomUUID();
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-correlation-id": correlationId,
        },
        body: JSON.stringify({ email: trimmedEmail, turnstileToken }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        error?: string;
        message?: string;
      };
      if (version !== navigationVersion.current) return;
      setTurnstileToken("");
      setTurnstileResetKey((value) => value + 1);

      if (!response.ok || !result.ok) {
        if (response.status === 429) {
          setExperienceState("RATE_LIMITED");
          setMessage(copy.tooManyReset);
        } else if (result.code?.startsWith("TURNSTILE")) {
          showSecurityFailure();
        } else {
          setExperienceState("AUTHENTICATION_FAILED");
          setMessage(copy.resetFailed);
        }
        return;
      }

      setExperienceState("SIGNED_OUT");
      setMessage(locale === "es" ? copy.resetSent : result.message || copy.resetSent);
    } catch {
      if (version !== navigationVersion.current) return;
      setTurnstileToken("");
      setTurnstileResetKey((value) => value + 1);
      setExperienceState("AUTHENTICATION_FAILED");
      setMessage(copy.resetFailed);
    } finally {
      if (version === navigationVersion.current) setLoadingAction(null);
    }
  }

  const actionDisabled = loadingAction !== null;
  const securityPending = Boolean(turnstileSiteKey && !turnstileToken);
  const submitDisabled = actionDisabled || securityPending;
  const messageIsError = [
    "AUTHENTICATION_FAILED",
    "SECURITY_VERIFICATION_FAILED",
    "RATE_LIMITED",
  ].includes(experienceState);

  return (
    <main lang={locale} className="flex min-h-screen items-center justify-center bg-[#04070c] px-5 py-12 text-white sm:px-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-800 bg-black p-6 shadow-2xl shadow-black/40 sm:p-8">
        <Link href={localizedPublicHref("/", locale)} lang={locale} className="text-xs font-semibold tracking-[0.22em] text-cyan-200">
          CYBER SENTINELS
        </Link>
        <p className="mt-2 text-xs leading-5 text-zinc-500">{copy.descriptor}</p>

        {signupSucceeded ? (
          <div className="mt-8" role="status" aria-live="polite">
            <h1 className="text-3xl font-semibold tracking-tight">{copy.checkEmail}</h1>
            <p className="mt-4 text-sm leading-6 text-zinc-400">
              {copy.verificationSent}
            </p>
            <p className="mt-1 font-medium text-zinc-100">{maskedEmail}</p>
            {turnstileSiteKey ? (
              <div className="mt-5">
                <TurnstileField
                  siteKey={turnstileSiteKey}
                  action={turnstileAction}
                  locale={locale}
                  onTokenChange={handleTurnstileToken}
                  onErrorChange={(error) => {
                    if (error) showSecurityFailure(error);
                  }}
                  resetKey={turnstileResetKey}
                  quiet
                />
              </div>
            ) : null}
            <button
              onClick={resendVerificationEmail}
              disabled={submitDisabled || !trimmedEmail}
              className="brand-secondary-action mt-7 w-full p-4 disabled:opacity-50"
              type="button"
            >
              {loadingAction === "create-account" ? copy.sending : copy.resendEmail}
            </button>
            <p className="mt-6 text-center text-sm text-zinc-400">{copy.alreadyVerified}</p>
            <button
              onClick={() => switchAuthMode("sign-in")}
              disabled={actionDisabled}
              className="mt-2 w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-white hover:border-zinc-500 disabled:opacity-50"
              type="button"
            >
              {copy.continueSignIn}
            </button>
            {message ? <p className="mt-4 text-sm text-zinc-300">{message}</p> : null}
          </div>
        ) : (
          <div className="mt-8">
            <h1 className="text-3xl font-semibold tracking-tight">
              {authMode === "create-account"
                ? copy.createAccountTitle
                : authMode === "forgot-password"
                  ? copy.resetTitle
                  : copy.signInTitle}
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {authMode === "create-account"
                ? copy.createAccountDescription
                : authMode === "forgot-password"
                  ? copy.resetDescription
                  : copy.signInDescription}
            </p>

            <div className="mt-7 grid gap-5">
              <label className="grid gap-2 text-sm font-medium text-zinc-200">
                {authMode === "create-account" ? copy.workEmail : copy.email}
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder={copy.emailPlaceholder}
                  autoComplete="email"
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-white outline-none focus:border-cyan-700"
                />
              </label>

              {authMode === "sign-in" || authMode === "create-account" ? (
                <label className="grid gap-2 text-sm font-medium text-zinc-200">
                  {copy.password}
                  <span className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 focus-within:border-cyan-700">
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder={copy.password}
                      autoComplete={authMode === "create-account" ? "new-password" : "current-password"}
                      className="min-w-0 flex-1 bg-transparent p-4 text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="px-4 text-xs font-semibold text-zinc-400 hover:text-white"
                      aria-label={showPassword ? copy.hidePassword : copy.showPassword}
                    >
                      {showPassword ? copy.hide : copy.show}
                    </button>
                  </span>
                </label>
              ) : null}

              {authMode === "create-account" ? (
                <label className="grid gap-2 text-sm font-medium text-zinc-200">
                  {copy.confirmPassword}
                  <span className="flex overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 focus-within:border-cyan-700">
                    <input
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={copy.confirmPassword}
                      autoComplete="new-password"
                      className="min-w-0 flex-1 bg-transparent p-4 text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="px-4 text-xs font-semibold text-zinc-400 hover:text-white"
                      aria-label={showConfirmPassword ? copy.hideConfirmationPassword : copy.showConfirmationPassword}
                    >
                      {showConfirmPassword ? copy.hide : copy.show}
                    </button>
                  </span>
                  {passwordsMismatch ? <span className="text-sm text-red-300">{copy.passwordMismatch}</span> : null}
                </label>
              ) : null}

              {turnstileSiteKey ? (
                <TurnstileField
                  siteKey={turnstileSiteKey}
                  locale={locale}
                  onTokenChange={handleTurnstileToken}
                  action={turnstileAction}
                  onErrorChange={(error) => {
                    if (error) showSecurityFailure(error);
                  }}
                  resetKey={turnstileResetKey}
                  quiet
                />
              ) : shouldRequireTurnstile() ? (
                <p className="rounded-xl border border-red-900 bg-red-950/20 p-3 text-sm text-red-200" role="alert">
                  {copy.securityCheckFailed}
                </p>
              ) : null}

              {authMode === "sign-in" ? (
                <>
                  <button
                    onClick={signInWithPassword}
                    disabled={submitDisabled}
                    className="brand-primary-action w-full p-4 disabled:opacity-50"
                    type="button"
                  >
                    {loadingAction === "password" ? copy.signingIn : copy.signIn}
                  </button>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <label className="flex items-center gap-2 text-zinc-300">
                      <input
                        checked={rememberSession}
                        onChange={(event) => setRememberSession(event.target.checked)}
                        type="checkbox"
                      />
                      {copy.rememberMe}
                    </label>
                    <button
                      onClick={() => switchAuthMode("forgot-password")}
                      className="text-zinc-300 underline-offset-4 hover:text-white hover:underline"
                      type="button"
                    >
                      {copy.forgotPassword}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-600" aria-hidden="true">
                    <span className="h-px flex-1 bg-zinc-800" />
                    {copy.or}
                    <span className="h-px flex-1 bg-zinc-800" />
                  </div>
                  <button
                    onClick={signInWithMagicLink}
                    disabled={submitDisabled || !canSendEmailOnlyAction}
                    className="w-full rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-white hover:border-zinc-500 disabled:opacity-50"
                    type="button"
                  >
                    {loadingAction === "magic-link" ? copy.sending : copy.useMagicLink}
                  </button>
                  <p className="text-center text-sm text-zinc-400">
                    {copy.newToCyberSentinels}{" "}
                    <button
                      onClick={() => switchAuthMode("create-account")}
                      className="font-semibold text-white underline-offset-4 hover:underline"
                      type="button"
                    >
                      {copy.createAccount}
                    </button>
                  </p>
                </>
              ) : null}

              {authMode === "create-account" ? (
                <>
                  <button
                    onClick={createAccountWithPassword}
                    disabled={submitDisabled || !canCreateAccount}
                    className="brand-primary-action w-full p-4 disabled:opacity-50"
                    type="button"
                  >
                    {loadingAction === "create-account" ? copy.creating : copy.createAccount}
                  </button>
                  <button
                    onClick={() => switchAuthMode("sign-in")}
                    className="text-sm text-zinc-300 underline-offset-4 hover:text-white hover:underline"
                    type="button"
                  >
                    {copy.alreadyHaveAccount}
                  </button>
                </>
              ) : null}

              {authMode === "forgot-password" ? (
                <>
                  <button
                    onClick={sendPasswordResetEmail}
                    disabled={submitDisabled || !canSendEmailOnlyAction}
                    className="brand-primary-action w-full p-4 disabled:opacity-50"
                    type="button"
                  >
                    {loadingAction === "reset" ? copy.sending : copy.sendResetLink}
                  </button>
                  <button
                    onClick={() => switchAuthMode("sign-in")}
                    className="text-sm text-zinc-300 underline-offset-4 hover:text-white hover:underline"
                    type="button"
                  >
                    {copy.backToSignIn}
                  </button>
                </>
              ) : null}

              {message ? (
                <p
                  role={messageIsError ? "alert" : "status"}
                  aria-live="polite"
                  className={messageIsError ? "text-sm text-red-300" : "text-sm text-zinc-300"}
                >
                  {message}
                </p>
              ) : null}

              {showDevAuth ? (
                <div className="grid gap-2 border-t border-zinc-800 pt-5">
                  <p className="text-xs text-yellow-300">{copy.localDevelopmentOnly}</p>
                  <button
                    onClick={() => router.push("/passport?dev=true")}
                    type="button"
                    className="rounded-xl border border-yellow-500/40 p-3 text-sm font-semibold text-yellow-200"
                  >
                    {copy.continueAsDevTester}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
