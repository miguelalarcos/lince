import {T} from './Ticket.js'
import Actor from '../lib/Actor.js'
import {observable, asMap} from 'mobx'
import _ from 'lodash'

class DispatcherActor extends Actor{
    constructor(){
        super()
        this.results = {}
        this.ws = null
        this.store = null
        this.promises = {}
        this.rv = observable(asMap())
    }

    rpc(promise, method, ...args){
        let t = T.getTicket()
        this.ws.tell('send', method, args, t)
        this.promises[t] = promise
    }

    response(msg){
        this.promises[msg.ticket] && this.promises[msg.ticket].resolve(msg.data)
        delete this.promises[msg.ticket]
        this.rv.set('rpc', null)
        console.log('rpc response', msg)
        this.rv.set('rpc', msg.data)
    }
}

export const dispatcher = new DispatcherActor()
