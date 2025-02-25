/**
 * @module botbuilder-dialogs
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
import { Activity, ActivityTypes, InputHints, MessageFactory, TurnContext } from 'botbuilder-core';
import { Choice, ChoiceFactory, ChoiceFactoryOptions } from '../choices';
import { Dialog, DialogInstance, DialogReason, DialogTurnResult } from '../dialog';
import { DialogContext } from '../dialogContext';

/**
 * Controls the way that choices for a `ChoicePrompt` or yes/no options for a `ConfirmPrompt` are
 * presented to a user.
 */
export enum ListStyle {
    /**
     * Don't include any choices for prompt.
     */
    none,

    /**
     * Automatically select the appropriate style for the current channel.
     */
    auto,

    /**
     * Add choices to prompt as an inline list.
     */
    inline,

    /**
     * Add choices to prompt as a numbered list.
     */
    list,

    /**
     * Add choices to prompt as suggested actions.
     */
    suggestedAction,

    /**
     * Add choices to prompt as a HeroCard with buttons.
     */
    heroCard
}

/**
 * Basic configuration options supported by all prompts.
 */
export interface PromptOptions {
    /**
     * (Optional) Initial prompt to send the user.
     */
    prompt?: string | Partial<Activity>;

    /**
     * (Optional) Retry prompt to send the user.
     */
    retryPrompt?: string | Partial<Activity>;

    /**
     * (Optional) List of choices associated with the prompt.
     */
    choices?: (string | Choice)[];

    /**
     * (Optional) Property that can be used to override or set the value of ChoicePrompt.Style
     * when the prompt is executed using DialogContext.prompt.
     */
    style?: ListStyle

    /**
     * (Optional) Additional validation rules to pass the prompts validator routine.
     */
    validations?: object;
}

/**
 * Result returned by a prompts recognizer function.
 * @param T Type of value being recognized.
 */
export interface PromptRecognizerResult<T> {
    /**
     * If `true` the users utterance was successfully recognized and [value](#value) contains the
     * recognized result.
     */
    succeeded: boolean;

    /**
     * Value that was recognized if [succeeded](#succeeded) is `true`.
     */
    value?: T;
}

/**
 * Function signature for providing a custom prompt validator.
 *
 * ```TypeScript
 * type PromptValidator<T> = (prompt: PromptValidatorContext<T>) => Promise<boolean>;
 * ```
 *
 * @remarks
 * The validator should be an asynchronous function that returns `true` if
 * `prompt.recognized.value` is valid and the prompt should end.
 *
 * > [!NOTE]
 * > If the validator returns `false` the prompts default re-prompt logic will be run unless the
 * > validator sends a custom re-prompt to the user using `prompt.context.sendActivity()`. In that
 * > case the prompts default re-rpompt logic will not be run.
 * @param T Type of recognizer result being validated.
 * @param PromptValidator.prompt Contextual information containing the recognizer result and original options passed to the prompt.
 */
export type PromptValidator<T> = (prompt: PromptValidatorContext<T>) => Promise<boolean>;

/**
 * Contextual information passed to a custom `PromptValidator`.
 * @param T Type of recognizer result being validated.
 */
export interface PromptValidatorContext<T> {
    /**
     * The context for the current turn of conversation with the user.
     *
     * @remarks
     * The validator can use this to re-prompt the user.
     */
    readonly context: TurnContext;

    /**
     * Result returned from the prompts recognizer function.
     *
     * @remarks
     * The `prompt.recognized.succeeded` field can be checked to determine of the recognizer found
     * anything and then the value can be retrieved from `prompt.recognized.value`.
     */
    readonly recognized: PromptRecognizerResult<T>;

    /**
     * A dictionary of values persisted for each conversational turn while the prompt is active.
     *
     * @remarks
     * The validator can use this to persist things like turn counts or other state information.
     */
    readonly state: object;

    /**
     * Original set of options passed to the prompt by the calling dialog.
     *
     * @remarks
     * The validator can extend this interface to support additional prompt options.
     */
    readonly options: PromptOptions;

    /**
     * A count of the number of times the prompt has been executed.
     * 
     * A number indicating how many times the prompt was invoked (starting at 1 for the first time it was invoked).
     */
    readonly attemptCount: number;
}

/**
 * Base class for all prompts.
 * @param T Type of value being returned by the prompts recognizer function.
 */
export abstract class Prompt<T> extends Dialog {
    /**
     * Creates a new Prompt instance.
     * @param dialogId Unique ID of the prompt within its parent `DialogSet` or `ComponentDialog`.
     * @param validator (Optional) custom validator used to provide additional validation and re-prompting logic for the prompt.
     */
    protected constructor(dialogId: string, private validator?: PromptValidator<T>) {
        super(dialogId);
    }

    public async beginDialog(dc: DialogContext, options: PromptOptions): Promise<DialogTurnResult> {
        // Ensure prompts have input hint set
        const opt: Partial<PromptOptions> = {...options};
        if (opt.prompt && typeof opt.prompt === 'object' && typeof opt.prompt.inputHint !== 'string') {
            opt.prompt.inputHint = InputHints.ExpectingInput;
        }
        if (opt.retryPrompt && typeof opt.retryPrompt === 'object' && typeof opt.retryPrompt.inputHint !== 'string') {
            opt.retryPrompt.inputHint = InputHints.ExpectingInput;
        }

        // Initialize prompt state
        const state: PromptState = dc.activeDialog.state as PromptState;
        state.options = opt;
        state.state = {};

        // Send initial prompt
        await this.onPrompt(dc.context, state.state, state.options, false);

        return Dialog.EndOfTurn;
    }

