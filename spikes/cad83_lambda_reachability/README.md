# CAD-83 spike: do COROS and Speediance accept calls from AWS Lambda?

Throwaway. This folder proves (or disproves) that the unofficial COROS and
Speediance APIs work from AWS data-centre IPs, before we build the nightly job on
Lambda. It is **not** the real handler: nothing in `backend/` uses it. Delete the
AWS resources when you're done (see [Teardown](#teardown)).

The Lambda:

1. Logs in to COROS (web login only, so your phone app should stay logged in) and
   reads today's schedule (Melbourne date).
2. Runs `speediance-cli login` from a bundled linux/arm64 binary, with its token
   cache in `/tmp/speediance/token.json`.
3. Returns and logs one JSON line: the public IP it called from, then for each
   service `ok`, where it failed (`stage`), the error type/message (with every
   credential replaced by `***`) and how long it took. No schedule contents, no
   tokens.

We run it in **both** candidate regions, Sydney (`ap-southeast-2`) and Melbourne
(`ap-southeast-4`), because the region is still an open question.

> **Heads-up:** a login from a new IP may trigger a security email from COROS or
> Speediance, or end an existing web session. Note anything like that in the
> results table.

## Prerequisites

- AWS CLI with a profile that can create IAM roles, Lambda, Secrets Manager and
  CloudWatch Logs (`export AWS_PROFILE=...`).
- Terraform ≥ 1.5.
- Python 3.12 with `pip`, plus `zip` and `file`.
- A **linux/arm64** build of `speediance-cli` saved as `bin/speediance-cli` in this
  folder. Get it as described on the Notion page *Speediance GM2 Integration —
  Technical Findings*. `bin/` is gitignored.
- From the same page, check how `speediance-cli login` takes credentials. The
  Lambda passes them as `SPEEDIANCE_EMAIL` and `SPEEDIANCE_PASSWORD` environment
  variables and runs `speediance-cli login`. If it needs different arguments, set
  the `SPEEDIANCE_ARGS` environment variable on the function (for example
  `login --non-interactive`). If it only works interactively (asks for input),
  that is a spike finding in itself: record it.

## 1. Build the package

```sh
cd spikes/cad83_lambda_reachability
./build.sh
```

This makes `build/spike.zip`: the handler, coros-mcp (pinned commit), the arm64
wheels it needs and the Speediance binary. It stops with a clear error if the
binary is missing or isn't arm64, or if the zip is over 50 MB.

- **Zip over 50 MB?** Upload it to an S3 bucket and point the function at it
  (replace `filename` with `s3_bucket`/`s3_key` in `main.tf`), or trim the package.
- **A wheel won't install/build?** Build inside the Lambda build image instead:
  `docker run --rm -v "$PWD":/work -w /work public.ecr.aws/sam/build-python3.12:latest-arm64 ./build.sh`.

## 2. Deploy (Sydney first)

```sh
terraform init
terraform workspace new ap-southeast-2
terraform apply -var region=ap-southeast-2
```

Each region gets its own Terraform workspace, which means its own local state file.

## 3. Put the credentials in the secret

Create `creds.json` **outside the repo** (for example `~/cad83-creds.json`) in an
editor, not with `echo`, so passwords don't land in your shell history:

```json
{
  "COROS_EMAIL": "...",
  "COROS_PASSWORD": "...",
  "SPEEDIANCE_EMAIL": "...",
  "SPEEDIANCE_PASSWORD": "..."
}
```

```sh
aws secretsmanager put-secret-value --region ap-southeast-2 \
  --secret-id "$(terraform output -raw secret_id)" \
  --secret-string file://$HOME/cad83-creds.json
```

Keep the file until you've done both regions, then delete it.

## 4. Invoke and read the result

```sh
aws lambda invoke --region ap-southeast-2 \
  --function-name "$(terraform output -raw function_name)" \
  --cli-read-timeout 200 out.json
cat out.json
```

The same JSON line is in CloudWatch Logs under `/aws/lambda/<function name>`.
To re-run one check only, pass a payload:

