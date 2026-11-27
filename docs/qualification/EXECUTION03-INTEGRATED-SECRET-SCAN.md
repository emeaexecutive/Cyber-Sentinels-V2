# Integrated rehearsal scanner finding

PR142 source39e2a84 flagged one generic-api-key record: `a9bffc15e6889e874a9f58fb523965fc45260e5c:tools/qualification/execution03-database-rehearsal.mjs:generic-api-key:63`.

This is the intentionally incorrect password passed only to the isolated restored database's negative authentication probe. The test requires rejection. The actual cluster password is independently randomized and read from an ignored private file; the flagged literal is never an issued credential. No rotation or history rewriting is indicated. Only this exact historical fingerprint is excepted; rules and workflow remain unchanged.
