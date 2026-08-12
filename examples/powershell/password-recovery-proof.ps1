#Requires -Version 5.1

[CmdletBinding()]
param(
    [switch]$AllowInsecureLocalhost
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$script:RequiredGenericMessage = "If an account exists for that email, we've sent password reset instructions."
$script:PublicPreviewTurnstileTestResponse = "XXXX.DUMMY.TOKEN.XXXX"
$script:SafeOutput = New-Object System.Collections.Generic.List[string]

function New-ProofException {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [string]$Code = "PROOF_FAILED",
        [int]$Status = 0
    )

    $exception = New-Object System.Exception($Message)
    $exception.Data["ProofCode"] = $Code
    $exception.Data["Status"] = $Status
    return $exception
}

function Write-SafeProofLine {
    param([Parameter(Mandatory = $true)][string]$Line)
    $script:SafeOutput.Add($Line)
    [Console]::Out.WriteLine($Line)
}

function Assert-OutputContainsNoSensitiveValue {
    param([string[]]$SensitiveValues)

    $rendered = $script:SafeOutput -join "`n"
    foreach ($value in $SensitiveValues) {
        if (-not [string]::IsNullOrWhiteSpace($value) -and
            $rendered.IndexOf($value, [StringComparison]::Ordinal) -ge 0) {
            throw (New-ProofException "A sensitive value reached proof output." "OUTPUT_SAFETY_FAILED")
        }
    }
}

function Test-VercelAuthenticationResponse {
    param(
        [Parameter(Mandatory = $true)][int]$Status,
        [string]$Location = "",
        [string]$ContentType = "",
        [string]$Body = ""
    )

    $redirectedToSso = $Status -ge 300 -and $Status -lt 400 -and (
        $Location -match "(?i)vercel\.com/sso-api" -or
        $Location -match "(?i)_vercel_sso_nonce" -or
        $Location -match "(?i)vercel authentication"
    )
    $vercelHtml = $ContentType -match "(?i)text/html" -and
        $Body -match "(?i)(Vercel Authentication|Log in to Vercel|sso-api)"
    return $redirectedToSso -or $vercelHtml
}

