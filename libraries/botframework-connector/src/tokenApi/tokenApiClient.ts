/*
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is
 * regenerated.
 */

import { UserTokenApi } from './userTokenApi';
import { BotSignInApi } from './botSignInApi';
import * as Model from "./model";
import { CustomMicrosoftAppCredentials } from '../auth'
import * as os from 'os';

const ARCHITECTURE: any = os.arch();
const TYPE: any = os.type();
const RELEASE: any = os.release();
const NODE_VERSION: any = process.version;
const pjson: any = require('../../package.json');
const packageName = "botframework-Token";
const packageVersion = "4.0.0";
const defaultUserAgent = `botframework-connector/${ pjson.version } Node/${ NODE_VERSION } OS/(${ ARCHITECTURE }-${ TYPE }-${ RELEASE })`

class TokenApiClient {
  // Operation groups
  botSignIn: BotSignInApi;
  userToken: UserTokenApi;
  credentials: CustomMicrosoftAppCredentials;
  baseUri: string;  
  requestContentType: string = "application/json; charset=utf-8";
  userAgent: string;

  /**
   * Initializes a new instance of the TokenApiClient class.
   * @param credentials Subscription credentials which uniquely identify client subscription.
   * @param [options] The parameter options
   */
  constructor( CustomCredentials: CustomMicrosoftAppCredentials, options?: { baseUri: string, userAgent?: string }) {
    options.userAgent = `${packageName}/${packageVersion} ${defaultUserAgent} ${options.userAgent || ''}`
    this.credentials = CustomCredentials;
    this.userAgent = options.userAgent;
    this.baseUri = options.baseUri || this.baseUri || "https://token.botframework.com";
    this.botSignIn = new BotSignInApi(this);
    this.userToken = new UserTokenApi(this);
  }
}

// Operation Specifications
export {
  TokenApiClient,
  UserTokenApi,
  BotSignInApi,
  Model as TokenApiModels,
};
export * from "./model";
