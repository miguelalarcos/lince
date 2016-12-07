import {T} from './Ticket.js'
import Actor from '../lib/Actor.js'
import {observable, asMap} from 'mobx'
import _ from 'lodash'
import {encodeDates, decodeDates} from '../lib/encodeDate'

const localStorageGet = (name) => {
    let doc = JSON.parse(localStorage[name])
    return decodeDates(doc.obj, doc.path)
}

const localStorageSet = (name, value) => {
    let {path, obj} = encodeDates(value)
    localStorage[name] = JSON.stringify({path, obj})
}

const localStoragePush = (name, value) => {
    let arr = localStorageGet(name)
    arr.push(value)
    localStorageSet(name, arr)
}

const localStorageShift = (name) => {
    let arr = localStorageGet(name)
    arr.shift()
    localStorageSet(name, arr)
}

class DispatcherActor extends Actor{
    constructor(){
        super()
        this.results = {}
        this.ws = null
        this.store = null
        this.promises = {}
        this.rv = observable(asMap())
        //this.pending = []
        localStorageSet('pending', [])
    }

    setup(){
        this.ws.connected.observe((ch)=>{
            if(ch){
                this.sendPending()
            }
        })
    }

    sendPending(){
        localStorage['dataBase'] = JSON.stringify({})
        for(let p of localStorageGet('pending')){
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
            data = args[2]
        if(_.includes(['add', 'update', 'delete'], method) && !this.ws.connected.get()){
            this.store.tell('updateLocalDataBase', method, collection, {newVal: data})
            if(method == 'add') {
                data.id = ':' + t
            }
            localStoragePush('pending', {ticket: t, collection, method, data})
        }else if(_.includes(['add', 'update', 'delete'], method) && this.ws.connected.get()) {
            localStoragePush('pending', {ticket: t, collection, method, data})
            this.ws.tell('send', method, args, t)
            this.promises[t] = promise
        } else{
            this.ws.tell('send', method, args, t)
            this.promises[t] = promise
        }
    }

    response(msg){
        if(_.includes(['add', 'update', 'delete'], msg.type) && localStorageGet('pending')[0].ticket == msg.ticket){
            localStorageShift('pending')
            //localStorage.pending.shift()
        }
        this.promises[msg.ticket] && this.promises[msg.ticket].resolve(msg.data)
        delete this.promises[msg.ticket]
        this.rv.set('rpc', null)
        this.rv.set('rpc', msg.data)
    }
}

export const dispatcher = new DispatcherActor()
