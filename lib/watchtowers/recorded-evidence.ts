// Generated from signed LOCAL fixture bundles. Never a runtime authorisation decision.
export const recordedEvidence = {
  "classification": "ILLUSTRATIVE SIMULATION",
  "hosted": false,
  "torchSha": "202117ae82a48a7f8d536c29d5d700e8fbf11c70",
  "riverSha": "0b256b0e14b1138220228baea1051a2b0b3b5028",
  "torch": {
    "manifest": {
      "environment": "LOCAL SYNTHETIC FIXTURE",
      "hosted": false,
      "classification": "PARTIAL",
      "cryptography": "Existing Ed25519 agent-message verification; existing file CAS and Swarm Replay",
      "results": [
        {
          "scenario": "A",
          "reason": "INVESTIGATION_OPENED",
          "accepted": true,
          "investigations": 1,
          "destinationEffects": 0,
          "evidenceDigest": "75702c80ca5e678b8be2f7b86813c9a986f776ae817e35c0795af79df37213ca"
        },
        {
          "scenario": "B",
          "reason": "INVALID_WARNING",
          "accepted": false,
          "investigations": 0,
          "destinationEffects": 0,
          "evidenceDigest": "14c045ff375fb344d3f66932d3c86f7fe1be9f26ddfeddae284f1a51d42747fb"
        },
        {
          "scenario": "C",
          "reason": "INVALID_ORIGIN",
          "accepted": false,
          "investigations": 0,
          "destinationEffects": 0,
          "evidenceDigest": "0987da82fb6aa4c3c5fb38f843f515310ce142f5a8cd81d134d357bb3e3a4570"
        },
        {
          "scenario": "D-initial",
          "reason": "INVESTIGATION_OPENED",
          "accepted": true,
          "investigations": 1,
          "destinationEffects": 0,
          "evidenceDigest": "73cc85a8352af13d174e09018f82817c4d40d6763d75bf7b032264762a443429"
        },
        {
          "scenario": "D",
          "reason": "MESSAGE_REPLAY",
          "destinationEffects": 0,
          "investigations": 0,
          "evidenceDigest": "186b6d5d9258f965de03c5fddc7c2b7530f5e26784cc6f7071331d448cc45071"
        },
        {
          "scenario": "E",
          "reason": "INVALID_ORIGIN",
          "accepted": false,
          "investigations": 0,
          "destinationEffects": 0,
          "evidenceDigest": "59f5924269c750bb98c609d519ea7836af812c81cef253b408e62f86432f3c3d"
        },
        {
          "scenario": "PAYLOAD-TAMPER",
          "reason": "INVALID_ORIGIN",
          "accepted": false,
          "investigations": 0,
          "destinationEffects": 0,
          "evidenceDigest": "805e29a2f09107fc5ee034efe5e1c1ff8f9ad61a354a62efbcb7db79bfb003a5"
        },
        {
          "scenario": "F-initial",
          "reason": "INVESTIGATION_OPENED",
          "accepted": true,
          "investigations": 1,
          "destinationEffects": 0,
          "evidenceDigest": "c96886ec02663cb4f4fbc02384bf583b98b28fd3f99a27719f935a59a1dbec0d"
        },
        {
          "scenario": "F",
          "reason": "VALID_ALTERNATE_RELAY",
          "destinationEffects": 0,
          "investigations": 0,
          "evidenceDigest": "6ea3b8444dd405597536929e8ab0eabb104e3e25ead635f44a8f993da42c703c"
        }
      ]
    },
    "signature": "VxtWgIjo_NNWEdlM3c_pp6HvjXtP59QJLLWWKaTk4CsHceVuyLs1vc9PNh3HSVJsCk-B5hI7iZIjFORnUWeVDw",
    "publicKey": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAO73dSHblDY2YmTvhBRy/pDqu31quE49men04apc272U=\n-----END PUBLIC KEY-----\n",
    "trustAnchor": "Ephemeral local test key; not a Production identity assertion"
  },
  "river": {
    "manifest": {
      "environment": "LOCAL SYNTHETIC ONLY",
      "hosted": false,
      "scope": "Actual existing policy function, application dispatcher and PR132 SQL; minimal predecessor schema; synthetic identity/approval fixtures",
      "gateway": "loopback authenticated controlled-export",
      "torchSourceSha": "202117ae82a48a7f8d536c29d5d700e8fbf11c70",
      "limitations": [
        "No hosted Auth, full schema, real AI review or Production provider qualification",
        "H composes actual pinned signal/review modules and the P0 gateway locally; hosted integration is BLOCKED"
      ],
      "tests": [
        {
          "scenario": "A",
          "tenant": "abffb9a9-2780-4299-a531-c5dd8cdc8b31",
          "actor": "1e5224cd-6b5a-43ce-b945-1d7c5f0ad594",
          "agent": "CHIRIVETA",
          "transaction": "38d6d681-4cfa-4533-b3ff-1e6da23ec33e",
          "authority": "a3cdd4dd-4d44-46f6-872f-71b6e19f90a9",
          "delegation": "65cdb460-8f38-44de-af3e-083d8768c5cd",
          "policy": "export-policy:v1",
          "approval": null,
          "actionDigest": "2b76206ae820dec51b748a7fed1211324ef348ce7c0515c02d4d13e87a4a6fb0",
          "decision": "ALLOW",
          "effects": 1,
          "claims": 1,
          "steps": [
            "DETECTION_FIXTURE",
            "RELAY_FIXTURE",
            "CHIRIVETA_ADVISORY",
            "EXISTING_POLICY_GATEWAY",
            "DISPATCH_BOUNDARY",
            "INDEPENDENT_DESTINATION_QUERY"
          ],
          "temporarySeconds": 300,
          "expiryEvaluation": "Independent query at simulated time after expiry; no wall-clock wait",
          "evidenceDigest": "c77865a0529e460920ea90810ab3f26976d6d733ef039e0899ea2905bdfdd5e2"
        },
        {
          "scenario": "B",
          "tenant": "e0e41723-10f7-4af0-995b-e6d08cfff6e4",
          "actor": "1fa8ad18-5481-42e6-903e-6b412d8f8fbe",
          "agent": "CHIRIVETA",
          "transaction": "855b3a9c-1487-4c4d-89c7-cf37ab093668",
          "authority": "5548ea98-650a-4d52-8ae4-51e4e631cb62",
          "delegation": "f86f6201-6fc8-4da0-bc07-9381f2a8b027",
          "policy": "export-policy:v1",
          "approval": "f2ff437e-5fb2-40a0-996f-2d081d391244",
          "actionDigest": "db9e47403467178a82f32ec8cbe9996b4cb7581f6325800b02bf32a6a0f89929",
          "decision": "REVIEW → ALLOW",
          "effects": 1,
          "claims": 1,
          "steps": [
            "DETECTION_FIXTURE",
            "RELAY_FIXTURE",
            "CHIRIVETA_ADVISORY",
            "EXISTING_POLICY_GATEWAY",
            "EXACT_ACTION_HUMAN_APPROVAL",
            "DISPATCH_BOUNDARY",
            "INDEPENDENT_DESTINATION_QUERY"
          ],
          "pendingEffects": 0,
          "evidenceDigest": "89b0890bff81d361a6a5f978e23d37e6fb0de98f561340ab7452ce44625d5d29"
        },
        {
          "scenario": "C",
          "tenant": "8b235b23-19e6-4679-b36c-96dfb92fb9f0",
          "actor": "ab9b1bda-e26d-47d0-ac91-6c10b406df61",
          "agent": "CHIRIVETA",
          "transaction": "b4678ce5-3a43-451b-831b-eed16f32161c",
          "authority": "0bbf9b63-7d22-4faa-a4bb-0c3e4c682ca2",
          "delegation": "0dd71986-4cc5-401f-bd57-269e9972f245",
          "policy": "export-policy:v1",
          "approval": null,
          "actionDigest": "a22bb6e8882b7cc1164785bc77ad568c9b93caa00c12fdadebf050b0529ffbbc",
          "decision": "DENY",
          "effects": 0,
          "claims": 0,
          "steps": [
            "DETECTION_FIXTURE",
            "RELAY_FIXTURE",
            "CHIRIVETA_ADVISORY",
            "EXISTING_POLICY_GATEWAY",
            "DISPATCH_BOUNDARY",
            "INDEPENDENT_DESTINATION_QUERY"
          ],
          "evidenceDigest": "f3bfdbd55cf198cb2d1573a0c81bce60b1b59f54e95bc18e4c928241a11b629e"
        },
        {
          "scenario": "D",
          "tenant": "09751be3-1ec5-4748-9b32-628027bb583a",
          "actor": "40a88712-6e90-4158-9498-d7a35abf1984",
          "agent": "CHIRIVETA",
          "transaction": "8df1cdb5-bbd1-4bd2-9cd9-8e65a2aee523",
          "authority": "65b88776-02e3-4d44-9e7f-d402e8287bb5",
          "delegation": "adf11d07-e007-47f1-96c0-1f1e015a09ab",
          "policy": "export-policy:v1",
          "approval": "d3334ffc-44aa-40b5-9fd1-e0cb95ec178a",
          "actionDigest": "027744d2a67dd5da3e4aaed630542288a3069f8ee70991e45a1925363108a7dd",
          "decision": "DENY",
          "effects": 0,
          "claims": 0,
          "steps": [
            "DETECTION_FIXTURE",
            "RELAY_FIXTURE",
            "CHIRIVETA_ADVISORY",
            "EXISTING_POLICY_GATEWAY",
            "EXACT_ACTION_HUMAN_APPROVAL",
            "DISPATCH_BOUNDARY",
            "INDEPENDENT_DESTINATION_QUERY"
          ],
          "reason": "AUTHORITY_REVOKED_BEFORE_DISPATCH",
          "evidenceDigest": "a895ddfeff006ea9f13aff7c7ca1accf00e72d001210a2ea5a9297de736e594d"
        },
        {
          "scenario": "E",
          "tenant": "3962b02f-1624-4ac2-a69d-46b3eb0e9a66",
          "actor": "939583ab-5466-4f4a-b047-75072347b1d0",
          "agent": "CHIRIVETA",
          "transaction": "8bf619d4-5f57-4ad6-aa28-b23c8b20ceda",
          "authority": "bf90af6c-fe93-4261-8b35-a8d9a6823267",
          "delegation": "ee10f551-c65f-4e0a-ac51-66cf36a62ca3",
          "policy": "export-policy:v1",
          "approval": "b2083353-8477-4faa-a290-a3d78253cd68",
          "actionDigest": "fddc6a6cd1093c67b3e037ff1dd619161429ca8f188e0d67afbebee63ee2d063",
          "decision": "REVIEW → ALLOW",
          "effects": 1,
          "claims": 1,
          "steps": [
            "DETECTION_FIXTURE",
            "RELAY_FIXTURE",
            "CHIRIVETA_ADVISORY",
            "EXISTING_POLICY_GATEWAY",
            "EXACT_ACTION_HUMAN_APPROVAL",
            "DISPATCH_BOUNDARY",
            "INDEPENDENT_DESTINATION_QUERY"
          ],
          "pendingEffects": 0,
          "wrongTargetEffects": 0,
          "syntheticOnly": true,
          "evidenceDigest": "996218b518c86272bead275f32ad28950a56a04126b4d0e2d628d2542f54a6bb"
        },
        {
          "scenario": "F",
          "tenant": "e0a8f8d8-d8d7-4430-a993-942d1d0ec5d9",
          "actor": "31879970-80c0-4f4e-a3e7-fb59b763919a",
          "agent": "CHIRIVETA",
          "transaction": "0d7835a2-50ff-4e68-a2be-0bc1058dfdd6",
          "authority": "53da6cc4-ac33-4047-937b-ad1b8f47db6f",
          "delegation": "dd0fa50c-ca8e-4cb9-a442-94a76020b53a",
          "policy": "export-policy:v1",
          "approval": "5d5d8c48-9367-412c-b3fd-b78200229c8c",
          "actionDigest": "cdbdf60d18e156efb8146d3b6059cfb457c295061b58ebc444719cdcdfb5b40e",
          "decision": "ALLOW",
          "effects": 1,
          "claims": 1,
          "steps": [
            "DETECTION_FIXTURE",
            "RELAY_FIXTURE",
            "CHIRIVETA_ADVISORY",
            "EXISTING_POLICY_GATEWAY",
            "EXACT_ACTION_HUMAN_APPROVAL",
            "DISPATCH_BOUNDARY",
            "INDEPENDENT_DESTINATION_QUERY"
          ],
          "attempts": 12,
          "evidenceDigest": "989db4af7d5cab160027de6e76180b7fadf605c87e4d21add43f2f943882c791"
        },
        {
          "scenario": "G",
          "tenant": "bc169886-ce01-4ff0-8239-bccdf11601b3",
          "actor": "f681d112-e333-4f18-a051-32abfcf7e5d4",
          "agent": "CHIRIVETA",
          "transaction": "023445fa-1b8b-4366-8de3-943c1d2a2430",
          "authority": "493d6604-c1ce-4ff5-a160-4121f00a26ee",
          "delegation": "59192ac4-dc67-4832-b274-16e72cf91db6",
          "policy": "export-policy:v1",
          "approval": "1d09ccdd-e790-4428-b1ac-bbf43618f58b",
          "actionDigest": "2aac22ec3eb870c31bd7cc2f8a5ef94b5f2057f5d586fd27e3f5c1085be227e8",
          "decision": "UNKNOWN",
          "effects": 1,
          "claims": 1,
          "steps": [
            "DETECTION_FIXTURE",
            "RELAY_FIXTURE",
            "CHIRIVETA_ADVISORY",
            "EXISTING_POLICY_GATEWAY",
            "EXACT_ACTION_HUMAN_APPROVAL",
            "DISPATCH_BOUNDARY",
            "INDEPENDENT_DESTINATION_QUERY"
          ],
          "reconciled": "DESTINATION_EFFECT_OBSERVED",
          "blindRedispatch": false,
          "evidenceDigest": "b3c6458db089f4bd91cae4396833791ece79f49dbd0d7bba070d3a361aeb0cb0"
        },
        {
          "scenario": "ADVERSARIAL",
          "tenant": "e5b9f8d1-b933-440f-b8d5-84ccb43dc469",
          "actor": "3ca23c5e-d469-467c-9453-7b8ef1a071e9",
          "agent": "CHIRIVETA",
          "transaction": "6864e964-396e-4b89-89e7-18efacb45fc0",
          "authority": "c99715a7-ed74-49d4-9d74-c8b86c992fd2",
          "delegation": "c6895d27-7ad0-442c-b7d8-7b450e80adb6",
          "policy": "export-policy:v1",
          "approval": "8884152b-b646-4eb5-b77f-d7a4443432b2",
          "actionDigest": "79f426667a08994827f17bd55f20082ee90fb47291f65778273e94f6a8e28122",
          "decision": "DENY",
          "effects": 0,
          "claims": 0,
          "steps": [
            "DETECTION_FIXTURE",
            "RELAY_FIXTURE",
            "CHIRIVETA_ADVISORY",
            "EXISTING_POLICY_GATEWAY",
            "EXACT_ACTION_HUMAN_APPROVAL",
            "DISPATCH_BOUNDARY",
            "INDEPENDENT_DESTINATION_QUERY"
          ],
          "evidenceDigest": "21c63fcb9da85e67da87c73e4889165a8c4022814bd86e54593b56436b348b00"
        },
        {
          "scenario": "H-ALLOW",
          "tenant": "a0590922-5230-4807-814b-b7485dc9fb36",
          "actor": "75db3b6f-5b63-4dc3-b382-24216ec80879",
          "agent": "CHIRIVETA",
          "transaction": "a38fca09-f744-4bc6-a201-2ade3ef4798b",
          "authority": "79b73e4c-6595-4761-8f2d-725c5268278c",
          "delegation": "38a6d4a5-c01e-49c6-bad7-e7a8bd954672",
          "policy": "export-policy:v1",
          "approval": null,
          "actionDigest": "2e73ecf8f446a8a526f5ae77bee25607c918a5aef3742376202940cde1d25ca3",
          "decision": "ALLOW",
          "effects": 1,
          "claims": 1,
          "steps": [
            "DETECTION_FIXTURE",
            "RELAY_FIXTURE",
            "CHIRIVETA_ADVISORY",
            "EXISTING_POLICY_GATEWAY",
            "DISPATCH_BOUNDARY",
            "INDEPENDENT_DESTINATION_QUERY"
          ],
          "signalTrace": {
            "sourceSha": "202117ae82a48a7f8d536c29d5d700e8fbf11c70",
            "originalEventId": "e69572ed9ed4429da68a66ec278770b9",
            "detectionReference": "synthetic-export-attempt:05a6aab9-3cfc-4d67-9ac6-2817cb5dfa63",
            "warningEvidenceDigest": "62abe6054ee092510173ee7c5d05d79a7f85bed929e97b137491b85bcd5bf070",
            "reviewEvidenceDigest": "65a70771de8ff57bc32558a3cdf00cabeadae1c06c5632f7c755d1c6dedbe695",
            "recommendation": "REQUEST_TEMPORARY_BLOCK",
            "authorityConferred": false,
            "publicKeys": {
              "ALSAMORA": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAWqn+NJmwJPi6lswDBGcWOaokHOh85tsclPbCebBtniY=\n-----END PUBLIC KEY-----\n",
              "VIACAMP": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAvVnD/u49e7ysQ78lnx9YE+ZydC6ZO1w5buxDUQ16gUo=\n-----END PUBLIC KEY-----\n",
              "CHIRIVETA": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAhj9/uCgY6PePoD6dqBETuzWhgnquoolkWpII/E4+NvU=\n-----END PUBLIC KEY-----\n"
            },
            "replayVerified": true,
            "signatureReplayVerified": true,
            "replayTime": 1794226512523,
            "replayHead": "65a70771de8ff57bc32558a3cdf00cabeadae1c06c5632f7c755d1c6dedbe695",
            "registryAnchor": "66c8c4d24411230bcba79437316b76e80a36f85af15bba55120fece5b27f1a4d",
            "replayExportScope": "WARNING_REVIEW_SUFFIX; full registry Replay verified and retained locally",
            "events": [
              {
                "sequence": 7,
                "tenantId": "a0590922-5230-4807-814b-b7485dc9fb36",
                "kind": "WATCHTOWER_WARNING",
                "actorId": "CHIRIVETA",
                "subjectId": "e69572ed9ed4429da68a66ec278770b9",
                "at": 1794226512642,
                "previousHash": "66c8c4d24411230bcba79437316b76e80a36f85af15bba55120fece5b27f1a4d",
                "details": {
                  "eventId": "e69572ed9ed4429da68a66ec278770b9",
                  "source": "ALSAMORA",
                  "swarm": "swarm:river-fixture",
                  "accepted": true,
                  "investigationOpened": true,
                  "reason": "INVESTIGATION_OPENED",
                  "authorityConferred": false,
                  "envelopeDigest": "a0654f3d50e9dbf3c5da94862545f49f6f37f3a6d425a81baf0b871a239353ab",
                  "envelope": {
                    "warning": {
                      "eventId": "e69572ed9ed4429da68a66ec278770b9",
                      "source": "ALSAMORA",
                      "kind": "SYNTHETIC_EXPORT_WARNING",
                      "route": "synthetic:customer-export",
                      "authorityConferred": false,
                      "detectionReference": "synthetic-export-attempt:05a6aab9-3cfc-4d67-9ac6-2817cb5dfa63"
                    },
                    "origin": {
                      "claims": {
                        "domain": "cyber-sentinels:agent-message:v1",
                        "tenantId": "a0590922-5230-4807-814b-b7485dc9fb36",
                        "swarmId": "swarm:river-fixture",
                        "senderId": "ALSAMORA",
                        "recipientId": "CHIRIVETA",
                        "audience": "tenente:watchtower:warning:v1",
                        "credentialVersion": 2,
                        "nonce": "e69572ed9ed4429da68a66ec278770b9",
                        "issuedAt": 1794226512523,
                        "expiresAt": 1794226542523,
                        "payloadDigest": "9199f8471dca3bb3d62b6c6f19b6bb52506dd29b6258edb605da2bff8d75579c"
                      },
                      "signature": "KiNY-2aH3Zc8KKFjBRkJhyQQh53W-5BBgJQzgQSwF_n--rHQrOfmMPbqd60vJDUhA2fNTDHzL0L5JTmPUIjrCg"
                    },
                    "relays": [
                      {
                        "claims": {
                          "domain": "cyber-sentinels:agent-message:v1",
                          "tenantId": "a0590922-5230-4807-814b-b7485dc9fb36",
                          "swarmId": "swarm:river-fixture",
                          "senderId": "VIACAMP",
                          "recipientId": "CHIRIVETA",
                          "audience": "tenente:watchtower:warning:v1",
                          "credentialVersion": 2,
                          "nonce": "6037d5c2696341aba7f33d06e5f62be7",
                          "issuedAt": 1794226512523,
                          "expiresAt": 1794226542523,
                          "payloadDigest": "816e0e65f49e834aecea07177780ba4f3e5610e1e0d6553a1720a15d14368a2b"
                        },
                        "signature": "zhIrRvUaKa6eYz-BgekEsBUBl01IEzoMyGCI1byP-eF9yl3uMbzY13M4MyHY6J-C6QhJLW_OEyP2J_BqcdrxBg"
                      }
                    ]
                  }
                },
                "digest": "62abe6054ee092510173ee7c5d05d79a7f85bed929e97b137491b85bcd5bf070"
              },
              {
                "sequence": 8,
                "tenantId": "a0590922-5230-4807-814b-b7485dc9fb36",
                "kind": "CHIRIVETA_REVIEW",
                "actorId": "CHIRIVETA",
                "subjectId": "e69572ed9ed4429da68a66ec278770b9",
                "at": 1794226512668,
                "previousHash": "62abe6054ee092510173ee7c5d05d79a7f85bed929e97b137491b85bcd5bf070",
                "details": {
                  "warningEvidenceDigest": "62abe6054ee092510173ee7c5d05d79a7f85bed929e97b137491b85bcd5bf070",
                  "proposal": {
                    "kind": "TEMPORARY_BLOCK",
                    "target": "synthetic:customer-export",
                    "durationSeconds": 300,
                    "corroboratingEvidenceRefs": [
                      "synthetic-export-attempt:05a6aab9-3cfc-4d67-9ac6-2817cb5dfa63",
                      "fixture:runtime-observation:a38fca09-f744-4bc6-a201-2ade3ef4798b"
                    ]
                  },
                  "recommendation": "REQUEST_TEMPORARY_BLOCK",
                  "reason": "BOUNDED_REVERSIBLE_REQUEST_ONLY",
                  "authorityConferred": false,
                  "requiresGateway": true,
                  "requiresIndependentHumanApproval": false,
                  "aiModelUsed": false
                },
                "digest": "65a70771de8ff57bc32558a3cdf00cabeadae1c06c5632f7c755d1c6dedbe695"
              }
            ]
          },
          "boundDecisionDigest": "5aab1e791cc535e1538e271384fa5af4248a7335124d45a78649040a5f9e48df",
          "exportBefore": 200,
          "exportAfter": 423,
          "authentication": "Synthetic enrolled human/agent fixtures; no hosted Auth claim",
          "evidenceDigest": "fd243a1072578eff6590fa99c752a1522477f438228d20001c858d4cdec71a78"
        },
        {
          "scenario": "H-DENY",
          "tenant": "f85b8761-e499-4063-a596-82b016a785e6",
          "actor": "9fb1df43-d4ed-45c1-bda5-5f9dd30a8eb3",
          "agent": "CHIRIVETA",
          "transaction": "1b2944b2-9391-417b-bc21-c47f44b74c8c",
          "authority": "4c9a67f1-8c09-42b4-8d86-41f3e83d2fe7",
          "delegation": "573de6b3-c3ce-4826-ae62-7074005da403",
          "policy": "export-policy:v1",
          "approval": null,
          "actionDigest": "c141d783b7ddd3b93144bdc58ee49c5443683948544db30a83a193f5e08fc353",
          "decision": "DENY",
          "effects": 0,
          "claims": 0,
          "steps": [
            "DETECTION_FIXTURE",
            "RELAY_FIXTURE",
            "CHIRIVETA_ADVISORY",
            "EXISTING_POLICY_GATEWAY",
            "DISPATCH_BOUNDARY",
            "INDEPENDENT_DESTINATION_QUERY"
          ],
          "signalTrace": {
            "sourceSha": "202117ae82a48a7f8d536c29d5d700e8fbf11c70",
            "originalEventId": "b8c74447f7644069b87a522c1420d9db",
            "detectionReference": "synthetic-export-attempt:681b6b6e-0d06-4c8d-998d-5ecc6c734e60",
            "warningEvidenceDigest": "a4d65cd3bc81053493445f82f5fe32fe0c522713bb4e48de0e3752a8a54d88dd",
            "reviewEvidenceDigest": "938334a210274513e33fcdac4adbbc481dd9f7780b0c4722e8aa9f12c57f5421",
            "recommendation": "REQUEST_TEMPORARY_BLOCK",
            "authorityConferred": false,
            "publicKeys": {
              "ALSAMORA": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAbQHV8ia8aJ9nYJACI+Y6vwYo/vJpA97aYsOp2dMy4lw=\n-----END PUBLIC KEY-----\n",
              "VIACAMP": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA1zYwG+evfhozjfYMqZZD0gfVX/dNfEYlVMIg8/dd9i8=\n-----END PUBLIC KEY-----\n",
              "CHIRIVETA": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA5tL0AKP9Shvq5h3XZR0lDnxOxIDrrQhzZjPYmJU6cUA=\n-----END PUBLIC KEY-----\n"
            },
            "replayVerified": true,
            "signatureReplayVerified": true,
            "replayTime": 1794226512942,
            "replayHead": "938334a210274513e33fcdac4adbbc481dd9f7780b0c4722e8aa9f12c57f5421",
            "registryAnchor": "da7654256c853f8861b2822019a0d9f640b00baac4f3db7019263a7dab45c06a",
            "replayExportScope": "WARNING_REVIEW_SUFFIX; full registry Replay verified and retained locally",
            "events": [
              {
                "sequence": 7,
                "tenantId": "f85b8761-e499-4063-a596-82b016a785e6",
                "kind": "WATCHTOWER_WARNING",
                "actorId": "CHIRIVETA",
                "subjectId": "b8c74447f7644069b87a522c1420d9db",
                "at": 1794226513042,
                "previousHash": "da7654256c853f8861b2822019a0d9f640b00baac4f3db7019263a7dab45c06a",
                "details": {
                  "eventId": "b8c74447f7644069b87a522c1420d9db",
                  "source": "ALSAMORA",
                  "swarm": "swarm:river-fixture",
                  "accepted": true,
                  "investigationOpened": true,
                  "reason": "INVESTIGATION_OPENED",
                  "authorityConferred": false,
                  "envelopeDigest": "df1b82c5fafca9482dee8637ac48649f438fb3b898ce987715bc0955848efff8",
                  "envelope": {
                    "warning": {
                      "eventId": "b8c74447f7644069b87a522c1420d9db",
                      "source": "ALSAMORA",
                      "kind": "SYNTHETIC_EXPORT_WARNING",
                      "route": "synthetic:customer-export",
                      "authorityConferred": false,
                      "detectionReference": "synthetic-export-attempt:681b6b6e-0d06-4c8d-998d-5ecc6c734e60"
                    },
                    "origin": {
                      "claims": {
                        "domain": "cyber-sentinels:agent-message:v1",
                        "tenantId": "f85b8761-e499-4063-a596-82b016a785e6",
                        "swarmId": "swarm:river-fixture",
                        "senderId": "ALSAMORA",
                        "recipientId": "CHIRIVETA",
                        "audience": "tenente:watchtower:warning:v1",
                        "credentialVersion": 2,
                        "nonce": "b8c74447f7644069b87a522c1420d9db",
                        "issuedAt": 1794226512942,
                        "expiresAt": 1794226542942,
                        "payloadDigest": "cac0c5babcae8a3d7378a717c3b4db1271e3083f587ca879b8c90f2fedd62d20"
                      },
                      "signature": "pFYOJJhUU71Prk4NNmsWAjS9kww12o6GBg3UDm9Nsqp3F-hwXfAbdQh2VY_l3PPORzFv0esk_9GJFVvxImNSDA"
                    },
                    "relays": [
                      {
                        "claims": {
                          "domain": "cyber-sentinels:agent-message:v1",
                          "tenantId": "f85b8761-e499-4063-a596-82b016a785e6",
                          "swarmId": "swarm:river-fixture",
                          "senderId": "VIACAMP",
                          "recipientId": "CHIRIVETA",
                          "audience": "tenente:watchtower:warning:v1",
                          "credentialVersion": 2,
                          "nonce": "07c24069dfcd4bbbab8d968f3f9a9a25",
                          "issuedAt": 1794226512942,
                          "expiresAt": 1794226542942,
                          "payloadDigest": "4ce8107a797822f29da6e9de209313b40064faeee04712ae1db00d24c434f42b"
                        },
                        "signature": "GbXUsvQX6YiNZT6q9akiIK1qZZciaaoJoTD7wdG8erga99Pi8WwaDdKEcVMFSlGd2WB0Q-WxtPZ1yveNSvuXBA"
                      }
                    ]
                  }
                },
                "digest": "a4d65cd3bc81053493445f82f5fe32fe0c522713bb4e48de0e3752a8a54d88dd"
              },
              {
                "sequence": 8,
                "tenantId": "f85b8761-e499-4063-a596-82b016a785e6",
                "kind": "CHIRIVETA_REVIEW",
                "actorId": "CHIRIVETA",
                "subjectId": "b8c74447f7644069b87a522c1420d9db",
                "at": 1794226513066,
                "previousHash": "a4d65cd3bc81053493445f82f5fe32fe0c522713bb4e48de0e3752a8a54d88dd",
                "details": {
                  "warningEvidenceDigest": "a4d65cd3bc81053493445f82f5fe32fe0c522713bb4e48de0e3752a8a54d88dd",
                  "proposal": {
                    "kind": "TEMPORARY_BLOCK",
                    "target": "synthetic:customer-export",
                    "durationSeconds": 300,
                    "corroboratingEvidenceRefs": [
                      "synthetic-export-attempt:681b6b6e-0d06-4c8d-998d-5ecc6c734e60",
                      "fixture:runtime-observation:1b2944b2-9391-417b-bc21-c47f44b74c8c"
                    ]
                  },
                  "recommendation": "REQUEST_TEMPORARY_BLOCK",
                  "reason": "BOUNDED_REVERSIBLE_REQUEST_ONLY",
                  "authorityConferred": false,
                  "requiresGateway": true,
                  "requiresIndependentHumanApproval": false,
                  "aiModelUsed": false
                },
                "digest": "938334a210274513e33fcdac4adbbc481dd9f7780b0c4722e8aa9f12c57f5421"
              }
            ]
          },
          "boundDecisionDigest": "216d5c485ab415dfef0a7104b617912c381f77e695f4b13ec9262ae53c04a6a2",
          "exportBefore": 200,
          "exportAfter": 200,
          "authentication": "Synthetic enrolled human/agent fixtures; no hosted Auth claim",
          "evidenceDigest": "27fdc4ad466055157285759cbb0a98756ae896a1a31447b4992c747a24560988"
        }
      ]
    },
    "signature": "wz_7zNHtDJKL8X2EMZRGOGqL_QWePNbHzigI0nGspMmcwAI2wHYHLA9LbZ4aZBCGrtEcMlXHMi4oU58yW4OOCg",
    "publicKey": "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAtcFi0sw/SvF3xEAHcZiUZz5zfQQ+G3i/vzMdrlD129s=\n-----END PUBLIC KEY-----\n",
    "trustAnchor": "Ephemeral local test key; not a Production identity assertion"
  }
} as const;
