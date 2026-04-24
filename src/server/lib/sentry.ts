import * as Sentry from '@sentry/cloudflare';

export const withSentry = (handler: ExportedHandler<Env>) =>
  Sentry.withSentry(
    (env: Env) => ({
      dsn: env.SENTRY_DSN,
      enableLogging: true,

      // Setting this option to true will send default PII data to Sentry.
      // For example, automatic IP address collection on events
      sendDefaultPii: true,
    }),
    handler satisfies ExportedHandler<Env>,
  );
