import {observable} from 'mobx'
import _ from 'lodash'
import Actor from '../lib/Actor.js'
import {encodeDates, decodeDates} from '../lib/encodeDate'

class WebSocketActor extends Actor{

    constructor(){
        super('websocketActor')
        this.on('ready', ()=>this.onInput())
        this.connected = observable(false)
        this.dispatcher = null
        this.ws = null
        this.offline = null

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
        this.connected.set(false)
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
            this.dispatcher.response(obj) //tell?
        }
    }

    onOpen(){
        this.connected.set(true)
        this.emit('ready')
    }

    send(type, args, ticket){
        if(this.connected.get()) {
            let {path, obj} = encodeDates(args)
            this.ws.send(JSON.stringify({type, args: obj, ticket, dates: path}))
        }else{
            this.offline.tell('send', {type, args, ticket})
        }
    }
}

export const ws = new WebSocketActor()

