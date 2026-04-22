import type { Connection,ConnectionContext } from 'partyserver';
import { YServer } from 'y-partyserver';
import { encodeStateAsUpdate, applyUpdate } from 'yjs';

export class Room extends YServer {
  static options = {
    hibernate: true,
  }
  static callbackOptions = { 
    debounceWait: 2000,
    debounceMaxWait: 10000,
    timeout: 5000
  }

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  onConnect(connection: Connection, ctx: ConnectionContext) {
    return super.onConnect(connection, ctx);
  }

  // called every few seconds after edits, and when the room empties
  // you can use this to write to a database or some external storage
  async onSave() {
    console.debug('onSave called');
    const update = encodeStateAsUpdate(this.document) satisfies Uint8Array;
    this.ctx.waitUntil(this.ctx.storage.put('document', update));
  }

  async onLoad(){
    console.debug('onLoad called');
    const document = await this.ctx.storage.get('document');
    if (document) {
      applyUpdate(this.document, document as Uint8Array);
    }
  }
}