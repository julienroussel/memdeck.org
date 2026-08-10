---
paths:
  - "package.json"
  - "pnpm-workspace.yaml"
  - "lefthook.yml"
---

# Git hooks and lefthook

This machine sets `core.hooksPath` globally to `~/.config/git/hooks`, a dispatcher (`_dispatch`)
that strips Claude attribution trailers on `commit-msg` and then chains to each repo's own
`.git/hooks/<name>`. Two consequences shape how lefthook is wired here.

## `prepare` hides the global git config from lefthook

```json
"prepare": "GIT_CONFIG_GLOBAL=/dev/null lefthook install"
```

Lefthook refuses to install when `core.hooksPath` is set, and rightly so: it would write this
repo's hooks into a directory every repo on the machine shares. Without the env var, `pnpm install`
dies at `prepare` with `[ELIFECYCLE] Command failed with exit code 1`, which is how this surfaced
(usually via `ncu -u -i`).

`GIT_CONFIG_GLOBAL=/dev/null` makes `core.hooksPath` invisible for that one process, so hooks land
in `.git/hooks`, which is exactly where the dispatcher looks for them. It does not persist and does
not affect hook execution afterwards. Don't strip the prefix.

## `allowBuilds: lefthook: false` is deliberate

The `lefthook` npm package's own `postinstall.js` runs `lefthook install -f`. That `--force` targets
`~/.config/git/hooks`, so it would overwrite the dispatcher symlinks with this repo's hook stubs and
break git hooks in every repo on the machine. Setting it `false` stops pnpm running that postinstall;
`prepare` installs the hooks instead. `false` counts as reviewed-and-blocked, so `strictDepBuilds`
stays satisfied.

## Never run these

- `lefthook install --force` writes into the shared global hooks dir.
- `lefthook install --reset-hooks-path` unsets the global `core.hooksPath`, disabling the dispatcher
  machine-wide.

Both are suggested by lefthook's own error message. Both are wrong here.

## Checking the hooks actually work

`lefthook check-install` returned 0 both before and after this fix, including while
`lefthook install` was refusing outright, so it did not discriminate here. Check the content and
mtime of `.git/hooks/pre-commit` instead: it should be the lefthook stub ending in
`call_lefthook run "pre-commit"`.

To exercise the whole chain without making a commit, use git's own hook runner:

```sh
git hook run pre-commit
```

That goes through `core.hooksPath` and the dispatcher exactly as a commit would, and prints
lefthook's summary. With nothing staged every job reports `(skip) no matching staged files`, which
still proves the chain fired.

## CI

`build.yml` runs `pnpm install --frozen-lockfile` without `--ignore-scripts`, so `prepare` runs
there too. That is fine: a runner has no `~/.gitconfig` and no `core.hooksPath`, so
`GIT_CONFIG_GLOBAL=/dev/null` hides nothing and lefthook installs into `.git/hooks` as it always
did. Git treats `/dev/null` as an empty config file rather than an error.
