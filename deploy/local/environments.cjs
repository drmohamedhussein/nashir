/**
 * Canonical environment URLs for local scripts and docs.
 */
module.exports = {
  STAGING_SAAS: "https://nashir.satest.top",
  LOCAL_WP_DEV: "https://rankpublish.local",
  CUSTOMER_WP_TEST: "https://rankpublish-test.local",
  PRODUCTION_SAAS: "https://rankpublish.com",
  /** Default APP_URL for pairing E2E against live staging */
  DEFAULT_APP_URL: process.env.APP_URL || "https://nashir.satest.top",
};
