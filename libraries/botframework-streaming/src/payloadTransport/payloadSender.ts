/**
 * @module botframework-streaming
 */
/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { HeaderSerializer } from '../payloads/headerSerializer';
import { SubscribableStream } from '../subscribableStream';
import { PayloadConstants } from '../payloads/payloadConstants';
import { TransportDisconnectedEventArgs } from './transportDisconnectedEventArgs';
import { TransportDisconnectedEventHandler } from './transportDisconnectedEventHandler';
import { ITransportSender } from '../interfaces/ITransportSender';
import { IHeader } from '../interfaces/IHeader';
import { ISendPacket } from '../interfaces/ISendPacket';

/**
 * Streaming payload sender.
 */
export class PayloadSender {
    public disconnected?: TransportDisconnectedEventHandler;
    private sender: ITransportSender;

    /**
     * Tests whether the transport sender is connected.
     *
     * @returns true if connected to a transport sender.
     */
    public get isConnected(): boolean {
        return !!this.sender;
    }

    /**
     * Connects to the given transport sender.
     *
     * @param sender The transport sender to connect this payload sender to.
     */
    public connect(sender: ITransportSender): void {
        this.sender = sender;
    }

    /**
     * Sends a payload out over the connected transport sender.
     *
     * @param header The header to attach to the outgoing payload.
     * @param payload The stream of buffered data to send.
     * @param sentCalback The function to execute when the send has completed.
     */
    public sendPayload(header: IHeader, payload?: SubscribableStream, sentCallback?: () => Promise<void>): void {
        var packet: ISendPacket = {header, payload, sentCallback};
        this.writePacket(packet);
    }

    /**
     * Disconnects this payload sender.
     *
     * @param e The disconnected event arguments to include in the disconnected event broadcast.
     */
    public disconnect(e?: TransportDisconnectedEventArgs): void {
        if (this.isConnected) {
            this.sender.close();
            this.sender = null;

            if (this.disconnected) {
                this.disconnected(this, e || TransportDisconnectedEventArgs.Empty);
            }
        }
    }

    private writePacket(packet: ISendPacket): void {
        try {
            let sendHeaderBuffer: Buffer = Buffer.alloc(PayloadConstants.MaxHeaderLength);
            HeaderSerializer.serialize(packet.header, sendHeaderBuffer);
            this.sender.send(sendHeaderBuffer);

            if (packet.header.payloadLength > 0 && packet.payload) {
                let count = packet.header.payloadLength;
                while (count > 0) {
                    let chunk = packet.payload.read(count);
                    this.sender.send(chunk);
                    count -= chunk.length;
                }

                if (packet.sentCallback) {
                    packet.sentCallback();
                }
            }
        } catch (e) {
            this.disconnect(new TransportDisconnectedEventArgs(e.message));
        }
    }
}
