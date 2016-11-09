import Q from 'q'
import {T} from './Ticket.js'

class DispatcherActor{
    constructor(){
        this.promises = {}
        this.ws = null
    }

    rpc(method, ...args){
        console.log('action actor rpc', method, args)
        let doc = {}
        doc.type = method
        doc.args = args
        let t = T.getTicket()
        let deferred = Q.defer()
        this.promises[t] = deferred
        doc.ticket = t
        this.ws.tell('rpc', doc)
        return deferred.promise
    }

    notify(msg){
        console.log('Action actor', msg)
        this.promises[msg.ticket].resolve(msg.value)
    }
}

export const dispatcher = new DispatcherActor()
