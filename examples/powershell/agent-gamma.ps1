#Requires -Version 5.1

[CmdletBinding()]
param(
    [switch]$AllowInsecureLocalhost
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$script:BaseUri = $null
$script:ApiKey = $null
$script:HttpClient = $null
$script:OpenSsl = $null
$script:TemporaryFiles = New-Object System.Collections.Generic.List[string]
$script:TemporaryDirectory = $null
$script:ExitCode = 0

function New-CyberSentinelsException {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [string]$Code = "CLIENT_ERROR",
        [int]$Status = 0,
        [string]$CorrelationId = ""
    )

    $exception = New-Object System.Exception($Message)
    $exception.Data["Code"] = $Code
    $exception.Data["Status"] = $Status
    if ($CorrelationId) { $exception.Data["CorrelationId"] = $CorrelationId }
    return $exception
}

function ConvertTo-Base64Url {
    param([Parameter(Mandatory = $true)][byte[]]$Bytes)
    return [Convert]::ToBase64String($Bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function ConvertTo-CanonicalJson {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) { return "null" }
    if ($Value -is [string] -or $Value -is [char]) {
        return ConvertTo-Json -InputObject ([string]$Value) -Compress
    }
    if ($Value -is [bool]) { return ([string]$Value).ToLowerInvariant() }
    if ($Value -is [System.Collections.IDictionary]) {
        $keys = @($Value.Keys | ForEach-Object { [string]$_ })
        [Array]::Sort($keys, [StringComparer]::Ordinal)
        $members = foreach ($key in $keys) {
            "$(ConvertTo-Json -InputObject $key -Compress):$(ConvertTo-CanonicalJson $Value[$key])"
        }
        return "{$($members -join ',')}"
    }
    if ($Value -is [pscustomobject]) {
        $copy = @{}
        foreach ($property in $Value.PSObject.Properties) { $copy[$property.Name] = $property.Value }
        return ConvertTo-CanonicalJson $copy
    }
    if ($Value -is [System.Collections.IEnumerable]) {
        $items = foreach ($item in $Value) { ConvertTo-CanonicalJson $item }
        return "[$($items -join ',')]"
    }
    if ($Value -is [byte] -or $Value -is [sbyte] -or $Value -is [int16] -or
        $Value -is [uint16] -or $Value -is [int32] -or $Value -is [uint32] -or
        $Value -is [int64] -or $Value -is [uint64] -or $Value -is [single] -or
        $Value -is [double] -or $Value -is [decimal]) {
        return [Convert]::ToString($Value, [Globalization.CultureInfo]::InvariantCulture)
    }
    throw (New-CyberSentinelsException "Canonical JSON received an unsupported value." "CANONICAL_JSON_INVALID")
}

function ConvertTo-IsoUtc {
    param([Parameter(Mandatory = $true)][object]$Value)
    $parsed = [DateTimeOffset]::Parse(
        [string]$Value,
        [Globalization.CultureInfo]::InvariantCulture,
        [Globalization.DateTimeStyles]::RoundtripKind
    )
    return $parsed.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", [Globalization.CultureInfo]::InvariantCulture)
}

function Get-IsoUtcNow {
    return [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", [Globalization.CultureInfo]::InvariantCulture)
}

function Test-VercelAuthenticationResponse {
    param(
        [Parameter(Mandatory = $true)][int]$Status,
        [string]$Location = "",
        [string]$ContentType = "",
        [string]$Body = ""
    )

    $locationText = [string]$Location
    $vercelRedirect = $Status -ge 300 -and $Status -lt 400 -and (
        $locationText -match "(?i)vercel\.com/sso-api" -or
        $locationText -match "(?i)_vercel_sso_nonce" -or
        $locationText -match "(?i)vercel authentication"
    )
    $vercelHtml = $ContentType -match "(?i)text/html" -and $Body -match "(?i)(Vercel Authentication|Log in to Vercel|sso-api)"
    return $vercelRedirect -or $vercelHtml
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

function New-CyberSentinelsHttpClient {
    param([string]$VercelAutomationBypassSecret = "")

    Add-Type -AssemblyName System.Net.Http
    $handler = New-Object System.Net.Http.HttpClientHandler
    $handler.AllowAutoRedirect = $false
    $handler.UseCookies = $true
    $client = New-Object System.Net.Http.HttpClient($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(60)
    $client.DefaultRequestHeaders.UserAgent.ParseAdd("Cyber-Sentinels-PowerShell-Quickstart/0.1")
    if ($VercelAutomationBypassSecret) {
        [void]$client.DefaultRequestHeaders.TryAddWithoutValidation("x-vercel-protection-bypass", $VercelAutomationBypassSecret)
    }
    return $client
}

function Invoke-CyberSentinelsHttp {
    param(
        [Parameter(Mandatory = $true)][System.Net.Http.HttpClient]$Client,
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][Uri]$Uri,
        [AllowNull()][object]$Body = $null,
        [string]$ApiKey = "",
        [hashtable]$Headers = @{}
    )

    $request = New-Object System.Net.Http.HttpRequestMessage((New-Object System.Net.Http.HttpMethod($Method)), $Uri)
    try {
        $request.Headers.Accept.ParseAdd("application/json")
        if ($ApiKey) {
            $request.Headers.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $ApiKey)
        }
        foreach ($entry in $Headers.GetEnumerator()) {
            [void]$request.Headers.TryAddWithoutValidation([string]$entry.Key, [string]$entry.Value)
        }
        if ($null -ne $Body) {
            $json = ConvertTo-Json -InputObject $Body -Depth 30 -Compress
            $request.Content = New-Object System.Net.Http.StringContent($json, [Text.Encoding]::UTF8, "application/json")
        }
        $response = $Client.SendAsync($request).GetAwaiter().GetResult()
        try {
            $responseBody = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            $status = [int]$response.StatusCode
            $location = Get-ResponseHeader $response "location"
            $contentType = Get-ResponseHeader $response "content-type"
            if (Test-VercelAuthenticationResponse $status $location $contentType $responseBody) {
                throw (New-CyberSentinelsException `
                    "Vercel Authentication/SSO blocks this endpoint. Use an approved non-Production endpoint or an already-authorized automation bypass." `
                    "VERCEL_AUTHENTICATION_REDIRECT" $status)
            }
            return [pscustomobject]@{
                Status = $status
                Body = $responseBody
                ApiVersion = Get-ResponseHeader $response "x-cyber-sentinels-api-version"
                CorrelationId = Get-ResponseHeader $response "x-correlation-id"
                ContentType = $contentType
                Location = $location
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

function Read-SafeApiError {
    param([Parameter(Mandatory = $true)][pscustomobject]$Response)

    $code = "HTTP_$($Response.Status)"
    $message = "The Cyber Sentinels API rejected the request."
    $correlation = [string]$Response.CorrelationId
    try {
        $parsed = $Response.Body | ConvertFrom-Json
        if ($parsed.error.code) { $code = [string]$parsed.error.code }
        if ($parsed.error.message) { $message = [string]$parsed.error.message }
        if ($parsed.error.correlation_id) { $correlation = [string]$parsed.error.correlation_id }
    }
    catch {
        # Never echo an untrusted HTML/error body. The status and correlation ID are sufficient.
    }
    return [pscustomobject]@{ Code = $code; Message = $message; CorrelationId = $correlation }
}

function Test-CyberSentinelsConfiguration {
    [CmdletBinding()]
    param(
        [string]$BaseUrl = $env:CYBER_SENTINELS_BASE_URL,
        [string]$ApiKey = $env:CYBER_SENTINELS_API_KEY,
        [switch]$AllowInsecureLocalhost,
        [System.Net.Http.HttpClient]$HttpClient
    )

    if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
        throw (New-CyberSentinelsException "CYBER_SENTINELS_BASE_URL is not set." "BASE_URL_MISSING")
    }
    if ([string]::IsNullOrWhiteSpace($ApiKey)) {
        throw (New-CyberSentinelsException "CYBER_SENTINELS_API_KEY is not set." "API_KEY_MISSING")
    }
    if ($ApiKey -notmatch '^cs_(test|live)_[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}$') {
        throw (New-CyberSentinelsException "CYBER_SENTINELS_API_KEY is not structurally valid. The secret was not logged." "API_KEY_MALFORMED")
    }
    if ($ApiKey.StartsWith("cs_live_", [StringComparison]::Ordinal)) {
        throw (New-CyberSentinelsException "Production/live API keys are refused by this qualification quickstart." "PRODUCTION_API_KEY_REFUSED")
    }

    $baseUri = $null
    if (-not [Uri]::TryCreate($BaseUrl.Trim(), [UriKind]::Absolute, [ref]$baseUri)) {
        throw (New-CyberSentinelsException "CYBER_SENTINELS_BASE_URL is not a valid absolute URL." "BASE_URL_MALFORMED")
    }
    if ($baseUri.UserInfo -or $baseUri.Query -or $baseUri.Fragment -or ($baseUri.AbsolutePath -and $baseUri.AbsolutePath -ne "/")) {
        throw (New-CyberSentinelsException "CYBER_SENTINELS_BASE_URL must be an origin without credentials, path, query, or fragment." "BASE_URL_MALFORMED")
    }
    $hostname = $baseUri.DnsSafeHost.ToLowerInvariant()
    $localhost = @("localhost", "127.0.0.1", "::1") -contains $hostname
    if ($baseUri.Scheme -ne "https" -and -not ($localhost -and $AllowInsecureLocalhost)) {
        throw (New-CyberSentinelsException "CYBER_SENTINELS_BASE_URL must use HTTPS. HTTP is allowed only for explicitly enabled localhost development." "HTTPS_REQUIRED")
    }
    if ($hostname -eq "cybersentinels.com" -or $hostname.EndsWith(".cybersentinels.com")) {
        throw (New-CyberSentinelsException "Production Cyber Sentinels domains are refused by this qualification quickstart." "PRODUCTION_TARGET_REFUSED")
    }

    $ownsClient = $null -eq $HttpClient
    if ($ownsClient) { $HttpClient = New-CyberSentinelsHttpClient $env:VERCEL_AUTOMATION_BYPASS_SECRET }
    try {
        $normalizedBase = $baseUri.GetLeftPart([UriPartial]::Authority).TrimEnd("/")
        $openApiUri = New-Object Uri("$normalizedBase/api/v1/openapi.json")
        $openApi = Invoke-CyberSentinelsHttp $HttpClient "GET" $openApiUri
        if ($openApi.Status -ne 200) {
            throw (New-CyberSentinelsException "The public OpenAPI endpoint is not reachable (HTTP $($openApi.Status))." "OPENAPI_UNREACHABLE" $openApi.Status)
        }
        $openApiBody = $null
        try { $openApiBody = $openApi.Body | ConvertFrom-Json }
        catch { throw (New-CyberSentinelsException "The public endpoint did not return Cyber Sentinels OpenAPI JSON." "OPENAPI_IDENTITY_INVALID") }
        if (-not $openApi.ApiVersion -or $openApiBody.info.title -ne "Cyber Sentinels External Agent Trust API") {
            throw (New-CyberSentinelsException "The response could not be identified as the Cyber Sentinels public API." "API_IDENTITY_INVALID")
        }

        # A tenant-scoped, non-mutating lookup proves authentication and the
        # authority:read scope. A valid full-journey key must return the safe
        # stable AGENT_NOT_OWNED response for this deliberately nonexistent ID.
        $authProbeUri = New-Object Uri("$normalizedBase/api/v1/agents/preflight-probe/authority")
        $authProbe = Invoke-CyberSentinelsHttp $HttpClient "GET" $authProbeUri $null $ApiKey
        $probeError = Read-SafeApiError $authProbe
        if ($authProbe.Status -ne 404 -or $probeError.Code -notin @("AGENT_NOT_OWNED", "AGENT_NOT_FOUND")) {
            if ($authProbe.Status -eq 401) {
                throw (New-CyberSentinelsException "The API key was rejected. It may be invalid, expired, revoked, or inactive." $probeError.Code 401 $probeError.CorrelationId)
            }
            if ($authProbe.Status -eq 403) {
                throw (New-CyberSentinelsException "The API key lacks authority:read or is not tenant-bound for public API access." $probeError.Code 403 $probeError.CorrelationId)
            }
            throw (New-CyberSentinelsException "The authenticated API preflight returned an unexpected response (HTTP $($authProbe.Status))." $probeError.Code $authProbe.Status $probeError.CorrelationId)
        }

        return [pscustomobject]@{
            BaseUri = $normalizedBase
            Hostname = $hostname
            ApiVersion = [string]$openApi.ApiVersion
            OpenApiVersion = [string]$openApiBody.openapi
            ApiKeyPresent = $true
            ApiKeyLogged = $false
            VercelAuthenticationDetected = $false
        }
    }
    finally {
        if ($ownsClient -and $null -ne $HttpClient) { $HttpClient.Dispose() }
    }
}

function Assert-NonEmptyIdentifier {
    param(
        [AllowNull()][object]$Value,
        [Parameter(Mandatory = $true)][string]$Name
    )
    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) {
        throw (New-CyberSentinelsException "$Name is empty; no dependent API routes will be constructed." "EMPTY_IDENTIFIER")
    }
    return $text
}

function Get-AgentPath {
    param(
        [AllowNull()][object]$AgentId,
        [Parameter(Mandatory = $true)][string]$Suffix
    )
    $safeAgentId = Assert-NonEmptyIdentifier $AgentId "AgentId"
    return "/api/v1/agents/$([Uri]::EscapeDataString($safeAgentId))/$Suffix"
}

function Invoke-CyberSentinelsApi {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [AllowNull()][object]$Body = $null,
        [hashtable]$Headers = @{}
    )

    if ($Path -match '/agents//') {
        throw (New-CyberSentinelsException "An empty AgentId route was blocked before network access." "EMPTY_AGENT_ROUTE")
    }
    $response = Invoke-CyberSentinelsHttp $script:HttpClient $Method (New-Object Uri("$($script:BaseUri)$Path")) $Body $script:ApiKey $Headers
    if ($response.Status -lt 200 -or $response.Status -ge 300) {
        $safe = Read-SafeApiError $response
        $suffix = if ($safe.CorrelationId) { " Correlation: $($safe.CorrelationId)." } else { "" }
        throw (New-CyberSentinelsException "$($safe.Message) [$($safe.Code), HTTP $($response.Status)].$suffix" $safe.Code $response.Status $safe.CorrelationId)
    }
    if (-not $response.Body) { return $null }
    try {
        $parsed = $response.Body | ConvertFrom-Json
        if ($parsed -is [pscustomobject] -and $response.CorrelationId) {
            $parsed | Add-Member -NotePropertyName "correlation_id" -NotePropertyValue ([string]$response.CorrelationId) -Force
        }
        return $parsed
    }
    catch { throw (New-CyberSentinelsException "Cyber Sentinels returned invalid JSON." "INVALID_API_RESPONSE" $response.Status $response.CorrelationId) }
}

function Submit-CyberSentinelsEvidence {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][object]$Evidence,
        [string]$EvidenceApiKey = $env:CYBER_SENTINELS_EVIDENCE_API_KEY
    )

    if ([string]::IsNullOrWhiteSpace($EvidenceApiKey)) {
        throw (New-CyberSentinelsException "CYBER_SENTINELS_EVIDENCE_API_KEY is not set." "EVIDENCE_API_KEY_MISSING")
    }
    $response = Invoke-CyberSentinelsHttp $script:HttpClient "POST" (New-Object Uri("$($script:BaseUri)/api/v1/evidence")) $Evidence $EvidenceApiKey
    if ($response.Status -lt 200 -or $response.Status -ge 300) {
        $safe = Read-SafeApiError $response
        throw (New-CyberSentinelsException "$($safe.Message) [$($safe.Code), HTTP $($response.Status)]." $safe.Code $response.Status $safe.CorrelationId)
    }
    try { return $response.Body | ConvertFrom-Json }
    catch { throw (New-CyberSentinelsException "Cyber Sentinels returned invalid evidence JSON." "INVALID_API_RESPONSE" $response.Status $response.CorrelationId) }
}

function Find-OpenSsl {
    if ($env:OPENSSL_PATH -and [IO.File]::Exists($env:OPENSSL_PATH)) { return $env:OPENSSL_PATH }
    $command = Get-Command "openssl" -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    foreach ($candidate in @(
        "C:\Program Files\Git\usr\bin\openssl.exe",
        "C:\Program Files\OpenSSL-Win64\bin\openssl.exe"
    )) {
        if ([IO.File]::Exists($candidate)) { return $candidate }
    }
    throw (New-CyberSentinelsException "OpenSSL with Ed25519 support is required. Install OpenSSL and ensure 'openssl' is on PATH." "OPENSSL_MISSING")
}

function Invoke-OpenSsl {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    $output = & $script:OpenSsl @Arguments 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        throw (New-CyberSentinelsException "OpenSSL could not complete the Ed25519 operation. No private-key material was logged." "OPENSSL_OPERATION_FAILED")
    }
    return $output
}

