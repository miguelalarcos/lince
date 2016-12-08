import {ws} from './client/webSocketActor'
import {store} from './client/collectionStoreActor'
import {ui} from './client/uiActor.js'
import {dispatcher} from './client/dispatcherActor.js'
import {offline} from './client/offlineActor'

ws.store = store
ws.dispatcher = dispatcher
ui.dispatcher = dispatcher
ui.store = store
dispatcher.ws = ws
dispatcher.store = store
store.ws = ws
ws.offline = offline
offline.ws = ws