    public async continueDialog(dc: DialogContext): Promise<DialogTurnResult> {
        // Don't do anything for non-message activities
        if (dc.context.activity.type !== ActivityTypes.Message) {
            return Dialog.EndOfTurn;
        }

        // Perform base recognition
        const state: PromptState = dc.activeDialog.state as PromptState;
        const recognized: PromptRecognizerResult<T> = await this.onRecognize(dc.context, state.state, state.options);

        // Validate the return value
        let isValid = false;
        if (this.validator) {
            if (state.state['attemptCount'] === undefined) {
                state.state['attemptCount'] = 1;
            }
            isValid = await this.validator({
                context: dc.context,
                recognized: recognized,
                state: state.state,
                options: state.options,
                attemptCount: state.state['attemptCount']
            });
            if (state.state['attemptCount'] !== undefined) {
                state.state['attemptCount']++;
            }
        } else if (recognized.succeeded) {
            isValid = true;
        }

        // Return recognized value or re-prompt
        if (isValid) {
            return await dc.endDialog(recognized.value);
        } else {
            if (!dc.context.responded) {
                await this.onPrompt(dc.context, state.state, state.options, true);
            }

            return Dialog.EndOfTurn;
        }
    }

    public async resumeDialog(dc: DialogContext, reason: DialogReason, result?: any): Promise<DialogTurnResult> {
        // Prompts are typically leaf nodes on the stack but the dev is free to push other dialogs
        // on top of the stack which will result in the prompt receiving an unexpected call to
        // resumeDialog() when the pushed on dialog ends.
        // To avoid the prompt prematurely ending we need to implement this method and
        // simply re-prompt the user.
        await this.repromptDialog(dc.context, dc.activeDialog);

        return Dialog.EndOfTurn;
    }

    public async repromptDialog(context: TurnContext, instance: DialogInstance): Promise<void> {
        const state: PromptState = instance.state as PromptState;
        await this.onPrompt(context, state.state, state.options, false);
    }

    /**
     * Called anytime the derived class should send the user a prompt.
     * @param context Context for the current turn of conversation with the user.
     * @param state Additional state being persisted for the prompt.
     * @param options Options that the prompt was started with in the call to `DialogContext.prompt()`.
     * @param isRetry If `true` the users response wasn't recognized and the re-prompt should be sent.
     */
    protected abstract onPrompt(context: TurnContext, state: object, options: PromptOptions, isRetry: boolean): Promise<void>;

    /**
     * Called to recognize an utterance received from the user.
     *
     * @remarks
     * The Prompt class filters out non-message activities so its safe to assume that the users
     * utterance can be retrieved from `context.activity.text`.
     * @param context Context for the current turn of conversation with the user.
     * @param state Additional state being persisted for the prompt.
     * @param options Options that the prompt was started with in the call to `DialogContext.prompt()`.
     */
    protected abstract onRecognize(context: TurnContext, state: object, options: PromptOptions): Promise<PromptRecognizerResult<T>>;

    /**
     * Helper function to compose an output activity containing a set of choices.
     * @param prompt The prompt to append the users choices to.
     * @param channelId ID of the channel the prompt is being sent to.
     * @param choices List of choices to append.
     * @param style Configured style for the list of choices.
     * @param options (Optional) options to configure the underlying ChoiceFactory call.
     */
    protected appendChoices(
        prompt: string | Partial<Activity>,
        channelId: string,
        choices: (string | Choice)[],
        style: ListStyle,
        options?: ChoiceFactoryOptions
    ): Partial<Activity> {
        // Get base prompt text (if any)
        let text = '';
        if (typeof prompt === 'string') {
            text = prompt;
        } else if (prompt && prompt.text) {
            text = prompt.text;
        }

        // Create temporary msg
        let msg: Partial<Activity>;
        switch (style) {
            case ListStyle.inline:
                msg = ChoiceFactory.inline(choices, text, undefined, options);
                break;

            case ListStyle.list:
                msg = ChoiceFactory.list(choices, text, undefined, options);
                break;

            case ListStyle.suggestedAction:
                msg = ChoiceFactory.suggestedAction(choices, text);
                break;

            case ListStyle.heroCard:
                msg = ChoiceFactory.heroCard(choices as Choice[], text);
                break;

            case ListStyle.none:
                msg = MessageFactory.text(text);
                break;

            default:
                msg = ChoiceFactory.forChannel(channelId, choices, text, undefined, options);
                break;
        }

        // Update prompt with text, actions and attachments
        if (typeof prompt === 'object') {
            // Clone the prompt Activity as to not modify the original prompt.
            prompt = JSON.parse(JSON.stringify(prompt)) as Activity;
            prompt.text = msg.text;
            if (msg.suggestedActions && Array.isArray(msg.suggestedActions.actions) && msg.suggestedActions.actions.length > 0) {
                prompt.suggestedActions = msg.suggestedActions;
            }

            if (msg.attachments) {
                if (prompt.attachments) {
                  prompt.attachments = prompt.attachments.concat(msg.attachments);
                } else {
                  prompt.attachments = msg.attachments;
                }
            }

            return prompt;
        } else {
            msg.inputHint = InputHints.ExpectingInput;

            return msg;
        }
    }
}

/**
 * @private
 */
interface PromptState {
    state: any;
    options: PromptOptions;
}