function Add-TemporaryFile {
    param([Parameter(Mandatory = $true)][string]$Name)
    $path = Join-Path $script:TemporaryDirectory $Name
    $script:TemporaryFiles.Add($path)
    return $path
}

function New-ExternalEd25519Key {
    $privateKeyPath = Add-TemporaryFile "gamma-private.pem"
    $publicDerPath = Add-TemporaryFile "gamma-public.der"
    [void](Invoke-OpenSsl @("genpkey", "-algorithm", "ED25519", "-out", $privateKeyPath))
    [void](Invoke-OpenSsl @("pkey", "-in", $privateKeyPath, "-pubout", "-outform", "DER", "-out", $publicDerPath))
    $der = [IO.File]::ReadAllBytes($publicDerPath)
    $expectedPrefix = [byte[]](0x30,0x2a,0x30,0x05,0x06,0x03,0x2b,0x65,0x70,0x03,0x21,0x00)
    if ($der.Length -ne 44) { throw (New-CyberSentinelsException "OpenSSL returned an unexpected Ed25519 public key." "ED25519_PUBLIC_KEY_INVALID") }
    for ($index = 0; $index -lt $expectedPrefix.Length; $index++) {
        if ($der[$index] -ne $expectedPrefix[$index]) { throw (New-CyberSentinelsException "OpenSSL returned an unexpected Ed25519 public key." "ED25519_PUBLIC_KEY_INVALID") }
    }
    $publicBytes = New-Object byte[] 32
    [Array]::Copy($der, 12, $publicBytes, 0, 32)
    return [pscustomobject]@{ PrivateKeyPath = $privateKeyPath; PublicX = ConvertTo-Base64Url $publicBytes }
}

