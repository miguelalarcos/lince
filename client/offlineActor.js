import Actor from '../lib/Actor.js'
import {store} from './collectionStoreActor'

class OfflineActor extends Actor{

    constructor(){
        super('Offline2')
        this.ws = null
        this.ticketFilters = {}
        this.filters = {}
        this.collections = {}
    }

    register(name, filter){
        this.filters[name] = filter
    }

    clear(){
        this.collections = {}
    }

    subscribe(ticket, args){
        let predicate = args.shift()
        let collection = store.getCollection(predicate)

        if(!this.collections[collection]){
            this.collections[collection] = {}
        }

        let filter = this.filters[predicate](...args)
        this.ticketFilters[ticket] = filter
        for(let key of Object.keys(this.collections[collection])){
            let doc = this.collections[collection][key]
            if(filter(doc)){
                this.ws.tell('dispatch', {ticket, type: 'add', data: {newVal: doc}, predicate: predicate})
            }
        }
    }

    handle(key, value, collection){
        if(!this.collections[collection]){
            this.collections[collection] = {}
        }
        let oldDoc = this.collections[collection][key] || null
        let newDoc = Object.assign({}, oldDoc, value)
        for(let t of Object.keys(this.ticketFilters)){
            let filter = this.ticketFilters[t]
            let type
            if(!oldDoc || !filter(oldDoc)){
                type = 'add'
            }else if(!filter(newDoc)){
                type = 'delete'
            }else{
                type = 'update'
            }
            this.ws.tell('dispatch', {ticket: parseInt(t), type, data: {newVal: newDoc}, predicate: 'todos'})
        }
        this.collections[collection][key] = newDoc
    }

    send(obj){
        let collection = obj.args[0]
        switch(obj.type){
            case 'subscribe':
                this.subscribe(obj.ticket, obj.args)
                this.ws.tell('dispatch', {type: 'ready', ticket: obj.ticket})
                break
            case 'update':
                let id = obj.args[1]
                let doc = obj.args[2]
                doc.id = id
                this.ws.tell('dispatch', {type: 'rpc', data: 1, ticket: obj.ticket})
                this.handle(id, doc, collection)
                break
            case 'add':
                let ret = {type: obj.type, ticket: obj.ticket, data: obj.args[1]}
                ret.data.id = ':' + obj.ticket
                this.ws.tell('dispatch', {type: 'rpc', data: 1, ticket: ret.ticket})
                this.handle(ret.data.id, ret.data, collection)
                break
        }
    }
}

export const offline = new OfflineActor()