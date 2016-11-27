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

    setupPending(){
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
            this.ws.tell(p.method, p.data, -1)
        }
        this.pending = []
    }

    rpc(promise, method, ...args){
        let t = T.getTicket()
        if(_.includes(['add', 'update', 'delete'], method) && !this.ws.connected.get()){
            console.log('offline')
            let collection = args[0],
                data = args[1]
            this.store.disconnectedNotify(collection, data) // deberia usar tell o ask ???
            if(method == 'add') {
                data.id = ':'+t
                this.pending.push({collection, method, data})
            }else if(method == 'update'){
                let finded = false
                for(let x of this.pending){
                    if(x.method == 'update' && x.data.id == data.id){
                        finded = true
                        x.data = data
                        break
                    }
                }
                if(!finded){
                    this.pending.push({collection, method, data})
                }
            }else{
                this.pending.push({collection, method, data})
            }
        }else if(this.ws.connected.get()) {
            console.log('normal mode')
            this.ws.tell(method, args, t)
            this.promises[t] = promise
        }
    }

    notify(msg){
        msg.ticket != -1 && this.promises[msg.ticket].resolve(msg.data)
        delete this.promises[msg.ticket]
        this.rv.set('rpc', null)
        this.rv.set('rpc', msg.data)
    }
}

export const dispatcher = new DispatcherActor()
