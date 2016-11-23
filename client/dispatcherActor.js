import {T} from './Ticket.js'
import {Actor} from './Actor.js'
import {observable, asMap} from 'mobx'

class DispatcherActor extends Actor{
    constructor(){
        super()
        this.results = {}
        this.ws = null
        this.promises = {}
        this.rv = observable(asMap())
    }

    rpc(promise, method, ...args){
        let t = T.getTicket()
        this.ws.tell(method, args, t)
        this.promises[t] = promise
    }

    notify(msg){
        this.promises[msg.ticket].resolve(msg.data)
        delete this.promises[msg.ticket]
        this.rv.set('rpc', null)
        this.rv.set('rpc', msg.data)
    }
}

export const dispatcher = new DispatcherActor()