function New-Ed25519Signature {
    param(
        [Parameter(Mandatory = $true)][string]$PrivateKeyPath,
        [Parameter(Mandatory = $true)][object]$Claims
    )
    $identifier = [Guid]::NewGuid().ToString("N")
    $payloadPath = Add-TemporaryFile "payload-$identifier.json"
    $signaturePath = Add-TemporaryFile "signature-$identifier.bin"
    $utf8WithoutBom = New-Object Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($payloadPath, (ConvertTo-CanonicalJson $Claims), $utf8WithoutBom)
    [void](Invoke-OpenSsl @("pkeyutl", "-sign", "-rawin", "-inkey", $PrivateKeyPath, "-in", $payloadPath, "-out", $signaturePath))
    return ConvertTo-Base64Url ([IO.File]::ReadAllBytes($signaturePath))
}

function Write-CyberSentinelsMarker {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [AllowNull()][object]$Value
    )
    $json = ConvertTo-Json -InputObject $Value -Depth 20 -Compress
    [Console]::Out.WriteLine("${Name}: $json")
}

function Invoke-AgentGammaJourney {
    $preflight = Test-CyberSentinelsConfiguration -AllowInsecureLocalhost:$AllowInsecureLocalhost -HttpClient $script:HttpClient
    $script:BaseUri = $preflight.BaseUri
    Write-CyberSentinelsMarker "PREFLIGHT" ([ordered]@{
        base_hostname = $preflight.Hostname
        api_version = $preflight.ApiVersion
        openapi = $preflight.OpenApiVersion
        api_key_logged = $false
    })

    $script:OpenSsl = Find-OpenSsl
    $key = New-ExternalEd25519Key
    $kid = "gamma-$([Guid]::NewGuid())"
    $publicJwk = [ordered]@{
        kty = "OKP"; crv = "Ed25519"; x = $key.PublicX; kid = $kid
        alg = "EdDSA"; use = "sig"; key_ops = @("verify")
    }

    $agent = Invoke-CyberSentinelsApi "POST" "/api/v1/agents" ([ordered]@{
        display_name = "Agent Gamma"
        entity_type = "AI_AGENT"
        owner_reference = "owner:gamma-customer"
        runtime = [ordered]@{ environment = "staging"; framework = "powershell" }
        model = [ordered]@{ provider = "declared-provider"; identifier = "declared-model" }
    })
    $agentId = Assert-NonEmptyIdentifier $agent.agent_id "AgentId"
    $operationalEntityId = Assert-NonEmptyIdentifier $agent.operational_entity_id "OperationalEntityId"
    Write-CyberSentinelsMarker "REGISTERED" ([ordered]@{ agent_id = $agentId; status = $agent.status; correlation_id = $agent.correlation_id })

    $credentialExpiresAt = [DateTime]::UtcNow.AddHours(24).ToString("yyyy-MM-ddTHH:mm:ss.fffZ", [Globalization.CultureInfo]::InvariantCulture)
    $credential = Invoke-CyberSentinelsApi "POST" (Get-AgentPath $agentId "credentials") ([ordered]@{
        public_jwk = $publicJwk; kid = $kid; algorithm = "Ed25519"; expires_at = $credentialExpiresAt
    })
    $credentialId = Assert-NonEmptyIdentifier $credential.credential_id "CredentialId"
    Write-CyberSentinelsMarker "CREDENTIAL" ([ordered]@{
        credential_id = $credentialId; fingerprint = $credential.fingerprint; private_key_stored = $credential.private_key_stored; correlation_id = $credential.correlation_id
    })

    $sha256 = [Security.Cryptography.SHA256]::Create()
    try { $buildDigest = ([BitConverter]::ToString($sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes("agent-gamma-powershell-v0.1.0")))).Replace("-", "").ToLowerInvariant() }
    finally { $sha256.Dispose() }
    $nonceBytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($nonceBytes) } finally { $rng.Dispose() }
    $issuedAt = Get-IsoUtcNow
    $manifestClaims = [ordered]@{
        manifest_version = "1.0"
        operational_entity_id = $operationalEntityId
        entity_type = "AI_AGENT"
        owner_reference = [string]$agent.manifest_context.accountable_owner_id
        model = [ordered]@{ provider = "declared-provider"; identifier = "declared-model"; version = "gamma-powershell-0.1.0" }
        runtime = [ordered]@{
            framework = "powershell"; runtime_type = "powershell"; region = "external"; version = [string]$PSVersionTable.PSVersion
            workload_identifier = "agent-gamma-process"; deployment_identifier = "gamma-powershell-proof"; build_digest = $buildDigest
        }
        environment = "staging"
        declared_capabilities = @("read_repository")
        credential_id = $credentialId
        issued_at = $issuedAt
        expires_at = [DateTime]::UtcNow.AddHours(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ", [Globalization.CultureInfo]::InvariantCulture)
        nonce = ConvertTo-Base64Url $nonceBytes
    }
    $manifestSignature = New-Ed25519Signature $key.PrivateKeyPath $manifestClaims
    $signedManifest = [ordered]@{}
    foreach ($entry in $manifestClaims.GetEnumerator()) { $signedManifest[$entry.Key] = $entry.Value }
    $signedManifest.signature = $manifestSignature
    $manifest = Invoke-CyberSentinelsApi "POST" (Get-AgentPath $agentId "manifest") $signedManifest
    Write-CyberSentinelsMarker "MANIFEST" ([ordered]@{ manifest_id = $manifest.manifest_id; manifest_digest = $manifest.manifest_digest; correlation_id = $manifest.correlation_id })

    $challenge = Invoke-CyberSentinelsApi "POST" (Get-AgentPath $agentId "challenge") ([ordered]@{})
    $challengeId = Assert-NonEmptyIdentifier $challenge.challenge_id "ChallengeId"
    $signatureClaims = [ordered]@{
        challengeId = $challengeId
        enterpriseId = [string]$agent.manifest_context.enterprise_id
        operationalEntityId = [string]$challenge.operational_entity_id
        nonce = [string]$challenge.nonce
        audience = [string]$challenge.audience
        issuer = [string]$challenge.issuer
        subject = [string]$challenge.subject
        manifestDigest = [string]$challenge.manifest_digest
        signingKeyId = [string]$challenge.signing_key_id
        issuedAt = ConvertTo-IsoUtc $challenge.issued_at
        expiresAt = ConvertTo-IsoUtc $challenge.expires_at
    }
    $proof = [ordered]@{
        challenge_id = $challengeId
        credential_id = $credentialId
        signature = New-Ed25519Signature $key.PrivateKeyPath $signatureClaims
        signed_payload = [ordered]@{
            challenge_id = $challengeId
            enterprise_id = [string]$agent.manifest_context.enterprise_id
            operational_entity_id = [string]$challenge.operational_entity_id
            nonce = [string]$challenge.nonce
            audience = [string]$challenge.audience
            issuer = [string]$challenge.issuer
            subject = [string]$challenge.subject
            manifest_digest = [string]$challenge.manifest_digest
            signing_key_id = [string]$challenge.signing_key_id
            issued_at = [string]$challenge.issued_at
            expires_at = [string]$challenge.expires_at
            submitted_at = Get-IsoUtcNow
        }
    }
    $identity = Invoke-CyberSentinelsApi "POST" (Get-AgentPath $agentId "proof") $proof
    if ($identity.identity -ne "VERIFIED") { throw (New-CyberSentinelsException "Gamma identity was not VERIFIED." "IDENTITY_NOT_VERIFIED") }
    Write-CyberSentinelsMarker "IDENTITY" $identity

    $replayRejected = $false
    try { [void](Invoke-CyberSentinelsApi "POST" (Get-AgentPath $agentId "proof") $proof) }
    catch {
        if ([int]$_.Exception.Data["Status"] -eq 409) { $replayRejected = $true } else { throw }
    }
    if (-not $replayRejected) { throw (New-CyberSentinelsException "The consumed challenge was accepted twice." "CHALLENGE_REPLAY_ACCEPTED") }
    Write-CyberSentinelsMarker "CHALLENGE_REPLAY" ([ordered]@{ result = "REJECTED" })

    $encodedAgentId = [Uri]::EscapeDataString($agentId)
    $registeredAgent = Invoke-CyberSentinelsApi "GET" "/api/v1/agents/$encodedAgentId"
    Write-CyberSentinelsMarker "AGENT" ([ordered]@{ agent_id = $registeredAgent.agent_id; authority_reference = $registeredAgent.authority_reference })

    $authorityPath = Get-AgentPath $agentId "authorities"
    $authority = Invoke-CyberSentinelsApi "POST" $authorityPath ([ordered]@{
        action = "read_repository"; target = "repository:a"; purpose = "deployment_evidence_review"; environment = "staging"
        expires_at = [DateTime]::UtcNow.AddHours(1).ToString("yyyy-MM-ddTHH:mm:ss.fffZ", [Globalization.CultureInfo]::InvariantCulture)
        data_boundary = "INTERNAL"; execution_limit = 100
    })
    $authorityId = Assert-NonEmptyIdentifier $authority.authority_id "AuthorityId"
    $authorityHistory = Invoke-CyberSentinelsApi "GET" $authorityPath
    $authorityVersion = Invoke-CyberSentinelsApi "GET" "$authorityPath/$([Uri]::EscapeDataString($authorityId))"
    $currentAuthority = Invoke-CyberSentinelsApi "GET" (Get-AgentPath $agentId "authority")
    Write-CyberSentinelsMarker "AUTHORITY" ([ordered]@{
        authority_id = $authorityId; authority_version = $authority.authority_version; status = $currentAuthority.status
        history_count = @($authorityHistory.authorities).Count; version_status = $authorityVersion.status
    })

    $allowIdempotencyKey = "gamma-allow-$([Guid]::NewGuid())"
    $allowRequest = [ordered]@{
        operational_entity_id = $operationalEntityId
        action = [ordered]@{ type = "read_repository"; target = "repository:a"; purpose = "deployment_evidence_review"; environment = "staging" }
        idempotency_key = $allowIdempotencyKey
    }
    $allow = Invoke-CyberSentinelsApi "POST" "/api/v1/trust/decisions" $allowRequest @{ "Idempotency-Key" = $allowIdempotencyKey }
    if ($allow.decision -ne "ALLOW") { throw (New-CyberSentinelsException "Expected canonical ALLOW, received $($allow.decision)." "ALLOW_NOT_PROVEN") }
    $transactionId = Assert-NonEmptyIdentifier $allow.transaction_id "TransactionId"
    Write-CyberSentinelsMarker "ALLOW" ([ordered]@{ transaction_id = $transactionId; decision = $allow.decision; reason_codes = $allow.reason_codes; correlation_id = $allow.correlation_id })

    $allowRetry = Invoke-CyberSentinelsApi "POST" "/api/v1/trust/decisions" $allowRequest @{ "Idempotency-Key" = $allowIdempotencyKey }
    if ($allowRetry.transaction_id -ne $transactionId -or $allowRetry.idempotent_replay -ne $true) {
        throw (New-CyberSentinelsException "The idempotent retry did not return the original logical transaction." "IDEMPOTENCY_NOT_PROVEN")
    }
    Write-CyberSentinelsMarker "IDEMPOTENCY" ([ordered]@{ transaction_id = $transactionId; idempotent_replay = $true; correlation_id = $allowRetry.correlation_id })

    $reviewIdempotencyKey = "gamma-review-$([Guid]::NewGuid())"
    $reviewRequest = [ordered]@{
        operational_entity_id = $operationalEntityId
        action = [ordered]@{ type = "read_repository"; target = "repository:a"; purpose = "deployment_evidence_review"; environment = "staging" }
        context = [ordered]@{ previous_transaction_id = $transactionId; material_changes = @("CUSTOMER_ZERO_HUMAN_REVIEW_REQUIRED") }
        idempotency_key = $reviewIdempotencyKey
    }
    $reviewDecision = Invoke-CyberSentinelsApi "POST" "/api/v1/trust/decisions" $reviewRequest @{ "Idempotency-Key" = $reviewIdempotencyKey }
    if ($reviewDecision.decision -ne "REVIEW" -or $null -ne $reviewDecision.execution_authorization) {
        throw (New-CyberSentinelsException "Expected canonical REVIEW with no execution authorization." "REVIEW_NOT_PROVEN")
    }
    $reviewReference = Assert-NonEmptyIdentifier $reviewDecision.review_reference "ReviewReference"
    $reviewPath = "/api/v1/reviews/$([Uri]::EscapeDataString($reviewReference))"
    $requestedReview = Invoke-CyberSentinelsApi "GET" $reviewPath
    $resolvedReview = Invoke-CyberSentinelsApi "POST" "$reviewPath/resolve" ([ordered]@{
        resolution = "APPROVED"
        reason = "Customer Zero authorized reviewer approved this exact staging action."
        evidence_reference = "customer-zero-review:$([Guid]::NewGuid())"
    })
    if ($requestedReview.original_decision -ne "REVIEW" -or $resolvedReview.original_decision -ne "REVIEW" -or $resolvedReview.next_action -ne "SUBMIT_NEW_CANONICAL_EVALUATION") {
        throw (New-CyberSentinelsException "Review resolution bypassed immutable REVIEW semantics." "REVIEW_IMMUTABILITY_NOT_PROVEN")
    }
    Write-CyberSentinelsMarker "REVIEW" ([ordered]@{
        review_reference = $reviewReference; transaction_id = $reviewDecision.transaction_id; original_decision = $resolvedReview.original_decision
        resolution = $resolvedReview.disposition; next_action = $resolvedReview.next_action
    })

    $postReviewIdempotencyKey = "gamma-post-review-$([Guid]::NewGuid())"
    $postReview = Invoke-CyberSentinelsApi "POST" "/api/v1/trust/decisions" ([ordered]@{
        operational_entity_id = $operationalEntityId
        action = [ordered]@{ type = "read_repository"; target = "repository:a"; purpose = "deployment_evidence_review"; environment = "staging" }
        context = [ordered]@{ previous_transaction_id = $reviewDecision.transaction_id; human_approval_reference = $reviewReference }
        idempotency_key = $postReviewIdempotencyKey
    }) @{ "Idempotency-Key" = $postReviewIdempotencyKey }
    if ($postReview.decision -ne "ALLOW") { throw (New-CyberSentinelsException "The post-review fresh evaluation did not ALLOW." "POST_REVIEW_ALLOW_NOT_PROVEN") }
    Write-CyberSentinelsMarker "POST_REVIEW_ALLOW" ([ordered]@{ transaction_id = $postReview.transaction_id; decision = $postReview.decision })

    $denyIdempotencyKey = "gamma-deny-$([Guid]::NewGuid())"
    $denyRequest = [ordered]@{
        operational_entity_id = $operationalEntityId
        action = [ordered]@{ type = "write_repository"; target = "repository:a"; purpose = "deployment_evidence_mutation"; environment = "staging" }
        idempotency_key = $denyIdempotencyKey
    }
    $deny = Invoke-CyberSentinelsApi "POST" "/api/v1/trust/decisions" $denyRequest @{ "Idempotency-Key" = $denyIdempotencyKey }
    if ($deny.decision -ne "DENY" -or $null -ne $deny.execution_authorization) {
        throw (New-CyberSentinelsException "Expected canonical DENY with no execution authorization." "DENY_NOT_PROVEN")
    }
    Write-CyberSentinelsMarker "DENY" ([ordered]@{ transaction_id = $deny.transaction_id; decision = $deny.decision; reason_codes = $deny.reason_codes; correlation_id = $deny.correlation_id })

    $transaction = Invoke-CyberSentinelsApi "GET" "/api/v1/trust/transactions/$([Uri]::EscapeDataString($transactionId))"
    $replay = Invoke-CyberSentinelsApi "GET" "/api/v1/trust/transactions/$([Uri]::EscapeDataString($transactionId))/replay"
    $receipt = Invoke-CyberSentinelsApi "GET" "/api/v1/trust/transactions/$([Uri]::EscapeDataString($transactionId))/receipt"
    $trustState = Invoke-CyberSentinelsApi "GET" (Get-AgentPath $agentId "trust-state")
    Write-CyberSentinelsMarker "TRANSACTION" ([ordered]@{ transaction_id = $transaction.transaction_id; decision = $transaction.decision; correlation_id = $transaction.correlation_id })
    Write-CyberSentinelsMarker "REPLAY" ([ordered]@{ event_count = @($replay.events).Count })
    Write-CyberSentinelsMarker "RECEIPT" ([ordered]@{ receipt_version = $receipt.receipt_version; decision_digest = $receipt.decision_digest })
    Write-CyberSentinelsMarker "TRUST_STATE" $trustState

    $outcome = Invoke-CyberSentinelsApi "POST" "/api/v1/trust/transactions/$([Uri]::EscapeDataString($transactionId))/outcomes" ([ordered]@{
        source_id = "self"; destination = "repository:a"; action_reference = "read_repository"; target = "repository:a"
        result = "SUCCEEDED"; observed_at = Get-IsoUtcNow; evidence_reference = "gamma-assertion:$([Guid]::NewGuid())"
    })
    if ($outcome.evidence_independence -ne "AGENT_ASSERTED" -or $outcome.independent_destination_evidence -ne $false) {
        throw (New-CyberSentinelsException "The outcome overstated evidence independence." "OUTCOME_INDEPENDENCE_INVALID")
    }
    Write-CyberSentinelsMarker "OUTCOME" ([ordered]@{
        status = $outcome.status; evidence_independence = $outcome.evidence_independence
        independent_destination_evidence = $outcome.independent_destination_evidence
    })

    $revocation = Invoke-CyberSentinelsApi "POST" "$authorityPath/$([Uri]::EscapeDataString($authorityId))/revoke" ([ordered]@{
        reason = "Customer Zero post-decision revocation proof."
    })
    $revokedAuthority = Invoke-CyberSentinelsApi "GET" "$authorityPath/$([Uri]::EscapeDataString($authorityId))"
    if ($revokedAuthority.status -ne "REVOKED") { throw (New-CyberSentinelsException "Authority history did not preserve revocation." "REVOCATION_NOT_PROVEN") }
    Write-CyberSentinelsMarker "REVOCATION" ([ordered]@{
        authority_id = $authorityId; authority_version = $authority.authority_version; status = $revocation.status; revocation_reference = $revocation.revocation_reference
    })

    $postRevocationKey = "gamma-post-revocation-$([Guid]::NewGuid())"
    $postRevocation = Invoke-CyberSentinelsApi "POST" "/api/v1/trust/decisions" ([ordered]@{
        operational_entity_id = $operationalEntityId
        action = [ordered]@{ type = "read_repository"; target = "repository:a"; purpose = "deployment_evidence_review"; environment = "staging" }
        context = [ordered]@{ previous_transaction_id = $postReview.transaction_id }
        idempotency_key = $postRevocationKey
    }) @{ "Idempotency-Key" = $postRevocationKey }
    if ($postRevocation.decision -ne "DENY" -or $null -ne $postRevocation.execution_authorization) {
        throw (New-CyberSentinelsException "A later action remained authorized after revocation." "POST_REVOCATION_DENY_NOT_PROVEN")
    }
    $postRevocationTransactionId = Assert-NonEmptyIdentifier $postRevocation.transaction_id "PostRevocationTransactionId"
    $postRevocationReceipt = Invoke-CyberSentinelsApi "GET" "/api/v1/trust/transactions/$([Uri]::EscapeDataString($postRevocationTransactionId))/receipt"
    $postRevocationReplay = Invoke-CyberSentinelsApi "GET" "/api/v1/trust/transactions/$([Uri]::EscapeDataString($postRevocationTransactionId))/replay"
    Write-CyberSentinelsMarker "POST_REVOCATION_DENY" ([ordered]@{
        transaction_id = $postRevocationTransactionId; decision = $postRevocation.decision; receipt_id = $postRevocationReceipt.receipt_id
        replay_id = $postRevocationReplay.replay_id; reason_codes = $postRevocation.reason_codes
    })
    Write-CyberSentinelsMarker "GAMMA_RESULT" "PUBLIC_HTTPS_API_ONLY_END_TO_END_COMPLETE"
}

