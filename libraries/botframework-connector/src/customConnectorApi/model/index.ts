import http = require('http');
import { ConversationResourceResponse } from './ConversationResourceResponse';

export class SimpleCredential {
    appId: string;
    appPassword: string

    constructor(appId: string, appPassword: string){
        this.appId = appId;
        this.appPassword = appPassword;
    }
}

export interface RequestOptions {
    headers: {[name: string]: string}
}

/**
 * Contains response data for the createConversation operation.
 */
export type ConversationsCreateConversationResponse = ConversationResourceResponse & {
    /**
     * The underlying HTTP response.
     */
    _response: http.IncomingMessage & {
      /**
       * The response body as text (string format)
       */
      bodyAsText: string;
  
      /**
       * The response body as parsed JSON or XML
       */
      parsedBody: ConversationResourceResponse;
    };
};

export * from './actionTypes'
export * from './activity'
export * from './activityImportance'
export * from './activityTypes'
export * from './animationCard'
export * from './attachment'
export * from './attachmentData'
export * from './attachmentInfo'
export * from './attachmentLayoutTypes'
export * from './attachmentView'
export * from './audioCard'
export * from './basicCard'
export * from './cardAction'
export * from './cardImage'
export * from './channelAccount'
export * from './contactRelationUpdateActionTypes'
export * from './conversationAccount'
export * from './conversationMembers'
export * from './conversationParameters'
export * from './conversationReference'
export * from './conversationResourceResponse'
export * from './conversationsResult'
export * from './deliveryModes'
export * from './endOfConversationCodes'
export * from './entity'
export * from './errorResponse'
export * from './fact'
export * from './geoCoordinates'
export * from './heroCard'
export * from './innerHttpError'
export * from './inputHints'
export * from './installationUpdateActionTypes'
export * from './mediaCard'
export * from './mediaEventValue'
export * from './mediaUrl'
export * from './mention'
export * from './messageReaction'
export * from './messageReactionTypes'
export * from './microsoftPayMethodData'
export * from './modelError'
export * from './models'
export * from './oAuthCard'
export * from './pagedMembersResult'
export * from './paymentAddress'
export * from './paymentCurrencyAmount'
export * from './paymentDetails'
export * from './paymentDetailsModifier'
export * from './paymentItem'
export * from './paymentMethodData'
export * from './paymentOptions'
export * from './paymentRequest'
export * from './paymentRequestComplete'
export * from './paymentRequestCompleteResult'
export * from './paymentRequestUpdate'
export * from './paymentRequestUpdateResult'
export * from './paymentResponse'
export * from './paymentShippingOption'
export * from './place'
export * from './receiptCard'
export * from './receiptItem'
export * from './resourceResponse'
export * from './roleTypes'
export * from './semanticAction'
export * from './semanticActionStates'
export * from './signinCard'
export * from './suggestedActions'
export * from './textFormatTypes'
export * from './textHighlight'
export * from './thing'
export * from './thumbnailCard'
export * from './thumbnailUrl'
export * from './tokenRequest'
export * from './tokenResponse'
export * from './transcript'
export * from './videoCard'
