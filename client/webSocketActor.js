import {asMap, observable} from 'mobx'
import _ from 'lodash'
// import {Actor} from './Actor.js'
// import {T} from './Ticket.js'
import Actor from '../lib/Actor.js'
import {encodeDates, decodeDates} from '../lib/encodeDate'

class WebSocketActor extends Actor{

    constructor(){
        super('websocketActor')
        this.on('ready', ()=>this.onInput())
        this.connected = observable(false)
        //this.storage = null
        this.dispatcher = null
        //this.offline = observable(asMap())
        //this.statePredicates = {}
        this.ws = null

        this.connect()
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

    close(){
        console.log('closing...')
        this.ws.close()
        this.connected.set(false)
    }

    _onInput(){
        if(this.connected.get()){
            while(this.input.length > 0){
                let input = this.input[0]
                this.handle(input)
                this.input.shift()
            }
        }
    }

    onMessage(msg){
        //console.log('onmessage', msg)
        let obj = JSON.parse(msg)
        obj.data = decodeDates(obj.data, obj.dates)
        if(_.includes(['add', 'update', 'delete', 'initializing', 'ready'], obj.type)){
            this.store.updateCollection(obj)
        }
        else{
            this.dispatcher.response(obj)
        }
    }

    onOpen(){
        this.connected.set(true)
        this.emit('ready')
    }

    _handle(input){
        //let {method, args} = input
        let method = input[0]
        let args = input[1]
        let ticket = input.splice(-1)[0]
        //let ticket = T.getTicket()

        /*
        if(!this.connected.get()){
            if(method == 'add'){
                let doc = args[0]
                this.offline.set(ticket, doc)
            }else if(method == 'update'){
                let doc = args[0]
                let id = doc.id || ticket
                this.offline.set(id, doc)
            }else if(method == 'delete'){
                let id = args[0] || ticket
                delete this.offline.delete(id)
            }
        }else{
            console.log('ws send', {type: method, args: args, ticket: ticket})
            this.send({type: method, args: args, ticket: ticket})
        }
        */
        this.send({type: method, args: args, ticket: ticket})

    }

    send(type, args, ticket){
        if(this.connected.get()) {
            let {path, obj} = encodeDates(args)
            this.ws.send(JSON.stringify({type, args: obj, ticket, dates: path}))
        }
    }

    _subscribe(predicate, args, ticket){
        this.statePredicates[ticket] = {predicate, args}
        this.send({type: 'subscribe', predicate, args, ticket})
    }

    _unsubscribe(ticket){
        delete this.statePredicates[ticket]
        this.send({type: 'unsubscribe', ticket})
    }

}

export const ws = new WebSocketActor()