$script:ApiKey = $env:CYBER_SENTINELS_API_KEY
$script:TemporaryDirectory = Join-Path ([IO.Path]::GetTempPath()) ("cyber-sentinels-gamma-" + [Guid]::NewGuid().ToString("N"))

try {
    [IO.Directory]::CreateDirectory($script:TemporaryDirectory) | Out-Null
    $script:HttpClient = New-CyberSentinelsHttpClient $env:VERCEL_AUTOMATION_BYPASS_SECRET
    Invoke-AgentGammaJourney
}
catch {
    $message = if ($_.Exception -and $_.Exception.Message) { $_.Exception.Message } else { "The PowerShell Gamma workflow failed safely." }
    [Console]::Error.WriteLine("Cyber Sentinels Gamma failed: $message")
    $script:ExitCode = 1
}
finally {
    if ($null -ne $script:HttpClient) { $script:HttpClient.Dispose() }
    $cleanupFailed = $false
    foreach ($path in $script:TemporaryFiles) {
        if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue }
        if (Test-Path -LiteralPath $path) { $cleanupFailed = $true }
    }
    if ($script:TemporaryDirectory -and (Test-Path -LiteralPath $script:TemporaryDirectory)) {
        Remove-Item -LiteralPath $script:TemporaryDirectory -Force -ErrorAction SilentlyContinue
        if (Test-Path -LiteralPath $script:TemporaryDirectory) { $cleanupFailed = $true }
    }
    if ($cleanupFailed) {
        [Console]::Error.WriteLine("Cyber Sentinels Gamma failed: temporary private-key material could not be removed.")
        $script:ExitCode = 1
    }
}

if ($script:ExitCode -eq 1) { exit 1 }
exit 0
