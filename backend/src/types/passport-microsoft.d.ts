declare module 'passport-microsoft' {
  import { Strategy as PassportStrategy } from 'passport-strategy';

  interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope: string[];
  }

  interface MicrosoftProfile {
    id: string;
    displayName: string;
    emails: Array<{ value: string; type: string }>;
    name: {
      familyName: string;
      givenName: string;
    };
  }

  type VerifyCallback = (error: Error | null, user?: any) => void;

  type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    profile: MicrosoftProfile,
    done: VerifyCallback
  ) => void;

  class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyFunction);
  }

  export { Strategy, VerifyCallback };
}