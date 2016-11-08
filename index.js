import {ws} from './wsActor.js'
import {mbx} from './mobxActor.js'
import {ui} from './uiActor.js'
import {aa} from './ActionActor.js'

ws.mbx = mbx
ws.aa = aa
ui.aa = aa
ui.mbx = mbx
aa.ws = ws
mbx.ws = ws
