import type { Connection,ConnectionContext } from 'partyserver';
import { YServer } from 'y-partyserver';

export class Room extends YServer {
  static options = {
    hibernate: true,
  }

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  onConnect(connection: Connection, ctx: ConnectionContext) {
    return super.onConnect(connection, ctx);
  }
}