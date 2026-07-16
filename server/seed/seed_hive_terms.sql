-- seed_hive_terms.sql
-- Hive/Web3 vocabulary pulled straight from the Product Spec's theme lists
-- (Section 3.2). Extend this list over time -- it's intentionally small to
-- start, since the Puzzle Curator role is meant to own ongoing curation.

INSERT INTO words (word, length, difficulty, category, theme, source) VALUES
    ('liquidity',  9, 'hard',   'web3', 'defi', 'manual'),
    ('staking',    7, 'medium', 'web3', 'defi', 'manual'),
    ('yield',      5, 'easy',   'web3', 'defi', 'manual'),
    ('protocol',   8, 'medium', 'web3', 'defi', 'manual'),
    ('delegate',   8, 'medium', 'web3', 'defi', 'manual'),
    ('witness',    7, 'medium', 'web3', 'defi', 'manual'),
    ('mint',       4, 'easy',   'web3', 'nft',  'manual'),
    ('rarity',     6, 'medium', 'web3', 'nft',  'manual'),
    ('royalty',    7, 'medium', 'web3', 'nft',  'manual'),
    ('metadata',   8, 'hard',   'web3', 'nft',  'manual')
ON CONFLICT (word) DO NOTHING;

-- Note: "collection" (10 letters) is in the doc's NFT list but exceeds the
-- 5-7 letter MVP word-length range (Section 2.4) -- left out until harder
-- formats / longer words are supported post-MVP.