function Get-ResponseHeader {
    param(
        [Parameter(Mandatory = $true)][System.Net.Http.HttpResponseMessage]$Response,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $values = $null
    if ($Response.Headers.TryGetValues($Name, [ref]$values)) { return ($values -join ",") }
    if ($Response.Content.Headers.TryGetValues($Name, [ref]$values)) { return ($values -join ",") }
    return ""
}

function New-ProofHttpClient {
    param([string]$VercelAutomationBypassSecret = "")

    Add-Type -AssemblyName System.Net.Http
    $handler = New-Object System.Net.Http.HttpClientHandler
    $handler.AllowAutoRedirect = $false
    $handler.UseCookies = $true
    $client = New-Object System.Net.Http.HttpClient($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(60)
    $client.DefaultRequestHeaders.UserAgent.ParseAdd("Cyber-Sentinels-Password-Recovery-Proof/1.0")
    if ($VercelAutomationBypassSecret) {
        [void]$client.DefaultRequestHeaders.TryAddWithoutValidation(
            "x-vercel-protection-bypass",
            $VercelAutomationBypassSecret
        )
    }
    return $client
}

function Invoke-ProofHttpRequest {
    param(
        [Parameter(Mandatory = $true)][System.Net.Http.HttpClient]$Client,
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][Uri]$Uri,
        [Parameter(Mandatory = $true)][string]$Origin,
        [AllowNull()][object]$Body = $null,
        [Parameter(Mandatory = $true)][bool]$BypassWasProvided
    )

    $httpMethod = New-Object System.Net.Http.HttpMethod($Method)
    $request = New-Object System.Net.Http.HttpRequestMessage($httpMethod, $Uri)
    try {
        $request.Headers.Accept.ParseAdd("application/json")
        [void]$request.Headers.TryAddWithoutValidation("Origin", $Origin)
        [void]$request.Headers.TryAddWithoutValidation("x-correlation-id", ([Guid]::NewGuid().ToString("N")))
        if ($null -ne $Body) {
            $json = ConvertTo-Json -InputObject $Body -Depth 8 -Compress
            $request.Content = New-Object System.Net.Http.StringContent(
                $json,
                [Text.Encoding]::UTF8,
                "application/json"
            )
        }

        $response = $Client.SendAsync($request).GetAwaiter().GetResult()
        try {
            $responseBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            $status = [int]$response.StatusCode
            $location = Get-ResponseHeader $response "location"
            $contentType = Get-ResponseHeader $response "content-type"
            if (Test-VercelAuthenticationResponse $status $location $contentType $responseBody) {
                $reason = if ($BypassWasProvided) {
                    "Vercel Authentication/SSO rejected the supplied automation bypass."
                }
                else {
                    "Vercel Authentication/SSO is enabled and VERCEL_AUTOMATION_BYPASS_SECRET is required."
                }
                throw (New-ProofException $reason "VERCEL_AUTHENTICATION_BLOCKED" $status)
            }

            $jsonBody = $null
            if ($responseBody -and $contentType -match "(?i)application/json") {
                try { $jsonBody = $responseBody | ConvertFrom-Json }
                catch { throw (New-ProofException "Cyber Sentinels returned malformed JSON." "INVALID_JSON" $status) }
            }
            return [pscustomobject]@{
                Status = $status
                Json = $jsonBody
                CorrelationId = Get-ResponseHeader $response "x-correlation-id"
                ContentType = $contentType
            }
        }
        finally {
            $response.Dispose()
        }
    }
    finally {
        $request.Dispose()
    }
}

function Get-JsonProperty {
    param(
        [AllowNull()][object]$Value,
        [Parameter(Mandatory = $true)][string]$Name
    )

    if ($null -eq $Value) { return $null }
    $property = $Value.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    return $property.Value
}

function Get-SafeResponseCode {
    param([Parameter(Mandatory = $true)][pscustomobject]$Response)
    $code = [string](Get-JsonProperty $Response.Json "code")
    if ($code -match '^[A-Z0-9_:-]{1,80}$') { return $code }
    return "HTTP_$($Response.Status)"
}

function Assert-GenericAcceptedResponse {
    param(
        [Parameter(Mandatory = $true)][pscustomobject]$Response,
        [Parameter(Mandatory = $true)][string]$Stage
    )

    if ($Response.Status -eq 429) {
        throw (New-ProofException "$Stage was rate-limited before privacy equivalence could be proven." "RATE_LIMITED_TOO_EARLY" 429)
    }
    if ($Response.Status -ne 200) {
        $code = Get-SafeResponseCode $Response
        if ($code -match 'TURNSTILE|TOKEN|HOSTNAME|PROVIDER') {
            throw (New-ProofException "The qualified Preview did not accept Cloudflare's controlled Preview challenge response ($code). Confirm branch-scoped TURNSTILE_MODE=preview-test configuration." "TURNSTILE_PREVIEW_NOT_QUALIFIED" $Response.Status)
        }
        throw (New-ProofException "$Stage returned unexpected HTTP $($Response.Status) ($code)." "RESET_REQUEST_NOT_ACCEPTED" $Response.Status)
    }

    $ok = Get-JsonProperty $Response.Json "ok"
    $message = [string](Get-JsonProperty $Response.Json "message")
    if ($ok -ne $true -or $message -ne $script:RequiredGenericMessage) {
        throw (New-ProofException "$Stage did not return the required generic accepted response." "GENERIC_RESPONSE_INVALID" $Response.Status)
    }
    return $message
}

function Get-ProofConfiguration {
    param(
        [string]$BaseUrl = $env:CYBER_SENTINELS_BASE_URL,
        [string]$TestEmail = $env:CYBER_SENTINELS_TEST_EMAIL,
        [switch]$AllowInsecureLocalhost
    )

    if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
        throw (New-ProofException "CYBER_SENTINELS_BASE_URL is not set." "BASE_URL_MISSING")
    }
    if ([string]::IsNullOrWhiteSpace($TestEmail)) {
        throw (New-ProofException "CYBER_SENTINELS_TEST_EMAIL is not set." "TEST_EMAIL_MISSING")
    }
    $email = $TestEmail.Trim().ToLowerInvariant()
    if ($email.Length -gt 254 -or $email -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') {
        throw (New-ProofException "CYBER_SENTINELS_TEST_EMAIL is malformed." "TEST_EMAIL_MALFORMED")
    }

    $baseUri = $null
    if (-not [Uri]::TryCreate($BaseUrl.Trim(), [UriKind]::Absolute, [ref]$baseUri)) {
        throw (New-ProofException "CYBER_SENTINELS_BASE_URL is not a valid absolute URL." "BASE_URL_MALFORMED")
    }
    if ($baseUri.UserInfo -or $baseUri.Query -or $baseUri.Fragment -or
        ($baseUri.AbsolutePath -and $baseUri.AbsolutePath -ne "/")) {
        throw (New-ProofException "CYBER_SENTINELS_BASE_URL must be an origin without credentials, path, query, or fragment." "BASE_URL_MALFORMED")
    }

    $hostname = $baseUri.DnsSafeHost.ToLowerInvariant()
    $localhost = @("localhost", "127.0.0.1", "::1") -contains $hostname
    if ($baseUri.Scheme -ne "https" -and -not ($localhost -and $AllowInsecureLocalhost)) {
        throw (New-ProofException "CYBER_SENTINELS_BASE_URL must use HTTPS." "HTTPS_REQUIRED")
    }
    if ($hostname -eq "cybersentinels.com" -or $hostname.EndsWith(".cybersentinels.com")) {
        throw (New-ProofException "Production Cyber Sentinels domains are refused." "PRODUCTION_TARGET_REFUSED")
    }
    if (-not $localhost -and -not $hostname.EndsWith(".vercel.app")) {
        throw (New-ProofException "CYBER_SENTINELS_BASE_URL must identify a qualified Vercel Preview host." "PREVIEW_TARGET_REQUIRED")
    }

    return [pscustomobject]@{
        Origin = $baseUri.GetLeftPart([UriPartial]::Authority).TrimEnd("/")
        Email = $email
        Hostname = $hostname
        LocalContractTest = $localhost
    }
}

