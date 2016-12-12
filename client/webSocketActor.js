import {observable} from 'mobx'
import _ from 'lodash'
import Actor from '../lib/Actor.js'
import {encodeDates, decodeDates} from '../lib/encodeDate'
import {status, ready} from './status'
import {localStorageShiftPending, localStoragePushPending, localStorageGetPending} from '../lib/localStorageUtil'

class WebSocketActor extends Actor{

    constructor(){
        super('websocketActor')
        this.on('ready', ()=>this.onInput())
        //this.connected = observable(false)
        //this.ready = observable(false)
        this.dispatcher = null
        this.ws = null
        this.offline = null

        //this.pending = []
        if(!localStorage.pending) {
            localStorage.pending = JSON.stringify([])
        }
        status.observe((ch)=>{
            if(ch.newValue == 'logged'){
                this.sendPending()
            }
        })

        for(p of localStorageGetPending()) {
            this.offline.tell('send', {type: p.type, args: p.args, ticket: p.ticket})
        }

        //this.connect()
    }

    connect(){
        let ws = this.ws = new WebSocket('ws://' + document.location.hostname + ':8000')
        ws.onopen = (evt) => this.onOpen(evt)
        ws.onerror = (evt) => this.onError(evt)
        ws.onmessage = (evt) => this.onMessage(evt.data)
        ws.onclose = (evt) => this.onClose(evt)
    }

    onError(evt){
        console.log(evt)
    }

    onClose(evt){
        console.log(evt)
        //this.connected.set(false)
        //this.ready.set(false)
        status.set('disconnected')
        //setTimeout(()=>this.connect()
        //    ,5000)
    }

    onMessage(msg){
        let obj = JSON.parse(msg)
        obj.data = decodeDates(obj.data, obj.dates)

        this.dispatch(obj)
    }

    dispatch(obj){
        if(_.includes(['add', 'update', 'delete', 'initializing', 'ready'], obj.type)){
            this.store.notify(obj) // tell?
        }
        else{
            localStorageShiftPending()
            //this.pending.shift() // se supone que no es necesario contrastar ticket
            this.dispatcher.response(obj) //tell?
        }
    }

    onOpen(){
        //this.connected.set(true)
        this.offline.clear()
        status.set('connected')
        this.emit('ready')
    }

    sendPending(){
        for(let p of this.pending){
            let {path, args} = encodeDates(p.args)
            this.ws.send(JSON.stringify({type: p.type, args, ticket: p.ticket, dates: path}))
        }
        status.set('ready')
    }

    send(type, args, ticket){
        //this.pending.push({type, args, ticket})
        localStoragePushPending({type, args, ticket})
        if(ready.get()) {
            let {path, obj} = encodeDates(args)
            this.ws.send(JSON.stringify({type, args: obj, ticket, dates: path}))
        }else{
            this.offline.tell('send', {type, args, ticket})
        }
    }
}

export const ws = new WebSocketActor()

