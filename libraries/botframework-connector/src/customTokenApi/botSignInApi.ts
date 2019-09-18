/**
 * Microsoft Bot Token API - V3.1
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: token
 * Contact: botframework@microsoft.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import request = require('request');
import http = require('http');
import * as Models from './model';

/* tslint:disable:no-unused-locals */

import { ObjectSerializer } from './model/models';
import { CustomMicrosoftAppCredentials } from '../auth'

let defaultBasePath = 'https://token.botframework.com';

// ===============================================
// This file is autogenerated - Please do not edit
// ===============================================

export enum BotSignInApiApiKeys {
}

export class BotSignInApi {
    protected _basePath = defaultBasePath;
    protected defaultHeaders = {};
    protected _useQuerystring : boolean = false;
    protected credentials: CustomMicrosoftAppCredentials;
    
    constructor(CustomCredentials: CustomMicrosoftAppCredentials)
    constructor(CustomCredentials: CustomMicrosoftAppCredentials, basePath?: string){
        if (CustomCredentials === null || CustomCredentials === undefined) {
           throw new Error('\'credentials\' cannot be null.');
        }

        if(basePath){
            this.basePath = basePath;
        }

        this.credentials = CustomCredentials              
    }

    set useQuerystring(value: boolean) {
        this._useQuerystring = value;
    }

    set basePath(basePath: string) {
        this._basePath = basePath;
    }

    get basePath() {
        return this._basePath;
    }
    
    /**
     * 
     * @param state 
     * @param codeChallenge 
     * @param emulatorUrl 
     * @param finalRedirect 
     */
    public async getSignInUrl (state: string, options: Models.BotSignInGetSignInUrlOptionalParams = {headers: {}}) : Promise<Models.BotSignInGetSignInUrlResponse> {
        const localVarPath = this.basePath + '/api/botsignin/GetSignInUrl';
        let localVarQueryParameters = {};
        let localVarHeaderParams = Object.assign({}, this.defaultHeaders);    

        // verify required parameter 'state' is not null or undefined
        if (state === null || state === undefined) {
            throw new Error('Required parameter state was null or undefined when calling botSignInGetSignInUrl.');
        }

        if (state !== undefined) {
            localVarQueryParameters['state'] = ObjectSerializer.serialize(state, "string");
        }

        if (options.codeChallenge !== undefined) {
            localVarQueryParameters['code_challenge'] = ObjectSerializer.serialize(options.codeChallenge, "string");
        }

        if (options.emulatorUrl !== undefined) {
            localVarQueryParameters['emulatorUrl'] = ObjectSerializer.serialize(options.emulatorUrl, "string");
        }

        if (options.finalRedirect !== undefined) {
            localVarQueryParameters['finalRedirect'] = ObjectSerializer.serialize(options.finalRedirect, "string");
        }

        Object.assign(localVarHeaderParams, options.headers);        

        let localVarRequestOptions: request.Options = {
            method: 'GET',
            qs: localVarQueryParameters,
            headers: localVarHeaderParams,
            uri: localVarPath,
            useQuerystring: this._useQuerystring,
            json: true,
        };
                
        await this.credentials.signRequest(localVarRequestOptions);   

        return new Promise<Models.BotSignInGetSignInUrlResponse>((resolve, reject) => {
            request(localVarRequestOptions, (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    let _body: Models.BotSignInGetSignInUrlResponse = ObjectSerializer.deserialize(response, "{ [key: string]: TokenResponse; }");
                    let _bodyAsText = ObjectSerializer.deserialize(response, "string");
                    let httpResponse: http.IncomingMessage = response;
                    if (response.statusCode && response.statusCode >= 200 && response.statusCode <= 299) {
                        let _response = Object.assign(httpResponse, {bodyAsText: _bodyAsText, parsedBody: _body});
                        let toReturn: Models.BotSignInGetSignInUrlResponse = Object.assign(_body, {_response: _response});
                        resolve(toReturn);
                    } else {
                        let _response = Object.assign(httpResponse, {bodyAsText: _bodyAsText, parsedBody: _body});
                        let toReturn: Models.BotSignInGetSignInUrlResponse = Object.assign(_body, {_response: _response});  
                        reject(toReturn);
                    }
                }
            });
        });        
    }
}
