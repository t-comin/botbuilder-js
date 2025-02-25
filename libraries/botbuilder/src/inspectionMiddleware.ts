/**
 * @module botbuilder
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { MicrosoftAppCredentials, ConnectorClient } from 'botframework-connector';
import { Activity, ActivityTypes, Middleware, TurnContext, BotState, ConversationReference, StatePropertyAccessor, UserState, ConversationState, Storage } from 'botbuilder-core';

/** @private */
class TraceActivity {

    public static makeCommandActivity(command: string): Partial<Activity> {
        return {
            type: ActivityTypes.Trace,
            timestamp: new Date(),
            name: 'Command',
            label: 'Command',
            value: command,
            valueType: 'https://www.botframework.com/schemas/command'
        };
    }

    public static fromActivity(activity: Activity|Partial<Activity>, name: string, label: string): Partial<Activity> {
        return {
            type: ActivityTypes.Trace,
            timestamp: new Date(),
            name: name,
            label: label,
            value: activity,
            valueType: 'https://www.botframework.com/schemas/activity'
        };
    }

    public static fromState(botState: BotState): Partial<Activity> {
        return {
            type: ActivityTypes.Trace,
            timestamp: new Date(),
            name: 'BotState',
            label: 'Bot State',
            value: botState,
            valueType: 'https://www.botframework.com/schemas/botState'
        };
    }

    public static fromConversationReference(conversationReference: Partial<ConversationReference>): Partial<Activity> {
        return {
            type: ActivityTypes.Trace,
            timestamp: new Date(),
            name: 'Deleted Message',
            label: 'MessageDelete',
            value: conversationReference,
            valueType: 'https://www.botframework.com/schemas/conversationReference'
        };
    }

    public static fromError(errorMessage: string): Partial<Activity> {
        return {
            type: ActivityTypes.Trace,
            timestamp: new Date(),
            name: 'Turn Error',
            label: 'TurnError',
            value: errorMessage,
            valueType: 'https://www.botframework.com/schemas/error'
        };
    }
}

/** @private */
abstract class InterceptionMiddleware implements Middleware {

    /** Implement middleware signature
     * @param context {TurnContext} An incoming TurnContext object.
     * @param next {function} The next delegate function.
     */
    public async onTurn(turnContext: TurnContext, next: () => Promise<void>): Promise<void> {

        var { shouldForwardToApplication, shouldIntercept } = await this.invokeInbound(turnContext, TraceActivity.fromActivity(turnContext.activity, 'ReceivedActivity', 'Received Activity'));

        if (shouldIntercept) {

            turnContext.onSendActivities(async (ctx, activities, nextSend) => {

                var traceActivities: Partial<Activity>[] = [];
                activities.forEach(activity => {
                    traceActivities.push(TraceActivity.fromActivity(activity, 'SentActivity', 'Sent Activity'));
                });
                await this.invokeOutbound(ctx, traceActivities);
                return await nextSend();
            });

            turnContext.onUpdateActivity(async (ctx, activity, nextUpdate) => {
                var traceActivity = TraceActivity.fromActivity(activity, 'MessageUpdate', 'Updated Message');
                await this.invokeOutbound(ctx, [ traceActivity ]);
                return await nextUpdate();
            });

            turnContext.onDeleteActivity(async (ctx, reference, nextDelete) => {
                var traceActivity = TraceActivity.fromConversationReference(reference);
                await this.invokeOutbound(ctx, [ traceActivity ]);
                return await nextDelete();
            });
        }
        
        if (shouldForwardToApplication) {
            try {
                await next();
            }
            catch (err) {
                var traceActivity = TraceActivity.fromError(err.toString());
                await this.invokeOutbound(turnContext, [ traceActivity ]);
                throw err;
            }
        }

        if (shouldIntercept) {
        
            await this.invokeTraceState(turnContext);
        }
    }

    protected abstract inbound(turnContext: TurnContext, traceActivity: Partial<Activity>): Promise<any>;

    protected abstract outbound(turnContext: TurnContext, traceActivities: Partial<Activity>[]): Promise<any>;

    protected abstract traceState(turnContext: TurnContext): Promise<any>;

    private async invokeInbound(turnContext: TurnContext, traceActivity: Partial<Activity>): Promise<any> {
        try {
            return await this.inbound(turnContext, traceActivity);
        } catch (err) {
            console.warn(`Exception in inbound interception ${err}`);
            return { shouldForwardToApplication: true, shouldIntercept: false };
        }
    }

