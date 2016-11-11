import {T} from './Ticket.js'
import {Actor} from './Actor.js'
//import Q from 'q'

class DispatcherActor extends Actor{
    constructor(){
        super()
        this.results = {}
        this.ws = null
        //this.promises = {}
    }

    rpc(method, ...args){
        console.log('action actor rpc', method, args)
        let t = T.getTicket()
        let rv = args.slice(-1)[0]
        if(rv.constructor.name == 'ObservableValue'){
            rv = args.pop()
            this.results[t] = rv
        }
        let doc = {}
        doc.type = method
        doc.args = args
        doc.ticket = t
        this.ws.tell('rpc', doc)
        //this.promises[t] =
    }

    notify(msg){
        console.log('Action actor', msg)
        rv = this.results[msg.ticket]
        if(rv) {
            rv.set(msg.value)
            delete this.results[msg.ticket]
        }
        //this.promises[msg.ticket].resolve(msg.value)
    }
}

export const dispatcher = new DispatcherActor()
