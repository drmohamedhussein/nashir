import { API_ERRORS } from "./api-errors";
import { t, type Locale } from "./i18n";

const MESSAGE_KEYS = {
  [API_ERRORS.RATE_LIMIT]: "errorRateLimit",
  [API_ERRORS.LOGIN_REQUIRED]: "errorLoginRequired",
  [API_ERRORS.INCOMPLETE_DATA]: "errorIncomplete",
  [API_ERRORS.INVALID_CREDENTIALS]: "errorInvalidCredentials",
  [API_ERRORS.NO_WORKSPACE]: "errorNoWorkspace",
  [API_ERRORS.DATABASE_UNAVAILABLE]: "errorDatabase",
  [API_ERRORS.EMAIL_TAKEN]: "errorEmailTaken",
  [API_ERRORS.INVALID_CONNECT]: "errorInvalidConnect",
  [API_ERRORS.EXPIRED_PAIRING]: "errorExpiredPairing",
  [API_ERRORS.SITE_NOT_FOUND]: "errorSiteNotFound",
  [API_ERRORS.INVALID_SIGNATURE]: "errorInvalidSignature",
  [API_ERRORS.SITE_URL_REQUIRED]: "errorSiteUrlRequired",
  [API_ERRORS.INVALID_WP_URL]: "errorInvalidWpUrl",
  [API_ERRORS.HQ_SITE_BLOCKED]: "errorHqSiteBlocked",
  [API_ERRORS.INVALID_POST_ID]: "errorInvalidPostId",
  [API_ERRORS.CONNECTOR_REQUIRED]: "errorConnectorRequired",
  [API_ERRORS.POST_NOT_FOUND]: "errorPostNotFound",
  [API_ERRORS.FETCH_POST_FAILED]: "errorFetchPost",
  [API_ERRORS.FETCH_POSTS_FAILED]: "errorFetchPosts",
  [API_ERRORS.INVALID_PAYLOAD]: "errorInvalidPayload",
  [API_ERRORS.INVALID_REQUEST]: "errorInvalidRequest",
  [API_ERRORS.INVALID_ACCOUNT]: "errorInvalidAccount",
  [API_ERRORS.INVALID_TEMPLATE]: "errorInvalidTemplate",
  [API_ERRORS.INVALID_SHARE]: "errorInvalidShare",
  [API_ERRORS.UNKNOWN_INTENT]: "errorUnknownIntent",
  [API_ERRORS.INVALID_ACTION]: "errorInvalidAction",
  [API_ERRORS.ACTION_FAILED]: "errorActionFailed",
  [API_ERRORS.PUBLISH_FAILED]: "errorPublishFailed",
  [API_ERRORS.INVALID_SETTINGS]: "errorInvalidSettings",
  [API_ERRORS.INVALID_ACTIVATION]: "errorInvalidActivation",
  [API_ERRORS.UNAUTHORIZED]: "errorUnauthorized",
  [API_ERRORS.NO_SEAT]: "errorNoSeat",
  [API_ERRORS.SUBSCRIPTION_NOT_FOUND]: "errorSubscriptionNotFound",
  [API_ERRORS.SOCIAL_ACCOUNT_MISSING]: "errorSocialAccountMissing",
} as const;

type ErrorCopyKey = (typeof MESSAGE_KEYS)[keyof typeof MESSAGE_KEYS];

export function localizeApiError(message: string, locale: Locale): string {
  const key = MESSAGE_KEYS[message as keyof typeof MESSAGE_KEYS] as ErrorCopyKey | undefined;
  if (!key) {
    return message;
  }
  const copy = t(locale) as Record<string, unknown>;
  const localized = copy[key];
  return typeof localized === "string" ? localized : message;
}
