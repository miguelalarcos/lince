import {observable, asMap, asReference} from 'mobx'
import {T} from './Ticket.js'
import _ from 'lodash'
import Actor from '../lib/Actor.js'
import {encodeDates, decodeDates} from '../lib/encodeDate'

const localStorageGet = (name) => {
    let doc = JSON.parse(localStorage[name])
    return decodeDates(doc.obj, doc.path)
}

const localStorageSet = (name, value) => {
    let {path, obj} = encodeDates(value)
    localStorage[name] = JSON.stringify({path, obj})
}

class DataBase{
    constructor(){
        //this.collections = {}
        localStorageSet('collections', {})
    }
    collections(){
        return localStorageGet('collections')
    }
    add(collection, key, value){
        let collections = localStorageGet('collections')
        if(collection in collections){
            let collection_ = collections[collection]
            if(key in collection_) {
                let count = collection_[key].__count + 1
                value.__count = count
                collections[collection][key] = value
                localStorageSet('collections', collections)
            }else{
                value.__count = 1
                collections[collection][key] = value
                localStorageSet('collections', collections)
            }
        }
        else{
            value.__count = 1
            collections[collection] = {[key]: value}
            localStorageSet('collections', collections)
        }
    }
    delete(collection, key){
        let collections = localStorageGet('collections')
        let data = collections[collection][key]
        data.__count -= 1
        if(data.__count == 0){
            delete this.collections[collection][key]
            localStorageSet('collections', collections)
        }
    }
    get(collection, key){
        let collections = localStorageGet('collections')
        return collections[collection][key]
    }
}

class collectionStoreActor extends Actor{
    constructor() {
        super()
        this.ws = null
        this.collections = {}
        this.metadata = observable(asMap())
        this.predicates = {}
        this.filters = {}
        this.ticketsCollection = {}
        this.promises = {}
        this.subsId = {}
        this.registered = {}
        this.activeTickets = new Set()
        this.dataBase = new DataBase()
    }

    getTicketForPredicate(predicate, args={}){
        let pred = this.predicates[predicate]
        if(pred){
            for(let p of pred){
                if(_.isEqual(args, p.args)){
                    return p.ticket
                }else{
                    let t = T.getTicket()
                    this.predicates[name].push({ticket: t, args: args})
                    return t
                }
            }
        }
        else{
            let t = T.getTicket()
            this.predicates[predicate] = [{ticket: t, args: args}]
            return t
        }
    }

    updateLocalDataBase(method, collection, data){
        switch(method){
            case 'add':
            case 'update':
                this.dataBase.add(collection, data.newVal.id, data.newVal)
                break
            case 'delete':
                this.dataBase.delete(collection, data.id)
                break
        }
        this.disconnectedNotify(collection, data)
    }

    disconnectedNotify(collection, data){
        let newVal = data.newVal
        let tickets = Object.keys(this.ticketsCollection)
        tickets = _.filter(tickets, (x) => this.ticketsCollection[x] == collection)
        console.log('tickets', tickets)
        for(let ticket of tickets){
            ticket = parseInt(ticket)
            let filter = this.filters[ticket]
            console.log('-->', this.collections, ticket)
            let old = newVal.id && this.collections[ticket].get(newVal.id) || null
            if(filter(newVal)){
                if(old && filter(old)) {
                    this.updateCollection({type: 'update', data, ticket})
                }else{
                    this.updateCollection({type: 'add', data, ticket})
                }
            }else if(old && filter(old)){
                this.updateCollection({type: 'delete', data, ticket})
            }
        }
    }

    subscribe(promise, filter, id, predicate, ...args){
        let ticket = T.getTicket(predicate, args)
        if(this.ws.connected.get()) {
            //let ticket = T.getTicket(predicate, args)
            this.filters[ticket] = filter(...args)
            this.ticketsCollection[ticket] = this.registered[predicate]
            if (!this.collections[ticket]) {
                this.collections[ticket] = observable(asMap([], asReference))
            }
            this.activeTickets.add(ticket)
            //let name = this.registered[predicate]
            let collection = this.collections[ticket]
            promise.resolve({ticket, collection})
            if (this.subsId[id]) {
                delete this.collections[this.subsId[id]]
                this.ws.tell('send', 'unsubscribe', [], this.subsId[id])
                this.activeTickets.delete(this.subsId[id])
                delete this.ticketsCollection[this.subsId[id]]
            }
            this.subsId[id] = ticket
            args.unshift(predicate)
            this.ws.tell('send', 'subscribe', args, ticket)
        }else{
            this.metadata.set(''+ticket, 'ready')
            let collections = Object.keys(this.dataBase.collections())
            for(let collection of collections){
                let keys = Object.keys(this.dataBase.collections()[collection])
                for(let key of keys){
                    let data = this.dataBase.get(collection, key)
                    this.disconnectedNotify(collection, {newVal: data})
                }
            }
        }
    }

    register(predicate, collection){
        this.registered[predicate] = collection
    }

    getCollection(predicate){
        return this.registered[predicate] || predicate
    }

    clear(collection){
        this.collections[collection].clear()
    }

    clearTicket(){
        ticket = 1
    }

    updateCollection(msg){
        let collection = this.registered[msg.predicate]
        if(!_.includes([...this.activeTickets], msg.ticket)){
            return
        }
        switch(msg.type){
            case 'initializing':
                this.metadata.set(''+msg.ticket, 'initializing')
                break
            case 'ready':
                this.metadata.set(''+msg.ticket, 'ready')
                break
            case 'add':
                this.add(msg.data, msg.ticket)
                break
            case 'update':
                this.update(msg.data, msg.ticket)
                break
            case 'delete':
                this.delete(msg.data.id, msg.ticket)
                break
        }
    }

    add(doc, t){
        console.log('final add', doc, t)
        doc = doc.newVal
        let aux = this.collections[t].get(':'+t) || this.collections[t].get(doc.id)
        this.collections[t].set(doc.id, doc)
        this.collections[t].delete(':'+t)
    }

    update(doc, t){
        console.log('final update', t, doc)
        doc = doc.newVal
        this.collections[t].set(doc.id, doc)
    }

    delete(id, t){
        console.log('final delete', id, t)
        let doc = this.collections[t].get(id)
        this.collections[t].delete(id)
    }

}

export const store = new collectionStoreActor()
