import {T} from './Ticket.js'
// import {Actor} from './Actor.js'
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
        this.pending = []
    }

    setup(){
        this.ws.connected.observe((ch)=>{
            if(ch){
                this.sendPending()
            }
        })
    }

    sendPending(){
        for(let p of this.pending){
            if(p.method == 'add'){
                delete p.data.id
            }
            console.log('send pending', p.method, p.data, p.ticket)
            this.ws.tell('send', p.method, p.data, p.ticket)
        }
    }

    rpc(promise, method, ...args){
        let t = T.getTicket()
        let collection = args[0],
            data = args[1]
        if(_.includes(['add', 'update', 'delete'], method) && !this.ws.connected.get()){
            console.log('offline')
            this.store.disconnectedNotify(collection, data) // deberia usar tell o ask ???
            if(method == 'add') {
                data.id = ':'+t
                this.pending.push({ticket: t, collection, method, data})
            }else if(method == 'update'){
                /*let finded = false
                for(let x of this.pending){
                    if(x.method == 'update' && x.data.id == data.id){
                        finded = true
                        x.data = data
                        break
                    }
                }
                if(!finded){
                    this.pending.push({ticket: t, collection, method, data})
                }*/
                this.pending.push({ticket: t, collection, method, data})
            }else{
                this.pending.push({ticket: t, collection, method, data})
            }
        }else if(_.includes(['add', 'update', 'delete'], method) && this.ws.connected.get()) {
            console.log('normal mode', method, args, t)
            this.pending.push({collection, method, data, ticket: t})
            this.ws.tell('send', method, args, t)
            this.promises[t] = promise
        } else{
            this.ws.tell('send', method, args, t)
            this.promises[t] = promise
        }
        console.log('***', JSON.stringify(this.pending))
    }

    notify(msg){
        console.log(msg.ticket, this.pending)
        if(_.includes(['add', 'update', 'delete'], msg.type) && this.pending[0].ticket == msg.ticket){
            this.pending.shift()
        }
        this.promises[msg.ticket] && this.promises[msg.ticket].resolve(msg.data)
        delete this.promises[msg.ticket]
        this.rv.set('rpc', null)
        this.rv.set('rpc', msg.data)
    }
}

export const dispatcher = new DispatcherActor()
