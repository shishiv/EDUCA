# Password recovery

The recovery request at `/reset-password` sends the user to `/reset-password/complete`. Open the email link in the same browser profile that requested it. PKCE requires that profile's verifier. A different browser, an expired link or a reused link shows a new-request action instead of accepting an existing login session as recovery.

The completion form validates confirmation and the shared first-access password constraints. Supabase Auth remains responsible for accepting the password and rejecting reuse of the previous password. Successful recovery ends the local recovery session and returns the user to normal login. It does not ask for the previous password or change application roles, profiles or school membership.

## SDK ownership

`app/lib/supabase.ts` captures callback intent before creating the singleton browser client. `app/lib/password-recovery.ts` waits for that client's initialization, requires successful code consumption, and verifies the resulting user. The SDK owns the only code exchange. Recovery readiness is document-local and is forgotten after completion or a session identity change.

The installed contract matters:

- `@supabase/ssr@0.7.0` forces automatic URL detection in `createBrowserClient`. Supplying `detectSessionInUrl: false` there does not disable it.
- `@supabase/auth-js@2.90.1` consumes PKCE in `_getSessionFromURL`, removes the code on success, and returns a null redirect type. The automatic path emits `SIGNED_IN`, not `PASSWORD_RECOVERY`.
- If the profile has no verifier, initialization can recover an unrelated existing session without consuming the code. That is not a valid recovery result.
- Auth notifications hold the Auth lock. The completion subscriber only updates local state. Existing profile synchronization in `app/contexts/auth-context.tsx` stays deferred until after the callback returns.

Do not add a second `exchangeCodeForSession` call to the completion page, infer recovery from `getSession` alone, or change dependency versions to avoid these contracts.

## Run the local rehearsal

Run from `app/`. Prerequisites are native `/usr/bin/node` 26, pnpm 9, Docker, PostgreSQL's `psql`, `/usr/bin/chromium`, `chrome-devtools-axi` and an already installed `chrome-devtools-mcp`. Set `CHROME_DEVTOOLS_AXI_MCP_PATH` to the installed MCP JavaScript entrypoint. The runner refuses an unset path rather than allowing AXI to download a package.

```bash
pnpm test:e2e:password-recovery
F03_MODE=production F03_BUILD=true pnpm test:e2e:password-recovery
```

The first command uses development mode, including React Strict Mode. The second builds and serves the production artifact locally. `CIRCLE_NODE_TOTAL=2` selects one build worker in the installed Next version, whose calculation subtracts one from that setting. Browser actions always run serially with one worker across two isolated profiles.

The runner creates a disposable project in this worktree, remaps ports, applies canonical migrations and the synthetic pilot gate, then seeds synthetic identities. Its callback allowlist includes the exact local `/reset-password/complete` URL. Auth's SMTP target is the project's own catcher container, with `.invalid` sender and recipients. The SMTP username and password must be nonempty synthetic values because the CLI rejects empty values. No external SMTP, remote Auth, deployment or hosted CI is involved.

The browser scenarios cover a valid email link, invalid and expired tokens, reused email and PKCE callbacks, password strength and confirmation, previous-password rejection, new-password login, ordinary login, client-history replay, and isolation from another authenticated browser profile. The wrong-profile test presents a real callback code without the requesting verifier, then proves that the requester can still complete it. Expiration backdates only one synthetic account's `recovery_sent_at`, without reading its token.

Receipts and screenshots are written to ignored `.pilot-evidence/`. Browser scripts, email bodies, cookies and SDK credentials stay in the disposable project or process memory. Cleanup stops the test and application process groups, the task's AXI bridges and the isolated Supabase project, verifies resource removal through the existing cleanup helper, then removes temporary profiles and releases the port lease. A cleanup failure makes the command fail.

## Causal negative control

In an isolated worktree, temporarily move `app/app/reset-password/complete/page.tsx` outside the App Router and run the same rehearsal with `F03_MODE=causal`. The valid-link assertion must fail because no new-password form exists. Restore the file before the positive run. Do not treat another failure, setup failure or timeout as this causal result.

No remote callback allowlist or SMTP configuration is changed by this patch. Any separately authorized deployment must configure its own exact completion URL. Current evidence is local and synthetic only. See the [2026-09-17 recovery receipts](../artifacts/password-recovery/README.md).
