import {T} from './Ticket.js'
import Actor from '../lib/Actor.js'
import {observable, asMap} from 'mobx'
import {status} from './status'

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
        //let t = (method == 'login'? null: T.getTicket())
        let t = T.getTicket()
        this.promises[t] = promise
        this.ws.tell('send', method, args, t)
    }

    response(msg){
        this.promises[msg.ticket] && this.promises[msg.ticket].resolve(msg.data)
        delete this.promises[msg.ticket]
        this.rv.set('rpc', null)
        this.rv.set('rpc', msg.data)
    }

    remote(method, ...args){
        return this.ask('rpc', method, ...args)
    }

    add(collection, doc){
        return this.ask('rpc', 'add', collection, doc)
    }

    update(collection, id, doc){
        return this.ask('rpc', 'update', collection, id, doc)
    }

    delete(collection, id){
        return this.ask('rpc', 'delete', collection, id)
    }

    login(name){
        this.ask('rpc', 'login', name).then((roles)=>{
            if(roles){
                this.roles = roles
                this.userId = name
                status.set('logged')
            }
        })
    }
}

export const dispatcher = new DispatcherActor()
