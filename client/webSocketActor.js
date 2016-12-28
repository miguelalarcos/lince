import {observable} from 'mobx'
import _ from 'lodash'
import Actor from '../lib/Actor.js'
import {encodeDates, decodeDates} from '../lib/encodeDate'
import {status, ready} from './status'
import {localStorageShiftAndReplacePending, localStorageGetFirstPending,
        localStoragePushPending, localStorageGetPending} from '../lib/localStorageUtil'
import Q from 'q'

class WebSocketActor extends Actor{

    constructor(){
        super('websocketActor')
        this.on('ready', ()=>this.onInput())
        //this.connected = observable(false)
        //this.ready = observable(false)
        this.dispatcher = null
        this.ws = null
        this.offline = null
        this.promises = {}
        //this.mapTicketId = {}

        //this.pending = []
        //if(!localStorage.pending) {
        //    localStorage.pending = JSON.stringify([])
        //}
        status.observe((ch)=>{
            if(ch.newValue == 'logged'){
                this.sendPending()
            }
        })

        //for(let p of localStorageGetPending()) {
        //    this.offline.tell('send', {type: p.type, args: p.args, ticket: p.ticket})
        //}

        //this.connect()
    }

    start(){
        for(let {type, args, ticket} of localStorageGetPending()) {
            this.offline.tell('send', {type, args, ticket})
        }

        //this.connect()
    }

    connect(){
        let ws = this.ws = new WebSocket('ws://' + document.location.hostname + ':8000')
        ws.onopen = (evt) => this.tell('open') //this.onOpen(evt)
        ws.onerror = (evt) => this.onError(evt)
        ws.onmessage = (evt) => this.tell('message', evt.data)//this.onMessage(evt.data)
        ws.onclose = (evt) => this.onClose(evt)
    }

    onError(evt){
        console.log(evt)
    }

    close(){
        this.ws.close()
    }

    onClose(evt){
        console.log(evt)
        //this.connected.set(false)
        //this.ready.set(false)
        status.set('disconnected')
        //setTimeout(()=>this.connect()
        //    ,5000)
    }

    message(msg){
        let obj = JSON.parse(msg)
        obj.data = decodeDates(obj.data, obj.dates)

        let promise = this.promises[obj.ticket]
        if(promise){
            promise.resolve(obj.data)
            delete this.promises[obj.ticket]
        }
        this.dispatch(obj)
    }


    dispatch(obj){
        if(_.includes(['add', 'update', 'delete', 'initializing', 'ready'], obj.type)){
            this.store.tell('notify', obj) // tell?
        }
        else{
            this.dispatcher.tell('response', obj) //tell?
        }
    }

    open(){
        this.offline.clear()
        status.set('connected')
        this.tell('sendPending')
    }

    sendPending(){
        let p = localStorageGetFirstPending()
        if(p) {
            let {path, obj} = encodeDates(p.args)
            this.ws.send(JSON.stringify({type: p.type, args: obj, ticket: p.ticket, dates: path}))
            let deferred = Q.defer()
            this.promises[p.ticket] = deferred
            deferred.promise.then((id) => {
                localStorageShiftAndReplacePending(p.type, p.ticket, id)
                this.tell('sendPending')
            })
        }else{
            status.set('ready')
            this.emit('ready')
        }
    }

    send(type, args, ticket){
        if(_.includes(['add', 'update', 'delete'], type)) {
            localStoragePushPending({type, args, ticket})
            let deferred = Q.defer()
            this.promises[ticket] = deferred
            deferred.promise.then(() => {
                localStorageShift()
            })
        }
        if(ready.get()) {
            let {path, obj} = encodeDates(args)
            console.log('send', JSON.stringify({type, args: obj, ticket, dates: path}))
            this.ws.send(JSON.stringify({type, args: obj, ticket, dates: path}))
        }else{
            this.offline.tell('send', {type, args, ticket})
        }
    }
}

export const ws = new WebSocketActor()

