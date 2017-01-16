import {T} from './Ticket.js'
import Actor from '../lib/Actor.js'
import {observable, asMap} from 'mobx'
import {status} from './status'
import {localStorageGetOnePending, localStorageDeletePending} from '../lib/localStorageUtil'

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

    sendPending(){
        let p = localStorageGetOnePending()
        if(p) {
            this.ask('rpc', 'offline_add', p.collection, p.doc).then((ret) => {
                localStorageDeletePending(p.doc.id)
                this.tell('sendPending')
            })
        }else{
            status.set('logged')
        }
    }

    login(user, password){
        this.ask('rpc', 'login', user, password).then((roles)=>{
            if(roles){
                this.roles = roles
                this.userId = user
                status.set('logged')
                //status.set('synchronizing')
                //this.tell('sendPending')
            }
        })
    }

    createUser(user, password){
        this.ask('rpc', 'createUser', user, password).then((roles)=>{
            if(roles){
                this.roles = roles
                this.userId = user
                status.set('logged')
            }
        })
    }
}

export const dispatcher = new DispatcherActor()
