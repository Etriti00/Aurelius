declare module 'passport-apple' {
  import { Strategy as PassportStrategy } from 'passport-strategy';

  interface StrategyOptions {
    clientID: string;
    teamID: string;
    keyID: string;
    privateKeyLocation: string;
    callbackURL: string;
    scope: string[];
  }

  interface AppleProfile {
    id: string;
    displayName: string;
    emails: Array<{ value: string; verified: boolean }>;
  }

  interface AppleIdToken {
    id: string;
    email: string;
    name?: {
      firstName: string;
      lastName: string;
    };
  }

  type VerifyFunction = (
    accessToken: string,
    refreshToken: string,
    idToken: AppleIdToken,
    profile: AppleProfile
  ) => Promise<any>;

  class Strategy extends PassportStrategy {
    constructor(options: StrategyOptions, verify: VerifyFunction);
  }

  export { Strategy };
}
