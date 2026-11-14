# Good and Bad Tests

## Good Tests

**Integration-style**: Test through real interfaces, not mocks of internal parts.

```python
# GOOD: tests observable behavior
def test_macro_light_is_green_when_hyg_closes_above_its_sma100():
    closes = [80.0] * 100 + [85.0]
    assert macro_light(closes) is True
```

Characteristics:

- Tests behavior callers care about
- Uses the public function only
- Survives internal refactors
- Describes WHAT, not HOW
- One logical assertion per test

## Bad Tests

**Implementation-detail tests**: Coupled to internal structure.

```python
# BAD: tests implementation details
def test_screener_calls_rolling_mean(mocker):
    spy = mocker.spy(pd.Series, "rolling")
    run_screener(prices)
    spy.assert_called_with(50)
```

Red flags:

- Mocking internal collaborators
- Testing private (`_underscore`) helpers
- Asserting on call counts/order
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Verifying through external means instead of the interface

```python
# BAD: bypasses the interface to verify
def test_screener_writes_json(tmp_path):
    run_screener(prices, out=tmp_path / "out.json")
    raw = (tmp_path / "out.json").read_text()
    assert '"AMD"' in raw

# GOOD: verifies through the interface
def test_screener_keeps_tickers_above_sma50():
    result = screen(prices_where_only_amd_is_above_sma50)
    assert [r["ticker"] for r in result] == ["AMD"]
```

**Tautological tests**: Expected value restates the implementation, so the test passes by construction.

```python
# BAD: expected value is recomputed the way the code computes it
def test_sma():
    closes = [10, 11, 12]
    assert sma(closes, 3) == sum(closes) / len(closes)

# GOOD: expected value is an independent, known literal
def test_sma():
    assert sma([10, 11, 12], 3) == 11
```
