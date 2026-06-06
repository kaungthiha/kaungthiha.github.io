# Instacart Reddit Pulse Memo

**Date range:** 2026-03-04 to 2026-03-11  
**Data source:** Reddit public posts/comments via official OAuth API (small, directional sample).

## Executive summary
- Sampled 24 posts and 0 comments across 3 subreddits.
- Overall sentiment split: negative 66.7%, positive 20.8%, neutral 12.5%
- Highest negative-share day: 2026-03-05 (100.0%).

## Observations
- **substitutions_oos** appeared in 7 negative posts (43.8% of negative posts).
- **order_accuracy** appeared in 5 negative posts (31.2% of negative posts).
- **delivery_reliability** appeared in 3 negative posts (18.8% of negative posts).

### Pain Point Categories
- delivery_reliability: present in 3 subreddits
- order_accuracy: present in 3 subreddits
- substitutions_oos: present in 3 subreddits
- fees_pricing: present in 2 subreddits
- refunds_support: present in 2 subreddits
- tipping_shopper: present in 2 subreddits

## Why it matters
- **Consumer side:** Persistent issues in fees, substitutions, and order accuracy can reduce repeat order intent.
- **Shopper side:** Delivery reliability and tipping/support friction can lower shopper supply quality and fill rate.
- **Marketplace risk:** When both sides report friction, service trust can decline faster than isolated incident metrics suggest.

## Recommendations
1. **Pricing clarity bet:** Add pre-checkout fee transparency and compare complaint-rate changes for fee-related sessions.
2. **Substitution confidence bet:** Improve substitution prompts with explicit item-quality preferences and track substitution acceptance + refund rates.
3. **Support recovery bet:** Add faster in-flow support for missing/wrong items with instant credit guardrails and monitor CSAT + repeat purchase.

## Limitations
- Small sample and subreddit composition bias.
- VADER + keyword rules can miss sarcasm and context.
- Results are directional, not causal.

## Ethics/compliance w/ Reddit policies
- Aggregated outputs only; no raw post/comment text published in repo outputs.
- Local cached/raw data should be removed quickly using `python scripts/cleanup_local_data.py` (within 48 hours).