```sh
aws lambda invoke --region ap-southeast-2 \
  --function-name "$(terraform output -raw function_name)" \
  --cli-binary-format raw-in-base64-out \
  --payload '{"only": "coros"}' out.json   # or "speediance"
```

Reading the result:

- `coros.ok: true` → login and schedule read both worked.
- `coros.stage: "login"` with an HTTP status or a message about captcha,
  verification or "access denied" → probably **blocked**. A message about a wrong
  password means the credentials are wrong, not a block.
- `coros.stage: "import"` with `ImportError` / `ModuleNotFoundError` → the package
  is missing a module. Add it to `requirements.txt`, rebuild, `terraform apply`
  again.
- `speediance.ok: true` → the binary exited 0. Otherwise read `returncode` and
  `stderr_tail`. `error_type: "FileNotFoundError"` or `PermissionError` means the
  binary wasn't bundled or isn't executable; `TimeoutExpired` means it hung
  (possibly waiting for input).

**Then check your phone:** open the COROS app and confirm you're still logged in.
Record it in the table (this confirms the web-only login didn't log the app out).

## 5. Repeat for Melbourne

```sh
terraform workspace new ap-southeast-4
terraform apply -var region=ap-southeast-4
```

Then steps 3 and 4 again with `--region ap-southeast-4`. (Melbourne is an opt-in
region: enable it on the account first if `apply` says it's not available.)

## 6. Record the results on CAD-83

Paste this table into the card, one row per region:

| Region | Egress IP | COROS login | COROS schedule | Speediance exit code | Errors (type / message) | COROS app still logged in? | Security emails / logouts noticed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ap-southeast-2 | | | | | | | |
| ap-southeast-4 | | | | | | | |

## If it's blocked

Stop. Don't continue with Lambda-based cards. Raise it on the board with the
results table, so the runtime decision can be revisited. The fallback is running
the nightly job on the Pi.

## CAD-94 follow-up: write, contents and 7 nightly runs (Sydney only)

CAD-94 adds three modes to the same Lambda, picked with `{"mode": ...}` in the
payload. With no `mode` it still runs the CAD-83 check above.

| Mode | Run by | Does | Logs to CloudWatch |
| --- | --- | --- | --- |
| `write` | you, once | adds one COROS run `CADENCE TEST – delete me` 14 days ahead, reads back, removes every copy, reads back | counts only |
| `contents` | you, once | next 7 days of COROS + last 7 days of Speediance, **in the response only** | ok / stage / error type / timing only |
| `nightly` | the schedule, 7 nights | logs in to both and reads, no writes | ok / stage / error type / timing only |

Speediance is only ever asked to `login` or list `workouts`. Nothing is pushed
(there's no delete, and Speediance work is on hold pending ADR-007). The new modes
ignore `SPEEDIANCE_ARGS`.

### 1. Build and deploy Sydney with the schedule

Build as in step 1 above, then pick the dates. The schedule fires at 22:00
Melbourne time; the dates are in UTC. Set the start to before the first night and
the end to about an hour after the 7th run. 22:00 Melbourne is 12:00Z before
daylight saving starts (Sunday 4 October 2026) and 11:00Z after it.

```sh
cd spikes/cad83_lambda_reachability
terraform workspace select ap-southeast-2 || terraform workspace new ap-southeast-2
terraform apply -var region=ap-southeast-2 \
  -var nightly_enabled=true \
  -var nightly_start_date=2026-10-02T00:00:00Z \
  -var nightly_end_date=2026-10-08T12:30:00Z   # 7 runs: 2–8 October
```

Then put the credentials in the secret (step 3 above) if this is a fresh deploy.
The function never retries a failed run, so each night gives exactly one result.

### 2. Write test (once, by hand)

```sh
aws lambda invoke --region ap-southeast-2 \
  --function-name "$(terraform output -raw function_name)" \
  --cli-binary-format raw-in-base64-out --cli-read-timeout 200 \
  --payload '{"mode":"write"}' out.json
cat out.json
```

Reading `coros` in the result:

- `ok: true` → added exactly once, removed, and the other entries on that day
  are unchanged.
- `leftovers_removed` → test copies left over from an earlier attempt, removed
  before adding.
- `copies_after_add` / `duplicate: true` → how many copies one add call made.
  **More than 1 is the known "two entries" bug: record it.**
- `returned_id_matched` → whether the id COROS returned for the add is one of the
  copies found (diagnostic only; removal goes by the test name).
- `removed`, `remove_returned_none` (should be `true`), `copies_after_remove`
  (should be 0).
- `other_entries_before` / `other_entries_after` → other workouts on the test day;
  they must be equal. Only entries named exactly `CADENCE TEST – delete me` on
  that day are ever removed.
- `failed_stage` + `error_type` → where it broke. Cleanup still runs after any
  failure past login; `cleanup_failed_stage` means cleanup itself failed, so
  **delete the test run by hand in the COROS app**.

Then open the COROS app and check the test day (`day` in the result) shows no
test entry.

### 3. Contents check (once, by hand)

```sh
aws lambda invoke --region ap-southeast-2 \
  --function-name "$(terraform output -raw function_name)" \
  --cli-binary-format raw-in-base64-out --cli-read-timeout 200 \
  --payload '{"mode":"contents"}' out.json
cat out.json
```

`coros.next_7_days` lists date, name and planned minutes; `speediance.last_7_days`
lists date, name and minutes. Paste it into the chat to compare with your apps,
then delete it: `rm out.json`. Don't paste it onto the card.

Caveat: speediance-cli was written for a different Speediance model. If the GM2
list is empty or looks wrong, that's a finding, not a bug in this spike.

### 4. Collect the 7 nightly results

After the 7th night (logs are kept for 14 days):

```sh
aws logs filter-log-events --region ap-southeast-2 \
  --log-group-name "/aws/lambda/$(terraform output -raw function_name)" \
  --filter-pattern '{ $.mode = "nightly" }' \
  --query 'events[].message' --output text
```

Each line has `date`, then for `coros` and `speediance`: `ok`, `stage`,
`error_type` (only on failure; `exit_2` from Speediance means an auth failure) and
`duration_ms`. A missing night means the schedule didn't fire or the run timed
out: check `aws logs filter-log-events ... --filter-pattern 'REPORT'` for that date.

Record on CAD-94:

| Night (Melbourne) | COROS ok | COROS stage / error | COROS ms | Speediance ok | Speediance stage / error | Speediance ms |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |

Plus the write test counts, whether the contents matched your apps, and whether
the COROS phone app stayed logged in all week.

### 5. Tear down

Use the same variables you deployed with, then the checks in
[Teardown](#teardown) below:

```sh
terraform workspace select ap-southeast-2
terraform destroy -var region=ap-southeast-2 \
  -var nightly_enabled=true \
  -var nightly_start_date=2026-10-02T00:00:00Z \
  -var nightly_end_date=2026-10-08T12:30:00Z
```

## Teardown

Each region has its own local state, so destroy **once per region**:

```sh
terraform workspace select ap-southeast-2
terraform destroy -var region=ap-southeast-2
terraform workspace select ap-southeast-4
terraform destroy -var region=ap-southeast-4
```

Check nothing is left, in **each** region (both should print empty lists):

```sh
for r in ap-southeast-2 ap-southeast-4; do
  aws resourcegroupstaggingapi get-resources --region "$r" \
    --tag-filters Key=purpose,Values=cad-83-spike \
    --query 'ResourceTagMappingList[].ResourceARN'
  aws secretsmanager list-secrets --region "$r" \
    --filters Key=name,Values=cadence-spike-cad83 --query 'SecretList[].Name'
  aws scheduler list-schedules --region "$r" \
    --name-prefix cadence-spike --query 'Schedules[].Name'
done
```

(The IAM roles, including the CAD-94 `...-scheduler` role, are global; check with
`aws iam list-roles --query "Roles[?starts_with(RoleName, 'cadence-spike-cad83')].RoleName"`.)

Finally clean up locally:

```sh
rm -rf .terraform .terraform.lock.hcl terraform.tfstate* terraform.tfstate.d \
  build package wheels out.json
rm ~/cad83-creds.json
```
