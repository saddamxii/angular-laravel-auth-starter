# Backend diagnostic stages

The backend CI must run `diagnose-backend.sh` before PHPUnit. The diagnostic is deliberately fail-fast and prints a numbered stage, command, exit code, and exception/trace when a prerequisite fails.

A failure before PHPUnit is a **pre-test failure**, not a test failure. PHPUnit must only start after the diagnostic precheck passes.

No diagnostic command may suppress errors with `|| true` or convert a non-zero exit status into success.