function Invoke-PasswordRecoveryNetworkProof {
    param(
        [Parameter(Mandatory = $true)][pscustomobject]$Configuration,
        [Parameter(Mandatory = $true)][System.Net.Http.HttpClient]$Client,
        [Parameter(Mandatory = $true)][bool]$BypassWasProvided
    )

    $origin = [string]$Configuration.Origin
    $endpoint = New-Object Uri("$origin/api/auth/password-reset/request")
    $login = Invoke-ProofHttpRequest $Client "GET" (New-Object Uri("$origin/login")) $origin $null $BypassWasProvided
    if ($login.Status -lt 200 -or $login.Status -ge 300) {
        throw (New-ProofException "Cyber Sentinels login preflight returned HTTP $($login.Status)." "LOGIN_PREFLIGHT_FAILED" $login.Status)
    }
    Write-SafeProofLine "PREFLIGHT: PASS"

    $missingChallenge = Invoke-ProofHttpRequest $Client "POST" $endpoint $origin @{
        email = [string]$Configuration.Email
        turnstileToken = ""
    } $BypassWasProvided
    $missingCode = Get-SafeResponseCode $missingChallenge
    if ($missingChallenge.Status -ne 400 -or $missingCode -ne "MISSING_TOKEN") {
        throw (New-ProofException "The endpoint did not reject a missing Turnstile challenge with the expected security response." "TURNSTILE_FAIL_CLOSED_INVALID" $missingChallenge.Status)
    }
    Write-SafeProofLine "TURNSTILE_FAIL_CLOSED: PASS"

    $malformed = Invoke-ProofHttpRequest $Client "POST" $endpoint $origin @{
        email = "not-an-email"
        turnstileToken = $script:PublicPreviewTurnstileTestResponse
    } $BypassWasProvided
    if ($malformed.Status -ne 400 -or (Get-SafeResponseCode $malformed) -ne "INVALID_EMAIL") {
        throw (New-ProofException "Malformed email was not rejected safely." "MALFORMED_EMAIL_INVARIANT_FAILED" $malformed.Status)
    }
    Write-SafeProofLine "MALFORMED_EMAIL: PASS"

    $known = Invoke-ProofHttpRequest $Client "POST" $endpoint $origin @{
        email = [string]$Configuration.Email
        turnstileToken = $script:PublicPreviewTurnstileTestResponse
    } $BypassWasProvided
    $knownMessage = Assert-GenericAcceptedResponse $known "Known-email reset request"

    $unknownAddress = "password-reset-proof+$([Guid]::NewGuid().ToString('N'))@example.invalid"
    $unknown = Invoke-ProofHttpRequest $Client "POST" $endpoint $origin @{
        email = $unknownAddress
        turnstileToken = $script:PublicPreviewTurnstileTestResponse
    } $BypassWasProvided
    $unknownMessage = Assert-GenericAcceptedResponse $unknown "Unknown-email reset request"
    if ($known.Status -ne $unknown.Status -or $knownMessage -ne $unknownMessage) {
        throw (New-ProofException "Known and unknown email responses were distinguishable." "ACCOUNT_ENUMERATION_RISK")
    }
    Write-SafeProofLine "RESET_REQUEST_ACCEPTED: PASS"
    Write-SafeProofLine "ACCOUNT_ENUMERATION: PASS"

    $rateLimited = $false
    for ($attempt = 1; $attempt -le 10; $attempt++) {
        $rateProbe = Invoke-ProofHttpRequest $Client "POST" $endpoint $origin @{
            email = "password-reset-rate+$([Guid]::NewGuid().ToString('N'))@example.invalid"
            turnstileToken = $script:PublicPreviewTurnstileTestResponse
        } $BypassWasProvided
        if ($rateProbe.Status -eq 429) {
            if ((Get-SafeResponseCode $rateProbe) -ne "RATE_LIMITED") {
                throw (New-ProofException "HTTP 429 did not use the expected safe rate-limit contract." "RATE_LIMIT_CONTRACT_INVALID" 429)
            }
            $rateLimited = $true
            break
        }
        if ($rateProbe.Status -ne 200) {
            throw (New-ProofException "Rate-limit probe returned unexpected HTTP $($rateProbe.Status)." "RATE_LIMIT_PROBE_FAILED" $rateProbe.Status)
        }
    }
    if (-not $rateLimited) {
        throw (New-ProofException "Rate limiting did not produce HTTP 429 within the bounded proof window." "RATE_LIMIT_NOT_OBSERVED")
    }
    Write-SafeProofLine "RATE_LIMIT: PASS (HTTP 429)"

    Assert-OutputContainsNoSensitiveValue @(
        [string]$Configuration.Email,
        $unknownAddress,
        $script:PublicPreviewTurnstileTestResponse,
        [string]$env:VERCEL_AUTOMATION_BYPASS_SECRET
    )
    Write-SafeProofLine "OUTPUT_SAFETY: PASS"
    Write-SafeProofLine "LIMITATION: Browser/mailbox proof is still required for delivery, PKCE callback, password change, and old/new password login."
    Write-SafeProofLine "PASSWORD RESET REQUEST WORKING THROUGH CYBER SENTINELS PUBLIC HTTPS ENDPOINT"
}

$client = $null
try {
    $configuration = Get-ProofConfiguration -AllowInsecureLocalhost:$AllowInsecureLocalhost
    $bypass = [string]$env:VERCEL_AUTOMATION_BYPASS_SECRET
    $client = New-ProofHttpClient $bypass
    Invoke-PasswordRecoveryNetworkProof $configuration $client (-not [string]::IsNullOrWhiteSpace($bypass))
    exit 0
}
catch {
    $safeMessage = if ($_.Exception.Data.Contains("ProofCode")) {
        [string]$_.Exception.Message
    }
    else {
        "Unexpected client failure; no response body or secret was printed."
    }
    [Console]::Error.WriteLine("BLOCKED $([char]0x2014) $safeMessage")
    exit 1
}
finally {
    if ($null -ne $client) { $client.Dispose() }
}
