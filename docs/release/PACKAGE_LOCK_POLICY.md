# Package-lock policy

- `package-lock.json` is mandatory and uses lockfile version 3.
- Dependency changes are made with npm 10.9.8 under Node 22.23.1; supported runtime range remains Node 22.x.
- `packageManager` pins the npm release. `.nvmrc` and `.node-version` pin the tested Node minor.
- CI installs with `npm ci`; `npm install` is not a release-verification substitute.
- Never hand-resolve conflict markers, copy a stale Dependabot lockfile, or run `npm audit fix`.
- Preserve valid optional-platform metadata. npm-on-Windows removal of Linux `libc` selectors is unrelated churn and must not be accepted.
- Reject unexplained transitive churn. Record intentional transitive changes and dependency paths.
- Group package changes by compatibility boundary: React runtime/types, CSS tooling, security actions, or payments.
- Run `npm ls --all`, audit inspection, SBOM generation and two clean install/build cycles before owner review.
- The lockfile must remain byte-unchanged across clean `npm ci` cycles.
