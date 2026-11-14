# When to Mock

Mock at **system boundaries** only:

- External APIs (market data such as yfinance, Google Places, Supabase…)
- Databases (sometimes - prefer a test DB)
- Time/randomness ("today", earnings dates)
- File system (sometimes - prefer `tmp_path`)

Don't mock:

- Your own modules and functions
- Internal collaborators
- Anything you control

## Designing for Mockability

At system boundaries, design interfaces that are easy to replace in tests.

**1. Use dependency injection**

Pass external dependencies in rather than creating them internally:

```python
# Easy to test: prices and today are inputs
def screen(prices: dict[str, list[float]], today: date) -> list[dict]:
    ...

# Hard to test: fetches and reads the clock internally
def screen() -> list[dict]:
    prices = yf.download(TICKERS)
    today = date.today()
    ...
```

**2. Prefer SDK-style interfaces over generic fetchers**

One function per external operation instead of one generic function with conditional logic:

```python
# GOOD: each function is independently replaceable
def fetch_closes(ticker: str) -> list[float]: ...
def fetch_next_earnings(ticker: str) -> date | None: ...

# BAD: the fake needs conditional logic to know what to return
def fetch(kind: str, ticker: str): ...
```

The SDK approach means:
- Each fake returns one specific shape
- No conditional logic in test setup
- Easier to see which external calls a test exercises
