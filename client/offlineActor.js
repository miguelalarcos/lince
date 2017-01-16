import Actor from '../lib/Actor.js'
import {store} from './collectionStoreActor'
import {localStorageAddPending, localStorageUpdatePending, localStorageDeletePending} from '../lib/localStorageUtil'
import uuid4 from 'uuid/v4'

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

    unsubscribe(ticket){
        delete this.ticketFilters[ticket]
    }

    subscribe(ticket, args){
        let predicate = args.shift()
        let collection = store.getCollection(predicate)

        if(!this.collections[collection]){
            this.collections[collection] = {}
        }

        let filter = this.filters[predicate](...args)
        this.ticketFilters[ticket] = {predicate, filter}
        for(let key of Object.keys(this.collections[collection])){
            let doc = this.collections[collection][key]
            if(filter(doc)){
                this.ws.tell('dispatch', {ticket, type: 'add', data: {newVal: doc}, predicate: predicate})
            }
        }
    }

    handle(type, doc, collection){
        if(!this.collections[collection]){
            this.collections[collection] = {}
        }
        let oldDoc = this.collections[collection][doc.id] || null
        let newDoc
        if(type == 'add' || type == 'update') {
            newDoc = Object.assign({}, oldDoc, doc)
        }
        else {
            newDoc = null
        }

        for(let t of Object.keys(this.ticketFilters)){
            let {filter, predicate} = this.ticketFilters[t]
            let filter_ = (item) => item && filter(item)
            let type = null
            if(!filter_(oldDoc) && filter_(newDoc)){
                type = 'add'
                this.ws.tell('dispatch', {ticket: parseInt(t), type, data: {newVal: newDoc}, predicate})
            }else if(filter_(oldDoc) && !filter_(newDoc)){
                type = 'delete'
                this.ws.tell('dispatch', {ticket: parseInt(t), type, data: {id: oldDoc.id}, predicate})
            }else if(filter_(oldDoc) && filter_(newDoc)){
                type = 'update'
                this.ws.tell('dispatch', {ticket: parseInt(t), type, data: {newVal: newDoc}, predicate})
            }
        }
        this.collections[collection][doc.id] = newDoc
    }

    send(obj){
        let collection = obj.args[0]
        let id
        switch(obj.type){
            case 'unsubscribe':
                this.unsubscribe(obj.ticket)
                break
            case 'subscribe':
                this.subscribe(obj.ticket, obj.args)
                this.ws.tell('dispatch', {type: 'ready', ticket: obj.ticket})
                break
            case 'delete':
                id = obj.args[1]
                this.ws.tell('dispatch', {type: 'rpc', data: 1, ticket: obj.ticket})
                this.handle('delete', {id}, collection)
                localStorageDeletePending(id)
                break
            case 'update':
                id = obj.args[1]
                let doc = obj.args[2]
                doc.id = id
                this.ws.tell('dispatch', {type: 'rpc', data: 1, ticket: obj.ticket})
                this.handle('update', doc, collection)
                localStorageUpdatePending(id, doc)
                break
            case 'add':
                let ret = {type: obj.type, ticket: obj.ticket, data: obj.args[1]}
                //ret.data.id = ':' + obj.ticket //uuid
                ret.data.id = uuid4()
                this.ws.tell('dispatch', {type: 'rpc', data: 1, ticket: ret.ticket})
                this.handle('add', ret.data, collection)
                localStorageAddPending(collection, ret.data)
                break
        }
    }
}

export const offline = new OfflineActor()