    private async invokeOutbound(turnContext: TurnContext, traceActivities: Partial<Activity>[]): Promise<any> {
        try {
            await this.outbound(turnContext, traceActivities);
        } catch (err) {
            console.warn(`Exception in outbound interception ${err}`);
        }
    }

    private async invokeTraceState(turnContext: TurnContext): Promise<any> {
        try {
            await this.traceState(turnContext);
        } catch (err) {
            console.warn(`Exception in state interception ${err}`);
        }
    }
}

/**
 * InspectionMiddleware for emulator inspection of runtime Activities and BotState.
 *
 * @remarks
 * InspectionMiddleware for emulator inspection of runtime Activities and BotState.
 * 
 */
export class InspectionMiddleware extends InterceptionMiddleware {

    private static readonly command = "/INSPECT";

    private readonly inspectionState: InspectionState;
    private readonly inspectionStateAccessor: StatePropertyAccessor<InspectionSessionsByStatus>;
    private readonly userState: UserState;
    private readonly conversationState: ConversationState;
    private readonly credentials: MicrosoftAppCredentials;


    /**
     * Create the Inspection middleware for sending trace activities out to an emulator session
     */
    constructor(inspectionState: InspectionState, userState?: UserState, conversationState?: ConversationState, credentials?: Partial<MicrosoftAppCredentials>) {
        super();

        this.inspectionState = inspectionState;
        this.inspectionStateAccessor = inspectionState.createProperty('InspectionSessionByStatus');
        this.userState = userState;
        this.conversationState = conversationState;
        credentials = { appId: '', appPassword: '', ...credentials };
        this.credentials = new MicrosoftAppCredentials(credentials.appId, credentials.appPassword);
    }

    public async processCommand(turnContext: TurnContext): Promise<any> {

        if (turnContext.activity.type == ActivityTypes.Message && turnContext.activity.text !== undefined) {

            var originalText = turnContext.activity.text;
            TurnContext.removeRecipientMention(turnContext.activity);

            var command = turnContext.activity.text.trim().split(' ');
            if (command.length > 1 && command[0] === InspectionMiddleware.command) {

                if (command.length === 2 && command[1] === 'open') {
                    await this.processOpenCommand(turnContext);
                    return true;
                }

                if (command.length === 3 && command[1] === 'attach') {
                    await this.processAttachCommand(turnContext, command[2]);
                    return true;
                }
            }

            turnContext.activity.text = originalText;
        }

        return false;
    }

    protected async inbound(turnContext: TurnContext, traceActivity: Partial<Activity>): Promise<any> {

        if (await this.processCommand(turnContext)) {
            return { shouldForwardToApplication: false, shouldIntercept: false };
        }

        var session = await this.findSession(turnContext);
        if (session !== undefined) {
            
            if (await this.invokeSend(turnContext, session, traceActivity)) {
                return { shouldForwardToApplication: true, shouldIntercept: true };
            } else {
                return { shouldForwardToApplication: true, shouldIntercept: false };
            }
        } else {
            return { shouldForwardToApplication: true, shouldIntercept: false };
        }
    }

    protected async outbound(turnContext: TurnContext, traceActivities: Partial<Activity>[]): Promise<any> {

        var session = await this.findSession(turnContext);
        if (session !== undefined) {
            for (var i=0; i<traceActivities.length; i++) {
                var traceActivity = traceActivities[i];
                if (!await this.invokeSend(turnContext, session, traceActivity))
                {
                    break;
                }
            }
        }
    }

    protected async traceState(turnContext: TurnContext): Promise<any> {

        var session = await this.findSession(turnContext);
        if (session !== undefined) {
            
            if (this.userState !== undefined) {
                await this.userState.load(turnContext, false);
            }
            if (this.conversationState != undefined) {
                await this.conversationState.load(turnContext, false);
            }

            var botState: any = {};

            if (this.userState !== undefined) {
                botState.userState = this.userState.get(turnContext);
            }

            if (this.conversationState !== undefined) {
                botState.conversationState = this.conversationState.get(turnContext);
            }

            await this.invokeSend(turnContext, session, TraceActivity.fromState(botState));
        }
    }

    private async processOpenCommand(turnContext: TurnContext): Promise<any> {
        var sessions = await this.inspectionStateAccessor.get(turnContext, InspectionSessionsByStatus.DefaultValue);
        var sessionId = this.openCommand(sessions, TurnContext.getConversationReference(turnContext.activity));
        await turnContext.sendActivity(TraceActivity.makeCommandActivity(`${InspectionMiddleware.command} attach ${sessionId}`));
        await this.inspectionState.saveChanges(turnContext, false);
    }

    private async processAttachCommand(turnContext: TurnContext, sessionId: string): Promise<any> {
        var sessions = await this.inspectionStateAccessor.get(turnContext, InspectionSessionsByStatus.DefaultValue);

        if (this.attachCommand(turnContext.activity.conversation.id, sessions, sessionId)) {
            await turnContext.sendActivity('Attached to session, all traffic is being replicated for inspection.');
        }
        else {
            await turnContext.sendActivity(`Open session with id ${sessionId} does not exist.`);
        }

        await this.inspectionState.saveChanges(turnContext, false);
    }

    private openCommand(sessions: InspectionSessionsByStatus, conversationReference: Partial<ConversationReference>): string {
        function generate_guid() {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
              s4() + '-' + s4() + s4() + s4();
        }
    
        var sessionId = generate_guid();
        sessions.openedSessions[sessionId] = conversationReference;
        return sessionId;
    }

    private attachCommand(conversationId: string, sessions: InspectionSessionsByStatus, sessionId: string): boolean {

        var inspectionSessionState = sessions.openedSessions[sessionId];
        if (inspectionSessionState !== undefined) {
            sessions.attachedSessions[conversationId] = inspectionSessionState;
            delete sessions.openedSessions[sessionId];
            return true;
        }

        return false;
    }

    private async findSession(turnContext: TurnContext): Promise<any> {
        var sessions = await this.inspectionStateAccessor.get(turnContext, InspectionSessionsByStatus.DefaultValue);

        var conversationReference = sessions.attachedSessions[turnContext.activity.conversation.id];
        if (conversationReference !== undefined) {
            return new InspectionSession(conversationReference, this.credentials);
        }

        return undefined;
    }

    private async invokeSend(turnContext: TurnContext, session: InspectionSession, activity: Partial<Activity>): Promise<any> {

        if (await session.send(activity)) {
            return true;
        } else {
            await this.cleanUpSession(turnContext);
            return false;
        }
    }

    private async cleanUpSession(turnContext: TurnContext): Promise<any> {
        var sessions = await this.inspectionStateAccessor.get(turnContext, InspectionSessionsByStatus.DefaultValue);

        delete sessions.attachedSessions[turnContext.activity.conversation.id];
        await this.inspectionState.saveChanges(turnContext, false);
    }
}

/** @private */
class InspectionSession {

    private readonly conversationReference: Partial<ConversationReference>;
    private readonly connectorClient: ConnectorClient;

    constructor(conversationReference: Partial<ConversationReference>, credentials: MicrosoftAppCredentials) {
        this.conversationReference = conversationReference;
        this.connectorClient = new ConnectorClient(credentials, { baseUri: conversationReference.serviceUrl });
    }

    public async send(activity: Partial<Activity>): Promise<any> {

        TurnContext.applyConversationReference(activity, this.conversationReference);

        try {
            await this.connectorClient.conversations.sendToConversation(activity.conversation.id, activity as Activity);
        } catch (err) {
            return false;
        }

        return true;
    }
}

/** @private */
class InspectionSessionsByStatus {

    public static DefaultValue: InspectionSessionsByStatus = new InspectionSessionsByStatus();

    public openedSessions: { [id: string]: Partial<ConversationReference>; } = {};

    public attachedSessions: { [id: string]: Partial<ConversationReference>; } = {};
}

/**
 * InspectionState for use by the InspectionMiddleware for emulator inspection of runtime Activities and BotState.
 *
 * @remarks
 * InspectionState for use by the InspectionMiddleware for emulator inspection of runtime Activities and BotState.
 * 
 */
export class InspectionState extends BotState {

    constructor(storage: Storage) {
        super(storage, (context: TurnContext) => {
            return Promise.resolve(this.getStorageKey(context));
        });
    }
    
    protected getStorageKey(turnContext: TurnContext) {
        return 'InspectionState';
    }
} 